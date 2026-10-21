import { useEffect, useState } from 'react';
import { get } from '../../api';
import { Badge, Empty, Stars, fmt, today, useUser } from '../../ui';

export default function Home() {
  const { user } = useUser();
  const [todayRec, setTodayRec] = useState(null);
  const [perf, setPerf] = useState(null);
  const [balance, setBalance] = useState(null);
  const [anns, setAnns] = useState(null);

  useEffect(() => {
    get(`/attendance?from=${today()}&to=${today()}`).then((r) => setTodayRec(r[0] || null)).catch(() => {});
    get('/performance').then(setPerf).catch(() => {});
    get('/leaves/balance').then(setBalance).catch(() => {});
    get('/announcements').then(setAnns).catch(() => {});
  }, []);

  return (
    <>
      <h1>Hello, {user.name.split(' ')[0]} 👋</h1>
      <div className="grid stats mt">
        <div className="card stat">
          <div className="n">{todayRec ? <Badge v={todayRec.status} /> : '—'}</div>
          <div className="l">Today's attendance</div>
        </div>
        <div className="card stat"><div className="n">{perf?.attendancePct ?? '—'}{perf?.attendancePct != null && '%'}</div><div className="l">Attendance this month</div></div>
        <div className="card stat"><div className="n">{perf?.completed ?? '—'}</div><div className="l">Tasks completed this month</div></div>
        <div className="card stat"><div className="n">{balance ? balance.remaining : '—'}</div><div className="l">Leave days left</div></div>
        <div className="card stat"><div className="n">{perf?.rating ? <Stars n={perf.rating.rating} /> : '—'}</div><div className="l">Rating this month</div></div>
      </div>
      {perf?.rating?.feedback && <div className="card"><h2>Manager feedback</h2><p>“{perf.rating.feedback}”</p></div>}
      <div className="card">
        <h2>Announcements</h2>
        {anns?.length === 0 && <Empty>No announcements.</Empty>}
        {anns?.map((a) => (
          <div key={a._id} className="mt" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <div className="spread"><strong>{a.title}</strong><Badge v={a.category} /></div>
            <p>{a.body}</p>
            <span className="hint">{fmt(a.createdAt?.slice(0, 10))}</span>
          </div>
        ))}
      </div>
    </>
  );
}
