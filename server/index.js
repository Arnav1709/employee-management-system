const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { Department, Employee, Attendance, Task, Leave, Announcement, Doc, Rating, File, connect, localDate } = require('./models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'balcacorp-ems';

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'balcacorp-ems',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI, dbName: DB_NAME }),
  cookie: { httpOnly: true, sameSite: 'lax' },
}));

// Serverless hosts cold-start with no DB connection — connect lazily, once.
let dbReady = null;
app.use('/api', (req, res, next) => {
  (dbReady ||= connect()).then(() => next(), (e) => { dbReady = null; next(e); });
});

// --- uploads (stored in MongoDB — serverless hosts have no persistent disk) ---
const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.pdf']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED.has(path.extname(file.originalname).toLowerCase())),
});

async function savePhoto(file, oldUrl) {
  if (oldUrl?.startsWith('/api/files/')) await File.deleteOne({ _id: oldUrl.split('/').pop() }).catch(() => {});
  const f = await File.create({ data: file.buffer, type: file.mimetype, name: file.originalname, kind: 'photo' });
  return '/api/files/' + f._id;
}

// --- helpers ---
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const auth = (req, res, next) => (req.session.user ? next() : res.status(401).json({ error: 'Login required' }));
const admin = (req, res, next) => (req.session.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Admins only' }));
const me = (req) => req.session.user; // { id, role }
const isSelf = (req, id) => String(me(req).id) === String(id);
const STATUS_LABEL = { present: 'Present', absent: 'Absent', half_day: 'Half-day', leave: 'On Leave' };

const publicEmp = (e) => {
  const o = e.toObject ? e.toObject() : { ...e };
  delete o.passwordHash;
  return o;
};

// Photos need a login but not ownership — they appear in admin lists and the employee's own header.
// Documents are never served here (kind check): they go through /api/documents/:id/file with an ownership check.
app.get('/api/files/:id', auth, h(async (req, res) => {
  const f = await File.findById(req.params.id);
  if (!f || f.kind !== 'photo') return res.status(404).json({ error: 'Not found' });
  res.set('Content-Type', f.type).set('Cache-Control', 'private, max-age=3600').send(f.data);
}));

// --- auth ---
app.post('/api/login', h(async (req, res) => {
  const { email, password } = req.body || {};
  const u = await Employee.findOne({ email: String(email || '').toLowerCase().trim() });
  if (!u || !bcrypt.compareSync(String(password || ''), u.passwordHash)) return res.status(401).json({ error: 'Wrong email or password' });
  if (u.status !== 'active') return res.status(403).json({ error: 'This account is deactivated. Contact the admin.' });
  req.session.user = { id: String(u._id), role: u.role };
  res.json(publicEmp(await u.populate('department', 'name')));
}));

app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/me', auth, h(async (req, res) => {
  const u = await Employee.findById(me(req).id).populate('department', 'name');
  if (!u || u.status !== 'active') return req.session.destroy(() => res.status(401).json({ error: 'Login required' }));
  res.json(publicEmp(u));
}));

app.put('/api/me', auth, upload.single('photo'), h(async (req, res) => {
  const u = await Employee.findById(me(req).id);
  if (req.body.phone !== undefined) u.phone = req.body.phone;
  if (req.file) u.photo = await savePhoto(req.file, u.photo);
  await u.save();
  res.json(publicEmp(await u.populate('department', 'name')));
}));

app.post('/api/me/password', auth, h(async (req, res) => {
  const { current, next } = req.body || {};
  const u = await Employee.findById(me(req).id);
  if (!bcrypt.compareSync(String(current || ''), u.passwordHash)) return res.status(400).json({ error: 'Current password is wrong' });
  if (!next || next.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  u.passwordHash = bcrypt.hashSync(next, 10);
  await u.save();
  res.json({ ok: true });
}));

// --- employees (admin, except self-read) ---
app.get('/api/employees', admin, h(async (req, res) => {
  const f = {};
  if (req.query.department) f.department = req.query.department;
  if (req.query.status) f.status = req.query.status;
  if (req.query.q) f.name = { $regex: req.query.q, $options: 'i' };
  const list = await Employee.find(f).select('-passwordHash').populate('department', 'name').sort('name');
  res.json(list);
}));

const EMP_FIELDS = ['name', 'email', 'role', 'jobTitle', 'phone', 'joiningDate', 'leaveQuota', 'status'];
app.post('/api/employees', admin, upload.single('photo'), h(async (req, res) => {
  if (!req.body.password || req.body.password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const data = { passwordHash: bcrypt.hashSync(req.body.password, 10) };
  for (const k of EMP_FIELDS) if (req.body[k] !== undefined && req.body[k] !== '') data[k] = req.body[k];
  data.department = req.body.department || null;
  if (req.file) data.photo = await savePhoto(req.file);
  data.empCode = `BAL-${String(await Employee.countDocuments() + 1).padStart(3, '0')}`;
  const e = await Employee.create(data);
  res.json(publicEmp(await e.populate('department', 'name')));
}));

app.get('/api/employees/:id', auth, h(async (req, res) => {
  if (me(req).role !== 'admin' && !isSelf(req, req.params.id)) return res.status(403).json({ error: 'Not allowed' });
  const e = await Employee.findById(req.params.id).select('-passwordHash').populate('department', 'name');
  if (!e) return res.status(404).json({ error: 'Employee not found' });
  res.json(e);
}));

app.put('/api/employees/:id', admin, upload.single('photo'), h(async (req, res) => {
  const e = await Employee.findById(req.params.id);
  if (!e) return res.status(404).json({ error: 'Employee not found' });
  for (const k of EMP_FIELDS) if (req.body[k] !== undefined && req.body[k] !== '') e[k] = req.body[k];
  if (req.body.department !== undefined) e.department = req.body.department || null;
  if (req.body.password) e.passwordHash = bcrypt.hashSync(req.body.password, 10);
  if (req.file) e.photo = await savePhoto(req.file, e.photo);
  await e.save();
  res.json(publicEmp(await e.populate('department', 'name')));
}));

// --- departments (admin) ---
app.get('/api/departments', admin, h(async (req, res) => {
  const depts = await Department.find().populate('manager', 'name').sort('name');
  const counts = await Employee.aggregate([{ $match: { department: { $ne: null } } }, { $group: { _id: '$department', n: { $sum: 1 } } }]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json(depts.map((d) => ({ ...d.toObject(), employees: byId[String(d._id)] || 0 })));
}));
app.post('/api/departments', admin, h(async (req, res) => res.json(await Department.create({ name: req.body.name }))));
app.put('/api/departments/:id', admin, h(async (req, res) => {
  const d = await Department.findById(req.params.id);
  if (!d) return res.status(404).json({ error: 'Department not found' });
  if (req.body.name) d.name = req.body.name;
  if (req.body.manager !== undefined) d.manager = req.body.manager || null;
  await d.save();
  res.json(d);
}));
app.delete('/api/departments/:id', admin, h(async (req, res) => {
  if (await Employee.exists({ department: req.params.id })) return res.status(400).json({ error: 'Reassign its employees before deleting this department' });
  await Department.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
}));

// --- attendance ---
async function attendanceRows(query, user) {
  const f = {};
  if (user.role !== 'admin') f.employee = user.id;
  else if (query.employee) f.employee = query.employee;
  if (query.from || query.to) f.date = { ...(query.from && { $gte: query.from }), ...(query.to && { $lte: query.to }) };
  if (user.role === 'admin' && query.department && !f.employee) f.employee = { $in: await Employee.find({ department: query.department }).distinct('_id') };
  return Attendance.find(f)
    .populate({ path: 'employee', select: 'name empCode department', populate: { path: 'department', select: 'name' } })
    .sort({ date: -1 });
}

app.get('/api/attendance', auth, h(async (req, res) => res.json(await attendanceRows(req.query, me(req)))));

app.get('/api/attendance/day', admin, h(async (req, res) => {
  const date = req.query.date || localDate();
  const emps = await Employee.find({ status: 'active', role: 'employee' }).select('name empCode department photo').populate('department', 'name').sort('name');
  const marks = await Attendance.find({ date });
  const by = Object.fromEntries(marks.map((m) => [String(m.employee), m.status]));
  res.json({ date, employees: emps.map((e) => ({ ...e.toObject(), status: by[String(e._id)] || null })) });
}));

app.post('/api/attendance', admin, h(async (req, res) => {
  const { employee, date, status } = req.body || {};
  if (!STATUS_LABEL[status]) return res.status(400).json({ error: 'Invalid status' });
  if (!employee || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return res.status(400).json({ error: 'Employee and date are required' });
  const rec = await Attendance.findOneAndUpdate({ employee, date }, { status }, { upsert: true, new: true });
  res.json(rec);
}));

app.get('/api/attendance/export', admin, h(async (req, res) => {
  const rows = await attendanceRows(req.query, me(req));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Attendance');
  ws.columns = [
    { header: 'Employee ID', key: 'code', width: 14 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Department', key: 'dept', width: 18 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of rows) ws.addRow({ code: r.employee?.empCode, name: r.employee?.name, dept: r.employee?.department?.name || '—', date: r.date, status: STATUS_LABEL[r.status] });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance.xlsx"');
  await wb.xlsx.write(res);
  res.end();
}));

// --- leaves ---
async function leaveBalance(empId) {
  const year = localDate().slice(0, 4);
  const emp = await Employee.findById(empId);
  const approved = await Leave.find({ employee: empId, status: 'approved', type: { $ne: 'unpaid' }, fromDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } });
  const used = approved.reduce((s, l) => s + l.days, 0);
  return { quota: emp.leaveQuota, used, remaining: emp.leaveQuota - used };
}

app.get('/api/leaves/balance', auth, h(async (req, res) => {
  const empId = me(req).role === 'admin' && req.query.employee ? req.query.employee : me(req).id;
  res.json(await leaveBalance(empId));
}));

app.get('/api/leaves', auth, h(async (req, res) => {
  const f = me(req).role === 'admin' ? {} : { employee: me(req).id };
  if (me(req).role === 'admin' && req.query.status) f.status = req.query.status;
  res.json(await Leave.find(f).populate('employee', 'name empCode').sort({ createdAt: -1 }));
}));

app.post('/api/leaves', auth, h(async (req, res) => {
  const { type, fromDate, toDate, reason } = req.body || {};
  if (!['casual', 'sick', 'unpaid'].includes(type)) return res.status(400).json({ error: 'Invalid leave type' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(toDate || '')) return res.status(400).json({ error: 'Both dates are required' });
  const days = Math.round((Date.parse(toDate) - Date.parse(fromDate)) / 86400000) + 1;
  if (days < 1) return res.status(400).json({ error: '"To" date must not be before "From" date' });
  const empId = me(req).id;
  const overlap = await Leave.exists({ employee: empId, status: { $in: ['pending', 'approved'] }, fromDate: { $lte: toDate }, toDate: { $gte: fromDate } });
  if (overlap) return res.status(400).json({ error: 'These dates overlap an existing leave request' });
  if (type !== 'unpaid') {
    const { remaining } = await leaveBalance(empId);
    if (days > remaining) return res.status(400).json({ error: `Only ${remaining} paid leave day(s) left — apply as unpaid instead` });
  }
  res.json(await Leave.create({ employee: empId, type, fromDate, toDate, days, reason: reason || '' }));
}));

app.put('/api/leaves/:id', admin, h(async (req, res) => {
  const { status, adminNote } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status must be approved or rejected' });
  const l = await Leave.findById(req.params.id);
  if (!l) return res.status(404).json({ error: 'Leave request not found' });
  if (l.status !== 'pending') return res.status(400).json({ error: 'This request was already decided' });
  l.status = status;
  l.adminNote = adminNote || '';
  await l.save();
  if (status === 'approved') {
    const ops = [];
    for (let t = Date.parse(l.fromDate); t <= Date.parse(l.toDate); t += 86400000) {
      const date = new Date(t).toISOString().slice(0, 10);
      ops.push({ updateOne: { filter: { employee: l.employee, date }, update: { status: 'leave' }, upsert: true } });
    }
    await Attendance.bulkWrite(ops);
  }
  res.json(l);
}));

// --- tasks ---
app.get('/api/tasks', auth, h(async (req, res) => {
  const f = me(req).role === 'admin' ? {} : { assignedTo: me(req).id };
  if (me(req).role === 'admin' && req.query.employee) f.assignedTo = req.query.employee;
  if (req.query.status) f.status = req.query.status;
  res.json(await Task.find(f).populate('assignedTo', 'name empCode').sort({ status: 1, deadline: 1 }));
}));

app.post('/api/tasks', admin, h(async (req, res) => {
  const { title, description, priority, deadline, assignedTo } = req.body || {};
  if (!title || !assignedTo) return res.status(400).json({ error: 'Title and employee are required' });
  const t = await Task.create({ title, description, priority, deadline: deadline || null, assignedTo });
  res.json(await t.populate('assignedTo', 'name empCode'));
}));

app.put('/api/tasks/:id', auth, h(async (req, res) => {
  const t = await Task.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  if (me(req).role === 'admin') {
    for (const k of ['title', 'description', 'priority', 'deadline', 'assignedTo', 'status', 'feedback']) {
      if (req.body[k] !== undefined) t[k] = req.body[k];
    }
  } else {
    if (String(t.assignedTo) !== me(req).id) return res.status(403).json({ error: 'Not your task' });
    if (!['todo', 'in_progress', 'completed'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
    t.status = req.body.status; // employees change status only
  }
  t.completedAt = t.status === 'completed' ? (t.completedAt || localDate()) : null;
  await t.save();
  res.json(await t.populate('assignedTo', 'name empCode'));
}));

// --- announcements ---
app.get('/api/announcements', auth, h(async (req, res) => res.json(await Announcement.find().sort({ createdAt: -1 }))));
app.post('/api/announcements', admin, h(async (req, res) => res.json(await Announcement.create(req.body))));
app.put('/api/announcements/:id', admin, h(async (req, res) => {
  const a = await Announcement.findByIdAndUpdate(req.params.id, { title: req.body.title, body: req.body.body, category: req.body.category }, { new: true, runValidators: true });
  if (!a) return res.status(404).json({ error: 'Announcement not found' });
  res.json(a);
}));
app.delete('/api/announcements/:id', admin, h(async (req, res) => { await Announcement.deleteOne({ _id: req.params.id }); res.json({ ok: true }); }));

// --- documents ---
app.get('/api/documents', auth, h(async (req, res) => {
  const empId = me(req).role === 'admin' ? req.query.employee : me(req).id;
  const f = empId ? { employee: empId } : {};
  res.json(await Doc.find(f).populate('employee', 'name empCode').sort({ createdAt: -1 }));
}));

app.post('/api/documents', admin, upload.single('file'), h(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Attach a JPG, PNG or PDF up to 5 MB' });
  if (!req.body.employee) return res.status(400).json({ error: 'Employee is required' });
  const f = await File.create({ data: req.file.buffer, type: req.file.mimetype, name: req.file.originalname, kind: 'doc' });
  const d = await Doc.create({ employee: req.body.employee, type: req.body.type || 'other', title: req.body.title || req.file.originalname, file: String(f._id) });
  res.json(await d.populate('employee', 'name empCode'));
}));

app.get('/api/documents/:id/file', auth, h(async (req, res) => {
  const d = await Doc.findById(req.params.id);
  if (!d) return res.status(404).json({ error: 'Document not found' });
  if (me(req).role !== 'admin' && String(d.employee) !== me(req).id) return res.status(403).json({ error: 'Not your document' });
  const f = await File.findById(d.file);
  if (!f) return res.status(404).json({ error: 'File is missing' });
  res.set('Content-Type', f.type)
    .set('Content-Disposition', `attachment; filename="${d.title.replace(/"/g, '')}${path.extname(f.name)}"`)
    .send(f.data);
}));

app.delete('/api/documents/:id', admin, h(async (req, res) => {
  const d = await Doc.findByIdAndDelete(req.params.id);
  if (d) await File.deleteOne({ _id: d.file }).catch(() => {});
  res.json({ ok: true });
}));

// --- performance & ratings ---
app.get('/api/performance', auth, h(async (req, res) => {
  const empId = me(req).role === 'admin' && req.query.employee ? req.query.employee : me(req).id;
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : localDate().slice(0, 7);
  const range = { $gte: `${month}-01`, $lte: `${month}-31` }; // string compare covers every real day of the month
  const done = await Task.find({ assignedTo: empId, status: 'completed', completedAt: range });
  const delayed = done.filter((t) => t.deadline && t.completedAt > t.deadline).length;
  const att = await Attendance.find({ employee: empId, date: range });
  const c = { present: 0, absent: 0, half_day: 0, leave: 0 };
  for (const a of att) c[a.status]++;
  const denom = c.present + c.half_day + c.absent;
  const attendancePct = denom ? Math.round(((c.present + 0.5 * c.half_day) / denom) * 100) : null;
  const rating = await Rating.findOne({ employee: empId, month });
  res.json({ month, completed: done.length, delayed, attendance: c, attendancePct, rating });
}));

app.get('/api/ratings', auth, h(async (req, res) => {
  const empId = me(req).role === 'admin' && req.query.employee ? req.query.employee : me(req).id;
  res.json(await Rating.find({ employee: empId }).sort({ month: -1 }));
}));

app.put('/api/ratings', admin, h(async (req, res) => {
  const { employee, month, rating, feedback } = req.body || {};
  if (!employee || !/^\d{4}-\d{2}$/.test(month || '')) return res.status(400).json({ error: 'Employee and month are required' });
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Rating must be 1 to 5' });
  res.json(await Rating.findOneAndUpdate({ employee, month }, { rating, feedback: feedback || '' }, { upsert: true, new: true }));
}));

// --- reports (admin) ---
app.get('/api/reports/summary', admin, h(async (req, res) => {
  const month = localDate().slice(0, 7);
  const [totalEmployees, presentToday, pendingLeaves, completedThisMonth, overdueTasks] = await Promise.all([
    Employee.countDocuments({ status: 'active', role: 'employee' }),
    Attendance.countDocuments({ date: localDate(), status: { $in: ['present', 'half_day'] } }),
    Leave.countDocuments({ status: 'pending' }),
    Task.countDocuments({ status: 'completed', completedAt: { $gte: `${month}-01` } }),
    Task.countDocuments({ status: { $ne: 'completed' }, deadline: { $lt: localDate() } }), // null deadlines never match a string $lt
  ]);
  res.json({ totalEmployees, presentToday, pendingLeaves, completedThisMonth, overdueTasks });
}));

app.get('/api/reports/attendance-graph', admin, h(async (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : localDate().slice(0, 7);
  const rows = await Attendance.find({ date: { $gte: `${month}-01`, $lte: `${month}-31` }, status: { $in: ['present', 'half_day'] } });
  const byDate = {};
  for (const r of rows) byDate[r.date] = (byDate[r.date] || 0) + 1;
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const graph = Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    return { date, present: byDate[date] || 0 };
  });
  res.json({ month, graph });
}));

// --- client build + errors ---
const dist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(dist));
app.get(/^(?!\/api|\/uploads).*/, (req, res, next) => {
  const html = path.join(dist, 'index.html');
  fs.existsSync(html) ? res.sendFile(html) : next();
});

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Max file size is 5 MB' });
  if (err.code === 11000) return res.status(400).json({ error: `Already exists: ${Object.keys(err.keyValue || {}).join(', ')}` });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

module.exports = { app };

if (require.main === module) {
  (dbReady ||= connect())
    .then(() => {
      const port = process.env.PORT || 3001;
      app.listen(port, () => console.log(`EMS server on http://localhost:${port} (db: ${DB_NAME})`));
    })
    .catch((e) => {
      console.error('Could not connect to MongoDB:', e.message);
      console.error('Set MONGO_URI in server/.env and try again.');
      process.exit(1);
    });
}
