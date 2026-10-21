// Small shared pieces used across pages.
import { createContext, useContext } from 'react';

export const UserCtx = createContext(null);
export const useUser = () => useContext(UserCtx);

export const BADGE = {
  present: ['green', 'Present'], absent: ['red', 'Absent'], half_day: ['amber', 'Half-day'], leave: ['navy', 'On Leave'],
  pending: ['amber', 'Pending'], approved: ['green', 'Approved'], rejected: ['red', 'Rejected'],
  todo: ['', 'To Do'], in_progress: ['navy', 'In Progress'], completed: ['green', 'Completed'],
  low: ['', 'Low'], medium: ['amber', 'Medium'], high: ['red', 'High'],
  general: ['navy', 'General'], holiday: ['green', 'Holiday'], urgent: ['red', 'Urgent'],
  casual: ['navy', 'Casual'], sick: ['amber', 'Sick'], unpaid: ['', 'Unpaid'],
  active: ['green', 'Active'], inactive: ['red', 'Inactive'],
};

export function Badge({ v }) {
  const [color, label] = BADGE[v] || ['', v];
  return <span className={`badge ${color}`}>{label}</span>;
}

export function Avatar({ emp, big }) {
  return emp?.photo
    ? <img className={`avatar ${big ? 'big' : ''}`} src={emp.photo} alt={emp.name} />
    : <div className={`avatar ${big ? 'big' : ''}`} style={{ display: 'grid', placeItems: 'center', fontFamily: 'var(--head)', fontSize: big ? 30 : 14 }}>{(emp?.name || '?')[0]}</div>;
}

export function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

export function Empty({ children = 'Nothing here yet.' }) {
  return <div className="empty">{children}</div>;
}

export const Stars = ({ n }) => <span className="stars" aria-label={`${n} out of 5`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;

export const fmt = (d) => (d ? new Date(d + (d.length === 10 ? 'T12:00' : '')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const today = () => new Date().toLocaleDateString('en-CA');
export const thisMonth = () => today().slice(0, 7);
