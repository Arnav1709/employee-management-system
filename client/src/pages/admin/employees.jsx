import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, get } from '../../api';
import { Avatar, Badge, Field, Empty, fmt } from '../../ui';

export function EmployeeForm({ initial, onSaved, onCancel }) {
  const editing = !!initial?._id;
  const [f, setF] = useState({
    name: '', email: '', password: '', role: 'employee', jobTitle: '', phone: '',
    joiningDate: '', leaveQuota: 24, ...initial,
    department: initial?.department?._id || initial?.department || '',
  });
  const [depts, setDepts] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { get('/departments').then(setDepts).catch(() => {}); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const fd = new FormData();
    for (const k of ['name', 'email', 'password', 'role', 'department', 'jobTitle', 'phone', 'joiningDate', 'leaveQuota']) fd.append(k, f[k] ?? '');
    if (photo) fd.append('photo', photo);
    try { onSaved(await api(editing ? `/employees/${initial._id}` : '/employees', { method: editing ? 'PUT' : 'POST', body: fd })); }
    catch (ex) { setErr(ex.message); }
  };

  return (
    <form className="card" onSubmit={submit}>
      <h2>{editing ? 'Edit employee' : 'Add employee'}</h2>
      <div className="frow">
        <Field label="Full name"><input value={f.name} onChange={set('name')} required /></Field>
        <Field label="Email"><input type="email" value={f.email} onChange={set('email')} required /></Field>
        <Field label={editing ? 'New password (leave blank to keep)' : 'Password'}>
          <input type="password" value={f.password || ''} onChange={set('password')} required={!editing} minLength={6} />
        </Field>
      </div>
      <div className="frow mt">
        <Field label="Department">
          <select value={f.department} onChange={set('department')}>
            <option value="">— None —</option>
            {depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Job role"><input value={f.jobTitle} onChange={set('jobTitle')} /></Field>
        <Field label="Phone"><input value={f.phone} onChange={set('phone')} /></Field>
      </div>
      <div className="frow mt">
        <Field label="Joining date"><input type="date" value={f.joiningDate} onChange={set('joiningDate')} /></Field>
        <Field label="Leave quota (days/year)"><input type="number" min="0" value={f.leaveQuota} onChange={set('leaveQuota')} /></Field>
        <Field label="Login role">
          <select value={f.role} onChange={set('role')}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label="Profile photo (JPG/PNG)"><input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setPhoto(e.target.files[0])} /></Field>
      </div>
      <div className="actions">
        <button className="btn">{editing ? 'Save changes' : 'Add employee'}</button>
        {onCancel && <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>}
        {err && <span className="error">{err}</span>}
      </div>
    </form>
  );
}

export default function Employees() {
  const [list, setList] = useState(null);
  const [depts, setDepts] = useState([]);
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('active');
  const [adding, setAdding] = useState(false);
  const nav = useNavigate();

  const load = () => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (dept) p.set('department', dept);
    if (status) p.set('status', status);
    get('/employees?' + p).then(setList).catch(() => {});
  };
  useEffect(() => { load(); }, [q, dept, status]);
  useEffect(() => { get('/departments').then(setDepts).catch(() => {}); }, []);

  return (
    <>
      <div className="spread">
        <h1>Employees</h1>
        {!adding && <button className="btn" onClick={() => setAdding(true)}>+ Add employee</button>}
      </div>
      {adding && <div className="mt"><EmployeeForm onSaved={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} /></div>}
      <div className="card mt">
        <div className="frow">
          <Field label="Search"><input placeholder="Name…" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
          <Field label="Department">
            <select value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">All</option>
              {depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
        <div className="mt">
          {list?.length === 0 && <Empty>No employees match.</Empty>}
          {list?.length > 0 && (
            <table>
              <thead><tr><th></th><th>ID</th><th>Name</th><th>Department</th><th>Role</th><th>Joined</th><th>Status</th></tr></thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e._id} className="click" onClick={() => nav('/employees/' + e._id)}>
                    <td><Avatar emp={e} /></td>
                    <td>{e.empCode}</td>
                    <td><strong>{e.name}</strong>{e.role === 'admin' && ' 🛡️'}</td>
                    <td>{e.department?.name || '—'}</td>
                    <td>{e.jobTitle || '—'}</td>
                    <td>{fmt(e.joiningDate)}</td>
                    <td><Badge v={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
