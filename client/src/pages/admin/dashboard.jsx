import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../../api';
import { fmt, thisMonth, today } from '../../ui';

export default function Dashboard() {
  const [sum, setSum] = useState(null);
  const [month, setMonth] = useState(thisMonth());
  const [graph, setGraph] = useState(null);
  const nav = useNavigate();

  useEffect(() => { get('/reports/summary').then(setSum).catch(() => {}); }, []);
  useEffect(() => { get('/reports/attendance-graph?month=' + month).then(setGraph).catch(() => {}); }, [month]);

  const cards = sum && [
    ['Total employees', sum.totalEmployees, '/employees'],
    ['Present today', sum.presentToday, '/attendance'],
    ['Pending leave requests', sum.pendingLeaves, '/leaves'],
    ['Tasks completed this month', sum.completedThisMonth, '/tasks'],
    ['Overdue tasks', sum.overdueTasks, '/tasks'],
  ];
  const max = graph ? Math.max(...graph.graph.map((g) => g.present), 1) : 1;
  const peak = graph && graph.graph.reduce((a, b) => (b.present > a.present ? b : a), { present: 0 });

  return (
    <>
      <h1>Dashboard</h1>
      {cards && (
        <div className="grid stats mt">
          {cards.map(([label, n, to]) => (
            <div key={label} className="card stat" onClick={() => nav(to)}>
              <div className="n">{n}</div>
              <div className="l">{label}</div>
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <div className="spread">
          <h2>Employees present per day</h2>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 170 }} />
        </div>
        {graph && (
          <>
            <div className="chart">
              {graph.graph.map((g, i) => (
                <div key={g.date} className="col" title={`${fmt(g.date)} — ${g.present} present`}>
                  <div className={`bar ${g.date === today() ? 'today' : ''}`} style={{ height: `${(g.present / max) * 100}%` }} />
                  {(i === 0 || (i + 1) % 5 === 0) && <span className="day">{i + 1}</span>}
                </div>
              ))}
            </div>
            <div className="chart-cap">
              Counts Present + Half-day. {peak.present > 0 ? <>Peak: {peak.present} on {fmt(peak.date)}.</> : 'No attendance marked this month.'} Today's bar is red.
            </div>
          </>
        )}
      </div>
    </>
  );
}
