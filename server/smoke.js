// End-to-end API check against a throwaway database. Run: npm run smoke
// Uses MONGO_URI if set (with a separate "-smoke" db), else spins up an in-memory MongoDB.
const assert = require('node:assert');
const { spawn } = require('node:child_process');

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;
const DB = 'balcacorp-ems-smoke';
const today = () => new Date().toLocaleDateString('en-CA');
const day = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.toLocaleDateString('en-CA'); };

const jars = {}; // per-user cookie jar
async function call(user, method, path, body) {
  const headers = { Cookie: jars[user] || '' };
  let payload = body;
  if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const cookies = res.headers.getSetCookie?.() || [];
  if (cookies.length) jars[user] = cookies.map((c) => c.split(';')[0]).join('; ');
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, ct };
}

function runScript(script, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [script], { cwd: __dirname, env: { ...process.env, ...env } });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('exit', (c) => (c === 0 ? resolve(out) : reject(new Error(`${script} failed:\n${out}`))));
  });
}

let passed = 0;
const ok = (msg) => { passed++; console.log('  ✓ ' + msg); };

async function main() {
  let uri = process.env.MONGO_URI;
  let mem = null;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mem = await MongoMemoryServer.create();
    uri = mem.getUri();
    console.log('No MONGO_URI set - using in-memory MongoDB');
  }
  const env = { MONGO_URI: uri, DB_NAME: DB, PORT: String(PORT) };

  console.log('Seeding smoke database...');
  await runScript('seed.js', env);

  const server = spawn(process.execPath, ['index.js'], { cwd: __dirname, env: { ...process.env, ...env } });
  let serverOut = '';
  server.stdout.on('data', (d) => (serverOut += d));
  server.stderr.on('data', (d) => (serverOut += d));
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Server did not start:\n' + serverOut)), 20000);
    const iv = setInterval(() => { if (serverOut.includes('EMS server')) { clearTimeout(t); clearInterval(iv); resolve(); } }, 100);
  });

  try {
    // login
    assert.equal((await call('x', 'POST', '/api/login', { email: 'admin@balcacorp.com', password: 'nope' })).status, 401);
    ok('wrong password rejected');
    assert.equal((await call('anon', 'GET', '/api/tasks')).status, 401);
    ok('unauthenticated request rejected');
    const adminUser = await call('admin', 'POST', '/api/login', { email: 'admin@balcacorp.com', password: 'admin123' });
    assert.equal(adminUser.status, 200);
    assert.equal(adminUser.data.role, 'admin');
    ok('admin login');

    const emps = (await call('admin', 'GET', '/api/employees')).data;
    const yash = emps.find((e) => e.email === 'yash@balcacorp.com');
    const priya = emps.find((e) => e.email === 'priya@balcacorp.com');
    const depts = (await call('admin', 'GET', '/api/departments')).data;
    const dev = depts.find((d) => d.name === 'Development');
    assert.ok(yash && priya && dev && dev.employees >= 3);

    assert.equal((await call('yash', 'POST', '/api/login', { email: 'yash@balcacorp.com', password: 'welcome123' })).status, 200);
    ok('employee login');

    // ownership walls
    assert.equal((await call('yash', 'GET', '/api/employees')).status, 403);
    assert.equal((await call('yash', 'GET', `/api/employees/${priya._id}`)).status, 403);
    assert.equal((await call('yash', 'GET', `/api/employees/${yash._id}`)).status, 200);
    ok('employee can read self but not others (403)');

    // create employee with photo, then log in as them
    const form = new FormData();
    for (const [k, v] of Object.entries({ name: 'Test Person', email: 'test@balcacorp.com', password: 'secret1', department: dev._id, jobTitle: 'Intern' })) form.append(k, v);
    form.append('photo', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')]), 'p.png');
    const created = await call('admin', 'POST', '/api/employees', form);
    assert.equal(created.status, 200);
    assert.match(created.data.empCode, /^BAL-\d{3}$/);
    assert.match(created.data.photo, /^\/api\/files\//);
    assert.equal((await call('yash', 'GET', created.data.photo)).status, 200);
    assert.equal((await call('test', 'POST', '/api/login', { email: 'test@balcacorp.com', password: 'secret1' })).status, 200);
    ok('admin creates employee (with photo) who can log in');
    assert.equal((await call('admin', 'POST', '/api/employees', form)).status, 400);
    ok('duplicate email rejected');

    // attendance mark + correction (upsert) + self-scoping
    assert.equal((await call('admin', 'POST', '/api/attendance', { employee: yash._id, date: today(), status: 'present' })).status, 200);
    const remark = await call('admin', 'POST', '/api/attendance', { employee: yash._id, date: today(), status: 'half_day' });
    assert.equal(remark.data.status, 'half_day');
    ok('attendance marked and corrected (one record per day)');
    const mine = (await call('yash', 'GET', '/api/attendance')).data;
    assert.ok(mine.length > 0 && mine.every((r) => r.employee._id === yash._id));
    ok('employee sees only own attendance history');
    const filtered = (await call('admin', 'GET', `/api/attendance?department=${dev._id}&from=${day(-7)}&to=${today()}`)).data;
    assert.ok(filtered.length > 0 && filtered.every((r) => r.employee.department.name === 'Development'));
    ok('attendance filters by department and date range');

    // Excel export
    const xlsx = await call('admin', 'GET', `/api/attendance/export?department=${dev._id}`);
    assert.equal(xlsx.status, 200);
    assert.ok(xlsx.ct.includes('spreadsheet'));
    assert.equal(xlsx.data.subarray(0, 2).toString(), 'PK'); // xlsx = zip container
    ok('attendance exports to a real .xlsx');

    // leave flow: balance -> apply -> overlap blocked -> approve -> balance drops, attendance auto-marked
    let bal = (await call('yash', 'GET', '/api/leaves/balance')).data;
    assert.deepEqual([bal.quota, bal.used, bal.remaining], [24, 2, 22]); // seed has one approved 2-day leave
    const applied = await call('yash', 'POST', '/api/leaves', { type: 'casual', fromDate: day(10), toDate: day(11), reason: 'Trip' });
    assert.equal(applied.status, 200);
    assert.equal(applied.data.days, 2);
    assert.equal((await call('yash', 'POST', '/api/leaves', { type: 'sick', fromDate: day(11), toDate: day(12) })).status, 400);
    ok('leave applied; overlapping request blocked');
    assert.equal((await call('yash', 'POST', '/api/leaves', { type: 'casual', fromDate: day(20), toDate: day(44) })).status, 400);
    ok('paid leave beyond remaining balance blocked');
    assert.equal((await call('admin', 'PUT', `/api/leaves/${applied.data._id}`, { status: 'approved' })).status, 200);
    bal = (await call('yash', 'GET', '/api/leaves/balance')).data;
    assert.equal(bal.remaining, 20);
    const marked = (await call('admin', 'GET', `/api/attendance?employee=${yash._id}&from=${day(10)}&to=${day(11)}`)).data;
    assert.ok(marked.length === 2 && marked.every((r) => r.status === 'leave'));
    ok('approval deducts balance and auto-marks attendance "On Leave"');

    // task lifecycle
    const task = (await call('admin', 'POST', '/api/tasks', { title: 'Smoke task', assignedTo: yash._id, priority: 'high', deadline: day(2) })).data;
    const doneT = await call('yash', 'PUT', `/api/tasks/${task._id}`, { status: 'completed' });
    assert.equal(doneT.data.completedAt, today());
    assert.equal((await call('priya', 'POST', '/api/login', { email: 'priya@balcacorp.com', password: 'welcome123' })).status, 200);
    assert.equal((await call('priya', 'PUT', `/api/tasks/${task._id}`, { status: 'todo' })).status, 403);
    await call('admin', 'PUT', `/api/tasks/${task._id}`, { feedback: 'Nice work' });
    const yashTasks = (await call('yash', 'GET', '/api/tasks')).data;
    assert.equal(yashTasks.find((t) => t._id === task._id).feedback, 'Nice work');
    ok('task assign -> employee completes -> admin feedback visible; others blocked');

    // announcements
    const ann = (await call('admin', 'POST', '/api/announcements', { title: 'Smoke notice', body: 'Hello', category: 'urgent' })).data;
    assert.ok((await call('yash', 'GET', '/api/announcements')).data.some((a) => a._id === ann._id));
    ok('announcement visible to employees');

    // documents: ownership enforced, bad type rejected
    const df = new FormData();
    df.append('employee', yash._id);
    df.append('type', 'salary_slip');
    df.append('title', 'July salary slip');
    df.append('file', new Blob([Buffer.from('%PDF-1.4 smoke')]), 'slip.pdf');
    const doc = await call('admin', 'POST', '/api/documents', df);
    assert.equal(doc.status, 200);
    assert.equal((await call('yash', 'GET', `/api/documents/${doc.data._id}/file`)).status, 200);
    assert.equal((await call('priya', 'GET', `/api/documents/${doc.data._id}/file`)).status, 403);
    ok('employee downloads own document; another employee gets 403');
    const bad = new FormData();
    bad.append('employee', yash._id);
    bad.append('file', new Blob([Buffer.from('MZ')]), 'virus.exe');
    assert.equal((await call('admin', 'POST', '/api/documents', bad)).status, 400);
    ok('non-PDF/JPG/PNG upload rejected');

    // ratings upsert + performance numbers
    const month = today().slice(0, 7);
    await call('admin', 'PUT', '/api/ratings', { employee: yash._id, month, rating: 3, feedback: 'ok' });
    await call('admin', 'PUT', '/api/ratings', { employee: yash._id, month, rating: 5, feedback: 'great' });
    const ratings = (await call('yash', 'GET', '/api/ratings')).data.filter((r) => r.month === month);
    assert.equal(ratings.length, 1);
    assert.equal(ratings[0].rating, 5);
    const perf = (await call('yash', 'GET', '/api/performance')).data;
    assert.ok(perf.completed >= 1 && perf.attendancePct >= 0 && perf.rating.rating === 5);
    ok('monthly rating upserts (no duplicates); performance stats computed');

    // reports
    const sum = (await call('admin', 'GET', '/api/reports/summary')).data;
    assert.equal(sum.totalEmployees, 11); // 10 seeded + 1 created
    assert.equal(sum.pendingLeaves, 2); // seeded 2 pending; ours was approved
    assert.ok(sum.presentToday >= 1 && sum.completedThisMonth >= 1);
    assert.equal((await call('yash', 'GET', '/api/reports/summary')).status, 403);
    const graph = (await call('admin', 'GET', '/api/reports/attendance-graph')).data;
    assert.equal(graph.graph.length, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate());
    ok('report cards + monthly graph correct and admin-only');

    // password change + self profile edit
    assert.equal((await call('yash', 'POST', '/api/me/password', { current: 'wrong', next: 'whatever1' })).status, 400);
    const prof = await call('yash', 'PUT', '/api/me', (() => { const f = new FormData(); f.append('phone', '9000000000'); return f; })());
    assert.equal(prof.data.phone, '9000000000');
    ok('self profile edit works; wrong current password rejected');

    // deactivation blocks login
    await call('admin', 'PUT', `/api/employees/${created.data._id}`, { status: 'inactive' });
    assert.equal((await call('test2', 'POST', '/api/login', { email: 'test@balcacorp.com', password: 'secret1' })).status, 403);
    ok('deactivated employee cannot log in');

    console.log(`\nSMOKE PASSED - ${passed} checks green`);
  } finally {
    server.kill();
    if (mem) await mem.stop();
  }
}

main().catch((e) => { console.error('\nSMOKE FAILED:', e.message); process.exit(1); });
