// Wipes the database and loads demo data. Run: npm run seed
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { Department, Employee, Attendance, Task, Leave, Announcement, Doc, Rating, connect, localDate } = require('./models');

const day = (offset) => { // YYYY-MM-DD for today + offset days
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-CA');
};

async function seed() {
  const dbName = await connect();
  await Promise.all([Department, Employee, Attendance, Task, Leave, Announcement, Doc, Rating].map(m => m.deleteMany({})));

  const hash = (p) => bcrypt.hashSync(p, 10);
  const admin = await Employee.create({
    empCode: 'BAL-001', name: 'Admin', email: 'admin@balcacorp.com', passwordHash: hash('admin123'),
    role: 'admin', jobTitle: 'HR Manager', joiningDate: '2022-01-10',
  });

  const depts = {};
  for (const name of ['Development', 'HR', 'Sales', 'Marketing']) depts[name] = await Department.create({ name });

  const people = [
    ['Yash Agarwal', 'Development', 'Full Stack Developer'],
    ['Priya Sharma', 'Development', 'Frontend Developer'],
    ['Rohan Mehta', 'Development', 'Backend Developer'],
    ['Sneha Patil', 'HR', 'HR Executive'],
    ['Arjun Verma', 'Sales', 'Sales Executive'],
    ['Kavya Nair', 'Sales', 'Account Manager'],
    ['Aditya Singh', 'Marketing', 'Marketing Analyst'],
    ['Ishita Rao', 'Marketing', 'Content Specialist'],
    ['Vikram Joshi', 'Development', 'QA Engineer'],
    ['Neha Gupta', 'HR', 'Recruiter'],
  ];
  const emps = [];
  for (let i = 0; i < people.length; i++) {
    const [name, dept, title] = people[i];
    emps.push(await Employee.create({
      empCode: `BAL-${String(i + 2).padStart(3, '0')}`,
      name, email: name.split(' ')[0].toLowerCase() + '@balcacorp.com',
      passwordHash: hash('welcome123'), department: depts[dept]._id, jobTitle: title,
      joiningDate: day(-200 - i * 30), phone: '98' + String(10000000 + i * 1234567).slice(0, 8),
    }));
  }
  depts.Development.manager = emps[0]._id; await depts.Development.save();
  depts.HR.manager = emps[3]._id; await depts.HR.save();
  depts.Sales.manager = emps[4]._id; await depts.Sales.save();
  depts.Marketing.manager = emps[6]._id; await depts.Marketing.save();

  // Attendance: last 28 days, Sundays skipped, mostly present
  const statuses = ['present', 'present', 'present', 'present', 'present', 'present', 'half_day', 'absent'];
  const att = [];
  for (let off = -28; off <= 0; off++) {
    const date = day(off);
    if (new Date(date + 'T12:00').getDay() === 0) continue; // Sunday
    for (const e of emps) att.push({ employee: e._id, date, status: statuses[Math.floor(Math.random() * statuses.length)] });
  }
  await Attendance.insertMany(att);

  await Task.insertMany([
    { title: 'Build login page', assignedTo: emps[1]._id, priority: 'high', deadline: day(-5), status: 'completed', completedAt: day(-6), description: 'Login UI per design system.' },
    { title: 'Fix export bug', assignedTo: emps[2]._id, priority: 'high', deadline: day(-3), status: 'completed', completedAt: day(-1), feedback: 'Done, but landed late — plan buffers next time.', description: 'Excel export returns 500 for empty ranges.' },
    { title: 'Prepare monthly sales report', assignedTo: emps[4]._id, priority: 'medium', deadline: day(-2), status: 'in_progress', description: 'Summarize July pipeline.' },
    { title: 'Draft careers page copy', assignedTo: emps[7]._id, priority: 'low', deadline: day(7), status: 'todo', description: 'Two variants for review.' },
    { title: 'Regression test payroll upload', assignedTo: emps[8]._id, priority: 'medium', deadline: day(3), status: 'in_progress', description: 'Cover PDF and image formats.' },
    { title: 'Screen backend candidates', assignedTo: emps[9]._id, priority: 'medium', deadline: day(5), status: 'todo', description: '10 profiles shortlisted.' },
  ]);

  await Leave.insertMany([
    { employee: emps[0]._id, type: 'casual', fromDate: day(-10), toDate: day(-9), days: 2, reason: 'Family function', status: 'approved' },
    { employee: emps[5]._id, type: 'sick', fromDate: day(1), toDate: day(2), days: 2, reason: 'Fever', status: 'pending' },
    { employee: emps[7]._id, type: 'casual', fromDate: day(4), toDate: day(4), days: 1, reason: 'Personal work', status: 'pending' },
  ]);

  await Announcement.insertMany([
    { title: 'Independence Day holiday', body: 'The office will remain closed on 15 August.', category: 'holiday' },
    { title: 'Quarterly town hall', body: 'All-hands meeting this Friday at 4 PM in the main hall. Attendance is expected.', category: 'general' },
    { title: 'New attendance policy', body: 'Attendance is now tracked in the EMS. Contact HR for corrections.', category: 'urgent' },
  ]);

  const lastMonth = day(-30).slice(0, 7);
  await Rating.insertMany([
    { employee: emps[0]._id, month: lastMonth, rating: 5, feedback: 'Excellent delivery and ownership.' },
    { employee: emps[4]._id, month: lastMonth, rating: 3, feedback: 'Good effort; follow-ups need to be faster.' },
  ]);

  console.log(`Seeded database "${dbName}":
  admin login    -> admin@balcacorp.com / admin123
  employee login -> yash@balcacorp.com / welcome123 (all employees use welcome123)
  ${emps.length} employees, 4 departments, ${att.length} attendance records, 6 tasks, 3 leaves, 3 announcements`);
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e.message); process.exit(1); });
