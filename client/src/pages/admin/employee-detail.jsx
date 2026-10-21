import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, get, put, del } from '../../api';
import { Avatar, Badge, Field, Empty, Stars, fmt, thisMonth } from '../../ui';
import { EmployeeForm } from './employees';

const DOC_TYPES = { offer_letter: 'Offer Letter', id_proof: 'ID Proof', certificate: 'Certificate', salary_slip: 'Salary Slip', other: 'Other' };

export default function EmployeeDetail() {
  const { id } = useParams();
  const [emp, setEmp] = useState(null);
  const [editing, setEditing] = useState(false);
  const [balance, setBalance] = useState(null);
  const [docs, setDocs] = useState([]);
  const [month, setMonth] = useState(thisMonth());
  const [perf, setPerf] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [rateForm, setRateForm] = useState({ rating: 5, feedback: '' });
  const [docForm, setDocForm] = useState({ type: 'salary_slip', title: '', file: null });
  const [msg, setMsg] = useState('');

  const load = () => {
    get('/employees/' + id).then(setEmp).catch(() => {});
    get('/leaves/balance?employee=' + id).then(setBalance).catch(() => {});
    get('/documents?employee=' + id).then(setDocs).catch(() => {});
    get('/ratings?employee=' + id).then(setRatings).catch(() => {});
  };
  useEffect(load, [id]);
  useEffect(() => {
    get(`/performance?employee=${id}&month=${month}`).then((p) => {
      setPerf(p);
      setRateForm({ rating: p.rating?.rating || 5, feedback: p.rating?.feedback || '' });
    }).catch(() => {});
  }, [id, month]);

  if (!emp) return null;

  const toggleStatus = async () => {
    const next = emp.status === 'active' ? 'inactive' : 'active';
    if (next === 'inactive' && !confirm(`Deactivate ${emp.name}? They will no longer be able to log in.`)) return;
    setEmp(await put('/employees/' + id, { status: next }));
  };

  const uploadDoc = async (e) => {
    e.preventDefault();
    setMsg('');
    const fd = new FormData();
    fd.append('employee', id);
    fd.append('type', docForm.type);
    if (docForm.title) fd.append('title', docForm.title);
    fd.append('file', docForm.file);
    try {
      await api('/documents', { method: 'POST', body: fd });
      setDocForm({ type: 'salary_slip', title: '', file: null });
      e.target.reset();
      load();
    } catch (ex) { setMsg(ex.message); }
  };

  const saveRating = async (e) => {
    e.preventDefault();
    await put('/ratings', { employee: id, month, rating: Number(rateForm.rating), feedback: rateForm.feedback });
    get('/ratings?employee=' + id).then(setRatings);
    get(`/performance?employee=${id}&month=${month}`).then(setPerf);
  };

  return (
    <>
      <p><Link to="/employees">← All employees</Link></p>
      {editing ? (
        <EmployeeForm initial={emp} onSaved={(e) => { setEmp(e); setEditing(false); }} onCancel={() => setEditing(false)} />
      ) : (
        <div className="card">
          <div className="spread">
            <div className="who" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Avatar emp={emp} big />
              <div>
                <h1>{emp.name} <Badge v={emp.status} /></h1>
                <div className="hint">{emp.empCode} · {emp.jobTitle || 'No role set'} · {emp.department?.name || 'No department'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn secondary small" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn small" onClick={toggleStatus}>{emp.status === 'active' ? 'Deactivate' : 'Reactivate'}</button>
            </div>
          </div>
          <div className="frow mt">
            <div><label>Email</label>{emp.email}</div>
            <div><label>Phone</label>{emp.phone || '—'}</div>
            <div><label>Joined</label>{fmt(emp.joiningDate)}</div>
            <div><label>Leave balance</label>{balance ? `${balance.remaining} of ${balance.quota} days left` : '…'}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="spread">
          <h2>Performance</h2>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 170 }} />
        </div>
        {perf && (
          <div className="grid stats">
            <div className="card stat"><div className="n">{perf.completed}</div><div className="l">Tasks completed</div></div>
            <div className="card stat"><div className="n">{perf.delayed}</div><div className="l">Completed late</div></div>
            <div className="card stat"><div className="n">{perf.attendancePct ?? '—'}{perf.attendancePct != null && '%'}</div><div className="l">Attendance</div></div>
            <div className="card stat"><div className="n">{perf.rating ? <Stars n={perf.rating.rating} /> : '—'}</div><div className="l">Rating for {month}</div></div>
          </div>
        )}
        <form className="frow mt" onSubmit={saveRating}>
          <Field label={`Rating for ${month}`}>
            <select value={rateForm.rating} onChange={(e) => setRateForm({ ...rateForm, rating: e.target.value })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} — {'★'.repeat(n)}</option>)}
            </select>
          </Field>
          <Field label="Feedback"><input value={rateForm.feedback} onChange={(e) => setRateForm({ ...rateForm, feedback: e.target.value })} placeholder="Monthly feedback…" /></Field>
          <button className="btn small" style={{ height: 38 }}>Save rating</button>
        </form>
        {ratings.length > 0 && (
          <table className="mt">
            <thead><tr><th>Month</th><th>Rating</th><th>Feedback</th></tr></thead>
            <tbody>{ratings.map((r) => <tr key={r._id}><td>{r.month}</td><td><Stars n={r.rating} /></td><td>{r.feedback || '—'}</td></tr>)}</tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Documents</h2>
        <form className="frow" onSubmit={uploadDoc}>
          <Field label="Type">
            <select value={docForm.type} onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}>
              {Object.entries(DOC_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Title (optional)"><input value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} /></Field>
          <Field label="File (PDF/JPG/PNG, max 5 MB)"><input type="file" accept=".pdf,.jpg,.jpeg,.png" required onChange={(e) => setDocForm({ ...docForm, file: e.target.files[0] })} /></Field>
          <button className="btn small" style={{ height: 38 }}>Upload</button>
        </form>
        {msg && <p className="error mt">{msg}</p>}
        {docs.length === 0 ? <Empty>No documents uploaded.</Empty> : (
          <table className="mt">
            <thead><tr><th>Title</th><th>Type</th><th>Uploaded</th><th></th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d._id}>
                  <td><a href={`/api/documents/${d._id}/file`}>{d.title}</a></td>
                  <td>{DOC_TYPES[d.type] || d.type}</td>
                  <td>{fmt(d.createdAt?.slice(0, 10))}</td>
                  <td><button className="btn ghost small" onClick={async () => { if (confirm('Delete this document?')) { await del('/documents/' + d._id); load(); } }}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
