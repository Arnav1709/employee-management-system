import { useEffect, useState } from 'react';
import { get, post } from '../../api';
import { Badge, Field, Empty, fmt } from '../../ui';

export default function MyLeaves() {
  const [balance, setBalance] = useState(null);
  const [leaves, setLeaves] = useState(null);
  const [f, setF] = useState({ type: 'casual', fromDate: '', toDate: '', reason: '' });
  const [err, setErr] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const load = () => {
    get('/leaves/balance').then(setBalance).catch(() => {});
    get('/leaves').then(setLeaves).catch(() => {});
  };
  useEffect(load, []);

  const apply = async (e) => {
    e.preventDefault();
    setErr(''); setOkMsg('');
    try {
      await post('/leaves', f);
      setF({ type: 'casual', fromDate: '', toDate: '', reason: '' });
      setOkMsg('Leave request submitted — waiting for admin approval.');
      load();
    } catch (ex) { setErr(ex.message); }
  };

  return (
    <>
      <h1>My leaves</h1>
      <div className="grid stats mt">
        <div className="card stat"><div className="n">{balance?.quota ?? '—'}</div><div className="l">Yearly quota</div></div>
        <div className="card stat"><div className="n">{balance?.used ?? '—'}</div><div className="l">Used (approved)</div></div>
        <div className="card stat"><div className="n">{balance?.remaining ?? '—'}</div><div className="l">Remaining</div></div>
      </div>

      <form className="card" onSubmit={apply}>
        <h2>Apply for leave</h2>
        <div className="frow">
          <Field label="Type">
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              <option value="casual">Casual</option><option value="sick">Sick</option><option value="unpaid">Unpaid</option>
            </select>
          </Field>
          <Field label="From"><input type="date" value={f.fromDate} onChange={(e) => setF({ ...f, fromDate: e.target.value })} required /></Field>
          <Field label="To"><input type="date" value={f.toDate} onChange={(e) => setF({ ...f, toDate: e.target.value })} required /></Field>
          <Field label="Reason"><input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Optional" /></Field>
        </div>
        <div className="actions">
          <button className="btn">Apply</button>
          {err && <span className="error">{err}</span>}
          {okMsg && <span className="hint">{okMsg}</span>}
        </div>
      </form>

      <div className="card">
        <h2>My requests</h2>
        {leaves?.length === 0 ? <Empty>You haven't applied for leave yet.</Empty> : (
          <table>
            <thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>
              {(leaves || []).map((l) => (
                <tr key={l._id}>
                  <td><Badge v={l.type} /></td>
                  <td>{fmt(l.fromDate)}{l.fromDate !== l.toDate && <> – {fmt(l.toDate)}</>}</td>
                  <td>{l.days}</td>
                  <td>{l.reason || '—'}</td>
                  <td><Badge v={l.status} />{l.adminNote && <div className="hint">{l.adminNote}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
