import { useEffect, useState } from 'react';
import { get, post } from '../../api';
import { Avatar, Badge, Field, Empty, fmt, today } from '../../ui';

const MARKS = [['present', 'Present'], ['absent', 'Absent'], ['half_day', 'Half-day'], ['leave', 'On Leave']];

export default function AttendanceAdmin() {
  const [date, setDate] = useState(today());
  const [day, setDay] = useState(null);
  const [emps, setEmps] = useState([]);
  const [depts, setDepts] = useState([]);
  const [filter, setFilter] = useState({ from: today().slice(0, 8) + '01', to: today(), employee: '', department: '' });
  const [rows, setRows] = useState(null);

  useEffect(() => { get('/attendance/day?date=' + date).then(setDay).catch(() => {}); }, [date]);
  useEffect(() => {
    get('/employees?status=active').then(setEmps).catch(() => {});
    get('/departments').then(setDepts).catch(() => {});
  }, []);

  const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v)).toString();
  useEffect(() => { get('/attendance?' + qs).then(setRows).catch(() => {}); }, [qs]);

  const mark = async (employee, status) => {
    await post('/attendance', { employee, date, status });
    setDay({ ...day, employees: day.employees.map((e) => (e._id === employee ? { ...e, status } : e)) });
    get('/attendance?' + qs).then(setRows).catch(() => {});
  };

  return (
    <>
      <h1>Attendance</h1>
      <div className="card mt">
        <div className="spread">
          <h2>Mark attendance</h2>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} style={{ width: 170 }} />
        </div>
        {day?.employees.length === 0 && <Empty>No active employees.</Empty>}
        {day?.employees.length > 0 && (
          <table>
            <thead><tr><th></th><th>Employee</th><th>Department</th><th>Status for {fmt(day.date)}</th></tr></thead>
            <tbody>
              {day.employees.map((e) => (
                <tr key={e._id}>
                  <td><Avatar emp={e} /></td>
                  <td><strong>{e.name}</strong> <span className="hint">{e.empCode}</span></td>
                  <td>{e.department?.name || '—'}</td>
                  <td>
                    <div className="seg">
                      {MARKS.map(([v, l]) => (
                        <button key={v} className={e.status === v ? 'on' : ''} onClick={() => mark(e._id, v)}>{l}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="spread">
          <h2>History</h2>
          <a className="btn secondary small" style={{ lineHeight: '28px', textDecoration: 'none' }} href={'/api/attendance/export?' + qs}>⬇ Export to Excel</a>
        </div>
        <div className="frow">
          <Field label="From"><input type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} /></Field>
          <Field label="To"><input type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} /></Field>
          <Field label="Employee">
            <select value={filter.employee} onChange={(e) => setFilter({ ...filter, employee: e.target.value })}>
              <option value="">All</option>
              {emps.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select value={filter.department} onChange={(e) => setFilter({ ...filter, department: e.target.value })}>
              <option value="">All</option>
              {depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt">
          {rows?.length === 0 && <Empty>No attendance records for these filters.</Empty>}
          {rows?.length > 0 && (
            <table>
              <thead><tr><th>Date</th><th>Employee</th><th>Department</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td>{fmt(r.date)}</td>
                    <td>{r.employee?.name} <span className="hint">{r.employee?.empCode}</span></td>
                    <td>{r.employee?.department?.name || '—'}</td>
                    <td><Badge v={r.status} /></td>
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
