import { useEffect, useState } from 'react';
import { get, put } from '../../api';
import { Badge, Empty, fmt } from '../../ui';

export default function LeavesAdmin() {
  const [leaves, setLeaves] = useState(null);
  const load = () => get('/leaves').then(setLeaves).catch(() => {});
  useEffect(load, []);

  const decide = async (l, status) => {
    let adminNote = '';
    if (status === 'rejected') adminNote = prompt('Reason for rejection (optional):') || '';
    await put('/leaves/' + l._id, { status, adminNote });
    load();
  };

  if (!leaves) return null;
  const pending = leaves.filter((l) => l.status === 'pending');
  const decided = leaves.filter((l) => l.status !== 'pending');

  const row = (l, actions) => (
    <tr key={l._id}>
      <td><strong>{l.employee?.name}</strong> <span className="hint">{l.employee?.empCode}</span></td>
      <td><Badge v={l.type} /></td>
      <td>{fmt(l.fromDate)}{l.fromDate !== l.toDate && <> – {fmt(l.toDate)}</>} <span className="hint">({l.days} day{l.days > 1 ? 's' : ''})</span></td>
      <td>{l.reason || '—'}</td>
      {actions ? (
        <td style={{ whiteSpace: 'nowrap' }}>
          <button className="btn small" onClick={() => decide(l, 'approved')}>Approve</button>{' '}
          <button className="btn secondary small" onClick={() => decide(l, 'rejected')}>Reject</button>
        </td>
      ) : (
        <td><Badge v={l.status} />{l.adminNote && <div className="hint">{l.adminNote}</div>}</td>
      )}
    </tr>
  );

  return (
    <>
      <h1>Leave requests</h1>
      <div className="card mt">
        <h2>Pending ({pending.length})</h2>
        {pending.length === 0 ? <Empty>No pending requests. 🎉</Empty> : (
          <table>
            <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th>Decision</th></tr></thead>
            <tbody>{pending.map((l) => row(l, true))}</tbody>
          </table>
        )}
      </div>
      <div className="card">
        <h2>History</h2>
        {decided.length === 0 ? <Empty /> : (
          <table>
            <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>{decided.map((l) => row(l, false))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
