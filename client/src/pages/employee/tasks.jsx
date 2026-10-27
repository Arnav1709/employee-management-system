import { useEffect, useState } from 'react';
import { get, put } from '../../api';
import { Badge, Empty, fmt, today } from '../../ui';

const STATUSES = [['todo', 'To Do'], ['in_progress', 'In Progress'], ['completed', 'Completed']];

export default function MyTasks() {
  const [tasks, setTasks] = useState(null);
  const load = () => get('/tasks').then(setTasks).catch(() => {});
  useEffect(() => { load(); }, []);

  const setStatus = async (t, status) => { await put('/tasks/' + t._id, { status }); load(); };

  return (
    <>
      <h1>My tasks</h1>
      <div className="card mt">
        {tasks?.length === 0 && <Empty>No tasks assigned to you.</Empty>}
        {tasks?.length > 0 && (
          <table>
            <thead><tr><th>Task</th><th>Priority</th><th>Deadline</th><th>Status</th></tr></thead>
            <tbody>
              {tasks.map((t) => {
                const overdue = t.status !== 'completed' && t.deadline && t.deadline < today();
                return (
                  <tr key={t._id}>
                    <td>
                      <strong>{t.title}</strong>
                      {t.description && <div className="hint">{t.description}</div>}
                      {t.feedback && <div className="hint">💬 Feedback: {t.feedback}</div>}
                    </td>
                    <td><Badge v={t.priority} /></td>
                    <td>{fmt(t.deadline)} {overdue && <Badge v="rejected" />}</td>
                    <td>
                      <div className="seg">
                        {STATUSES.map(([v, l]) => (
                          <button key={v} className={t.status === v ? 'on' : ''} onClick={() => setStatus(t, v)}>{l}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
