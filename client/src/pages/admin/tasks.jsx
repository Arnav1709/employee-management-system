import { useEffect, useState } from 'react';
import { get, post, put } from '../../api';
import { Badge, Field, Empty, fmt, today } from '../../ui';

export default function TasksAdmin() {
  const [tasks, setTasks] = useState(null);
  const [emps, setEmps] = useState([]);
  const [filter, setFilter] = useState({ employee: '', status: '' });
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: '', description: '', priority: 'medium', deadline: '', assignedTo: '' });
  const [review, setReview] = useState(null); // task being reviewed
  const [feedback, setFeedback] = useState('');
  const [err, setErr] = useState('');

  const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v)).toString();
  const load = () => get('/tasks?' + qs).then(setTasks).catch(() => {});
  useEffect(load, [qs]);
  useEffect(() => { get('/employees?status=active').then(setEmps).catch(() => {}); }, []);

  const create = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await post('/tasks', f);
      setF({ title: '', description: '', priority: 'medium', deadline: '', assignedTo: '' });
      setAdding(false);
      load();
    } catch (ex) { setErr(ex.message); }
  };

  const saveFeedback = async (e) => {
    e.preventDefault();
    await put('/tasks/' + review._id, { feedback });
    setReview(null);
    load();
  };

  return (
    <>
      <div className="spread">
        <h1>Tasks</h1>
        {!adding && <button className="btn" onClick={() => setAdding(true)}>+ Assign task</button>}
      </div>

      {adding && (
        <form className="card mt" onSubmit={create}>
          <h2>Assign a task</h2>
          <div className="frow">
            <Field label="Title"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
            <Field label="Assign to">
              <select value={f.assignedTo} onChange={(e) => setF({ ...f, assignedTo: e.target.value })} required>
                <option value="">Choose…</option>
                {emps.filter((e) => e.role === 'employee').map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </Field>
            <Field label="Deadline"><input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} required /></Field>
          </div>
          <div className="field mt"><label>Description</label><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="actions">
            <button className="btn">Assign</button>
            <button type="button" className="btn secondary" onClick={() => setAdding(false)}>Cancel</button>
            {err && <span className="error">{err}</span>}
          </div>
        </form>
      )}

      {review && (
        <form className="card mt" onSubmit={saveFeedback}>
          <h2>Review: {review.title}</h2>
          <p className="hint">{review.description || 'No description.'} — completed {fmt(review.completedAt)} by {review.assignedTo?.name}</p>
          <div className="field mt"><label>Feedback</label><textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="How was it done?" /></div>
          <div className="actions">
            <button className="btn">Save feedback</button>
            <button type="button" className="btn secondary" onClick={() => setReview(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card mt">
        <div className="frow">
          <Field label="Employee">
            <select value={filter.employee} onChange={(e) => setFilter({ ...filter, employee: e.target.value })}>
              <option value="">All</option>
              {emps.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
              <option value="">All</option><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="completed">Completed</option>
            </select>
          </Field>
        </div>
        <div className="mt">
          {tasks?.length === 0 && <Empty>No tasks.</Empty>}
          {tasks?.length > 0 && (
            <table>
              <thead><tr><th>Task</th><th>Assigned to</th><th>Priority</th><th>Deadline</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {tasks.map((t) => {
                  const overdue = t.status !== 'completed' && t.deadline && t.deadline < today();
                  const late = t.status === 'completed' && t.deadline && t.completedAt > t.deadline;
                  return (
                    <tr key={t._id}>
                      <td><strong>{t.title}</strong>{t.feedback && <div className="hint">Feedback: {t.feedback}</div>}</td>
                      <td>{t.assignedTo?.name}</td>
                      <td><Badge v={t.priority} /></td>
                      <td>{fmt(t.deadline)} {overdue && <Badge v="rejected" />}{late && <span className="hint"> (late)</span>}</td>
                      <td><Badge v={t.status} /></td>
                      <td>{t.status === 'completed' && <button className="btn ghost small" onClick={() => { setReview(t); setFeedback(t.feedback || ''); }}>Review</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
