import { useState } from 'react';
import { api, post } from '../../api';
import { Avatar, Field, fmt, useUser } from '../../ui';

export default function Profile() {
  const { user, setUser } = useUser();
  const [phone, setPhone] = useState(user.phone || '');
  const [photo, setPhoto] = useState(null);
  const [msg, setMsg] = useState('');
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwMsg, setPwMsg] = useState(null); // { ok, text }

  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    const fd = new FormData();
    fd.append('phone', phone);
    if (photo) fd.append('photo', photo);
    try { setUser(await api('/me', { method: 'PUT', body: fd })); setMsg('Saved.'); }
    catch (ex) { setMsg(ex.message); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    try {
      await post('/me/password', pw);
      setPw({ current: '', next: '' });
      setPwMsg({ ok: true, text: 'Password changed.' });
    } catch (ex) { setPwMsg({ ok: false, text: ex.message }); }
  };

  return (
    <>
      <h1>My profile</h1>
      <div className="card mt">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Avatar emp={user} big />
          <div>
            <h2 style={{ margin: 0 }}>{user.name}</h2>
            <div className="hint">{user.empCode} · {user.jobTitle || 'No role set'} · {user.department?.name || 'No department'}</div>
          </div>
        </div>
        <div className="frow mt">
          <div><label>Email</label>{user.email}</div>
          <div><label>Joined</label>{fmt(user.joiningDate)}</div>
          <div><label>Leave quota</label>{user.leaveQuota} days/year</div>
        </div>
        <p className="hint mt">Only your phone number and photo can be changed here — ask the admin for anything else.</p>
      </div>

      <form className="card" onSubmit={save}>
        <h2>Contact details</h2>
        <div className="frow">
          <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Profile photo (JPG/PNG)"><input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setPhoto(e.target.files[0])} /></Field>
          <button className="btn small" style={{ height: 38 }}>Save</button>
        </div>
        {msg && <p className={msg === 'Saved.' ? 'hint mt' : 'error mt'}>{msg}</p>}
      </form>

      <form className="card" onSubmit={changePw}>
        <h2>Change password</h2>
        <div className="frow">
          <Field label="Current password"><input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></Field>
          <Field label="New password (min 6 chars)"><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={6} /></Field>
          <button className="btn small" style={{ height: 38 }}>Change</button>
        </div>
        {pwMsg && <p className={pwMsg.ok ? 'hint mt' : 'error mt'}>{pwMsg.text}</p>}
      </form>
    </>
  );
}
