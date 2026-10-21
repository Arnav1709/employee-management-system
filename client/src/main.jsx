import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { get, post } from './api';
import { Avatar, UserCtx } from './ui';
import './styles.css';

import Login from './pages/login';
import Dashboard from './pages/admin/dashboard';
import Employees from './pages/admin/employees';
import EmployeeDetail from './pages/admin/employee-detail';
import Departments from './pages/admin/departments';
import AttendanceAdmin from './pages/admin/attendance';
import LeavesAdmin from './pages/admin/leaves';
import TasksAdmin from './pages/admin/tasks';
import Announcements from './pages/admin/announcements';
import Home from './pages/employee/home';
import Profile from './pages/employee/profile';
import MyAttendance from './pages/employee/attendance';
import MyTasks from './pages/employee/tasks';
import MyLeaves from './pages/employee/leaves';
import MyDocuments from './pages/employee/documents';

const NAV = {
  admin: [
    ['/', 'Dashboard'], ['/employees', 'Employees'], ['/attendance', 'Attendance'], ['/leaves', 'Leaves'],
    ['/tasks', 'Tasks'], ['/announcements', 'Announcements'], ['/departments', 'Departments'],
  ],
  employee: [
    ['/', 'Home'], ['/attendance', 'My Attendance'], ['/tasks', 'My Tasks'], ['/leaves', 'My Leaves'],
    ['/documents', 'My Documents'], ['/profile', 'My Profile'],
  ],
};

function Shell({ user, setUser, children }) {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="wordmark">BALCA<span>CORP</span><small>Employee Management</small></div>
        <nav>
          {NAV[user.role].map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
          ))}
        </nav>
        <div className="foot">Signed in as {user.role}</div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="who">
            <Avatar emp={user} />
            <div><strong>{user.name}</strong><small>{user.jobTitle || user.empCode}</small></div>
          </div>
          <button className="btn secondary small" onClick={async () => { await post('/logout'); setUser(null); }}>Log out</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(undefined); // undefined = checking session
  useEffect(() => { get('/me').then(setUser).catch(() => setUser(null)); }, []);
  if (user === undefined) return null;
  if (!user) return <Login onLogin={setUser} />;

  const routes = user.role === 'admin' ? (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/employees" element={<Employees />} />
      <Route path="/employees/:id" element={<EmployeeDetail />} />
      <Route path="/departments" element={<Departments />} />
      <Route path="/attendance" element={<AttendanceAdmin />} />
      <Route path="/leaves" element={<LeavesAdmin />} />
      <Route path="/tasks" element={<TasksAdmin />} />
      <Route path="/announcements" element={<Announcements />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  ) : (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/attendance" element={<MyAttendance />} />
      <Route path="/tasks" element={<MyTasks />} />
      <Route path="/leaves" element={<MyLeaves />} />
      <Route path="/documents" element={<MyDocuments />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  return (
    <UserCtx.Provider value={{ user, setUser }}>
      <BrowserRouter>
        <Shell user={user} setUser={setUser}>{routes}</Shell>
      </BrowserRouter>
    </UserCtx.Provider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
