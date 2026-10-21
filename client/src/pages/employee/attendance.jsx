import { useEffect, useState } from 'react';
import { get } from '../../api';
import { Badge, Empty, fmt, thisMonth } from '../../ui';

export default function MyAttendance() {
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState(null);
  useEffect(() => { get(`/attendance?from=${month}-01&to=${month}-31`).then(setRows).catch(() => {}); }, [month]);

  const c = { present: 0, absent: 0, half_day: 0, leave: 0 };
  (rows || []).forEach((r) => c[r.status]++);
  const denom = c.present + c.half_day + c.absent;
  const pct = denom ? Math.round(((c.present + 0.5 * c.half_day) / denom) * 100) : null;

  return (
    <>
      <div className="spread">
        <h1>My attendance</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 170 }} />
      </div>
      <div className="grid stats mt">
        <div className="card stat"><div className="n">{c.present}</div><div className="l">Present</div></div>
        <div className="card stat"><div className="n">{c.half_day}</div><div className="l">Half-days</div></div>
        <div className="card stat"><div className="n">{c.absent}</div><div className="l">Absent</div></div>
        <div className="card stat"><div className="n">{c.leave}</div><div className="l">On leave</div></div>
        <div className="card stat"><div className="n">{pct ?? '—'}{pct != null && '%'}</div><div className="l">Attendance</div></div>
      </div>
      <div className="card">
        {rows?.length === 0 ? <Empty>Nothing marked for this month.</Empty> : (
          <table>
            <thead><tr><th>Date</th><th>Status</th></tr></thead>
            <tbody>{(rows || []).map((r) => <tr key={r._id}><td>{fmt(r.date)}</td><td><Badge v={r.status} /></td></tr>)}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
