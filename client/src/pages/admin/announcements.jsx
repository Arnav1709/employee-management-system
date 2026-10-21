import { useEffect, useState } from 'react';
import { get, post, put, del } from '../../api';
import { Badge, Field, Empty, fmt } from '../../ui';

export default function Announcements() {
  const [list, setList] = useState(null);
  const [f, setF] = useState({ title: '', body: '', category: 'general' });
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');
  const load = () => get('/announcements').then(setList).catch(() => {});
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await (editId ? put('/announcements/' + editId, f) : post('/announcements', f));
      setF({ title: '', body: '', category: 'general' });
      setEditId(null);
      load();
    } catch (ex) { setErr(ex.message); }
  };

  return (
    <>
      <h1>Announcements</h1>
      <form className="card mt" onSubmit={submit}>
        <h2>{editId ? 'Edit announcement' : 'Post an announcement'}</h2>
        <div className="frow">
          <Field label="Title"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
          <Field label="Category">
            <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              <option value="general">General</option><option value="holiday">Holiday</option><option value="urgent">Urgent</option>
            </select>
          </Field>
        </div>
        <div className="field mt"><label>Message</label><textarea rows={3} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required /></div>
        <div className="actions">
          <button className="btn">{editId ? 'Save changes' : 'Post'}</button>
          {editId && <button type="button" className="btn secondary" onClick={() => { setEditId(null); setF({ title: '', body: '', category: 'general' }); }}>Cancel</button>}
          {err && <span className="error">{err}</span>}
        </div>
      </form>
      <div className="card">
        {list?.length === 0 && <Empty>No announcements yet.</Empty>}
        {list?.map((a) => (
          <div key={a._id} className="mt" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <div className="spread">
              <strong>{a.title}</strong>
              <span>
                <Badge v={a.category} />{' '}
                <button className="btn ghost small" onClick={() => { setEditId(a._id); setF({ title: a.title, body: a.body, category: a.category }); window.scrollTo(0, 0); }}>Edit</button>
                <button className="btn ghost small" onClick={async () => { if (confirm('Delete this announcement?')) { await del('/announcements/' + a._id); load(); } }}>Delete</button>
              </span>
            </div>
            <p>{a.body}</p>
            <span className="hint">{fmt(a.createdAt?.slice(0, 10))}</span>
          </div>
        ))}
      </div>
    </>
  );
}
