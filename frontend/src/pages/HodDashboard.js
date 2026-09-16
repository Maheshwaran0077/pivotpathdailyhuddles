import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, X, AlertCircle, CheckCircle2,
  ShieldCheck, Bell,
} from 'lucide-react';
import axios from 'axios';
import { ALL_DEPARTMENTS } from '../departments';

const API = process.env.REACT_APP_API_URL || 
  ((window.location.port && window.location.port !== '5000') 
    ? `${window.location.protocol}//${window.location.hostname}:5000` 
    : window.location.origin);

const strToArr = (str) =>
  !str || str === 'NONE' ? [] : str.split(',').map(s => s.trim()).filter(Boolean);

const fmtDept = (value) => {
  const keys = strToArr(value);
  if (!keys.length) return '—';
  return keys.map(k => ALL_DEPARTMENTS.find(d => d.key === k)?.short || k.toUpperCase()).join(', ');
};

const fmtShift = (value) => {
  const shifts = strToArr(value);
  return shifts.length ? shifts.map(s => `Shift ${s}`).join(', ') : '—';
};

// ── Read-only user table ────────────────────────────────────────────────────────
const UserTable = ({ title, icon, count, users, loading }) => (
  <div className="bg-white rounded-[2rem] shadow-xl border border-emerald-50 overflow-hidden mb-8">
    <div className="bg-emerald-900 p-6 text-white flex justify-between items-center">
      <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2">{icon} {title}</h3>
      <span className="bg-emerald-800 px-4 py-1 rounded-full text-[10px] font-bold">COUNT: {count}</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-emerald-50/50 text-emerald-900 text-[10px] font-black uppercase tracking-widest border-b border-emerald-100">
            <th className="px-6 py-5">Emp ID</th>
            <th className="px-6 py-5">Name</th>
            <th className="px-6 py-5">Email</th>
            <th className="px-6 py-5">Department</th>
            <th className="px-6 py-5">Shift</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-50">
          {loading ? (
            <tr>
              <td colSpan={5} className="py-20 text-center font-black text-emerald-200 uppercase tracking-widest animate-pulse">
                Syncing Database...
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-12 text-center font-bold text-slate-200 uppercase tracking-widest">
                No records found
              </td>
            </tr>
          ) : users.map(u => (
            <tr key={u._id} className="hover:bg-emerald-50/20 transition-colors">
              <td className="px-6 py-4 font-black text-emerald-950 text-xs uppercase whitespace-nowrap">
                {u.employeeId || '—'}
              </td>
              <td className="px-6 py-4 font-bold text-slate-700 text-sm whitespace-nowrap">
                {u.name}
              </td>
              <td className="px-6 py-4 text-[10px] text-emerald-500 font-bold whitespace-nowrap">
                {u.gmail}
              </td>
              <td className="px-6 py-4 text-[10px] font-bold text-slate-600 whitespace-nowrap">
                {fmtDept(u.department)}
              </td>
              <td className="px-6 py-4 text-[10px] font-bold text-slate-600 whitespace-nowrap">
                {fmtShift(u.shift)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const HodDashboard = () => {
  const user = JSON.parse(localStorage.getItem('userInfo'));

  const [supervisors, setSupervisors] = useState([]);
  const [hods,        setHods]        = useState([]);
  const [loading,     setLoading]     = useState(true);

  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Notifications panel
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [notifs,      setNotifs]      = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const hodDept = user?.department || '';

  const fetchNotifications = useCallback(async () => {
    if (!hodDept) return;
    try {
      const res = await axios.get(`${API}/api/notifications?dept=${hodDept}`);
      const data = res.data || [];
      setNotifs(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch {}
  }, [hodDept]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await axios.patch(`${API}/api/notifications/read?dept=${hodDept}`);
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const showNotify = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [supRes, hodRes] = await Promise.all([
        axios.get(`${API}/api/users/all/supervisor`),
        axios.get(`${API}/api/users/all/hod`),
      ]);
      setSupervisors(supRes.data);
      setHods(hodRes.data);
    } catch {
      showNotify('Connection Error', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="min-h-screen bg-[#F8FDFB] p-4 md:p-10 font-sans">

      {/* Notification toast */}
      {notification.show && (
        <div className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white ${
          notification.type === 'error' ? 'bg-red-600' : 'bg-emerald-900'
        }`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}

      <header className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-emerald-900 uppercase tracking-tighter">Global Monitor</h1>
          <p className="text-emerald-600 font-bold text-xs uppercase opacity-70 tracking-[0.2em]">HOD Console: {user?.name}</p>
        </div>
        <div className="relative">
          <button onClick={() => { setNotifOpen(o => !o); if (!notifOpen) markAllRead(); }}
            className="relative p-3 bg-white border border-emerald-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <Bell size={20} className="text-emerald-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-14 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl w-80 max-h-96 overflow-y-auto">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Notifications</span>
                <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={16}/></button>
              </div>
              {notifs.length === 0 ? (
                <div className="py-10 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">No notifications</div>
              ) : notifs.slice(0, 30).map((n, i) => (
                <div key={i} className={`px-4 py-3 border-b border-slate-50 last:border-0 ${n.read ? 'opacity-60' : 'bg-emerald-50/40'}`}>
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">{n.dept?.toUpperCase()} — Shift {n.shift}</p>
                  <p className="text-xs text-slate-700 font-semibold mt-0.5">{n.message || `${n.empName} updated ${n.module}`}</p>
                  <p className="text-[9px] text-slate-400 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* View-only tables */}
      <UserTable
        title="Active HODs"
        icon={<ShieldCheck size={16} />}
        count={hods.length}
        users={hods}
        loading={loading}
      />
      <UserTable
        title="Active Supervisors"
        icon={<Briefcase size={16} />}
        count={supervisors.length}
        users={supervisors}
        loading={loading}
      />
    </div>
  );
};

export default HodDashboard;
