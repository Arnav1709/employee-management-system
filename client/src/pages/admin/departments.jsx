import { useEffect, useState } from 'react';
import { get, post, put, del } from '../../api';
import { Field, Empty } from '../../ui';

export default function Departments() {
  const [depts, setDepts] = useState(null);
  const [emps, setEmps] = useState([]);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const load = () => get('/departments').then(setDepts).catch(() => {});
  useEffect(() => { load(); get('/employees?status=active').then(setEmps).catch(() => {}); }, []);

  const add = async (e) => {
    e.preventDefault();
    setErr('');
    try { await post('/departments', { name }); setName(''); load(); }
    catch (ex) { setErr(ex.message); }
  };

  const setManager = async (d, manager) => { await put('/departments/' + d._id, { manager }); load(); };
  const rename = async (d) => {
    const next = prompt('New department name:', d.name);
    if (next && next !== d.name) { await put('/departments/' + d._id, { name: next }); load(); }
  };
  const remove = async (d) => {
    setErr('');
    if (!confirm(`Delete ${d.name}?`)) return;
    try { await del('/departments/' + d._id); load(); }
    catch (ex) { setErr(ex.message); }
  };

  return (
    <>
      <h1>Departments</h1>
      <form className="card mt" onSubmit={add}>
        <div className="frow">
          <Field label="New department"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support" required /></Field>
          <button className="btn" style={{ height: 40 }}>Add</button>
        </div>
        {err && <p className="error mt">{err}</p>}
      </form>
      <div className="card">
        {depts?.length === 0 && <Empty>No departments yet.</Empty>}
        {depts?.length > 0 && (
          <table>
            <thead><tr><th>Department</th><th>Employees</th><th>Manager</th><th></th></tr></thead>
            <tbody>
              {depts.map((d) => (
                <tr key={d._id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.employees}</td>
                  <td style={{ maxWidth: 220 }}>
                    <select value={d.manager?._id || ''} onChange={(e) => setManager(d, e.target.value)}>
                      <option value="">— No manager —</option>
                      {emps.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
                    </select>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn ghost small" onClick={() => rename(d)}>Rename</button>
                    <button className="btn ghost small" onClick={() => remove(d)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
