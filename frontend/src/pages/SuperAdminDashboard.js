import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, ShieldCheck, Users, X, Mail, Hash, Calendar, Lock,
  Briefcase, Clock, ChevronRight, Key, Save, AlertCircle, CheckCircle2, Trash2,
  Timer, LogIn,
} from 'lucide-react';
import axios from 'axios';
import { ALL_DEPARTMENTS } from '../departments';

const LOCAL_ALL_DEPARTMENTS = ALL_DEPARTMENTS;

const API = process.env.REACT_APP_API_URL || 
  ((window.location.port && window.location.port !== '5000') 
    ? `${window.location.protocol}//${window.location.hostname}:5000` 
    : window.location.origin);
const ALL_DEPT_SHIFTS = ALL_DEPARTMENTS.flatMap(d => ['1','2','3'].map(s => ({ dept: d.key, deptName: d.short, shift: s })));

const SHIFTS = ['1', '2', '3'];

const toggleItem = (arr, val) =>
  arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
const arrToStr = (arr) =>
  Array.isArray(arr) && arr.length ? arr.join(',') : 'NONE';
const strToArr = (str) =>
  !str || str === 'NONE' ? [] : str.split(',').map(s => s.trim()).filter(Boolean);

// ── Multi-shift toggle (supervisor table rows) ────────────────────────────────
const ShiftToggle = ({ value, onToggle }) => {
  const selected = strToArr(value);
  return (
    <div className="flex gap-1">
      {SHIFTS.map(s => (
        <button key={s} type="button"
          onClick={() => onToggle(arrToStr(toggleItem(selected, s)))}
          className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${
            selected.includes(s)
              ? 'bg-emerald-900 text-white'
              : 'bg-white text-emerald-200 border border-emerald-100 hover:text-emerald-600'
          }`}>
          {s}
        </button>
      ))}
    </div>
  );
};

// ── Multi-dept checkbox dropdown (supervisor table rows) ──────────────────────
const DeptCell = ({ value, onChange }) => {
  const [localSel, setLocalSel] = useState(() => strToArr(value));
  const [open, setOpen]         = useState(false);

const displayText = localSel.length
    ? localSel.map(k => LOCAL_ALL_DEPARTMENTS.find(d => d.key === k)?.short || k.toUpperCase()).join(', ')
    : 'None assigned';

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="text-left bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 text-[10px] font-bold text-emerald-900 max-w-[180px] truncate">
        {displayText}
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-30 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 min-w-[240px] max-h-64 overflow-y-auto">
          {LOCAL_ALL_DEPARTMENTS.map(dept => (
            <label key={dept.key}
              onClick={() => setLocalSel(prev => toggleItem(prev, dept.key))}
              className="flex items-center gap-2 py-1.5 cursor-pointer group">
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                localSel.includes(dept.key)
                  ? 'bg-emerald-600 border-emerald-600'
                  : 'border-slate-200 group-hover:border-emerald-400'
              }`}>
                {localSel.includes(dept.key) && <span className="text-white text-[8px] font-black">✓</span>}
              </span>
              <span className="text-[10px] font-medium text-slate-700">{dept.name}</span>
            </label>
          ))}
          <button onClick={() => { onChange(arrToStr(localSel)); setOpen(false); }}
            className="w-full mt-2 bg-emerald-600 text-white text-[10px] font-black py-1.5 rounded-lg hover:bg-emerald-700 transition-all">
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

// ── Table row — adapts per roleType ('hod' | 'supervisor' | 'employee') ────────
const UserRow = ({ u, roleType, editData, onLocalChange, onSave, onDeleteClick }) => {
  const id = u._id;
  return (
    <tr className="hover:bg-emerald-50/20 transition-colors">
      <td className="px-5 py-3 font-black text-emerald-950 text-xs uppercase whitespace-nowrap">{u.employeeId || '—'}</td>
      <td className="px-5 py-3 font-bold text-slate-700 text-xs whitespace-nowrap">{u.name}</td>
      <td className="px-5 py-3 text-[10px] text-emerald-500 font-bold whitespace-nowrap">{u.gmail}</td>

      {/* HOD — single-dept select */}
      {roleType === 'hod' && (
        <td className="px-5 py-3">
          <select
            value={editData[id]?.department ?? u.department ?? ''}
            onChange={e => onLocalChange(id, 'department', e.target.value)}
            className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 text-[10px] font-bold text-emerald-900 outline-none max-w-[220px] truncate"
          >
{LOCAL_ALL_DEPARTMENTS.map(d => (
              <option key={d.key} value={d.key}>{d.short} — {d.name}</option>
            ))}
          </select>
        </td>
      )}

      {/* Supervisor — multi-dept + multi-shift */}
      {roleType === 'supervisor' && (
        <>
          <td className="px-5 py-3">
            <DeptCell
              value={editData[id]?.department ?? u.department ?? 'NONE'}
              onChange={val => onLocalChange(id, 'department', val)}
            />
          </td>
          <td className="px-5 py-3">
            <ShiftToggle
              value={editData[id]?.shift ?? u.shift ?? 'NONE'}
              onToggle={val => onLocalChange(id, 'shift', val)}
            />
          </td>
        </>
      )}

      {/* Password */}
      <td className="px-5 py-3">
        <div className="flex items-center bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100 max-w-[140px]">
          <Key size={12} className="text-emerald-300 mr-2 flex-shrink-0" />
          <input type="password" placeholder="NEW PWD"
            className="bg-transparent border-none outline-none text-[10px] font-black w-full placeholder:text-emerald-200"
            value={editData[id]?.password || ''}
            onChange={e => onLocalChange(id, 'password', e.target.value)} />
        </div>
      </td>

      {/* Save */}
      <td className="px-5 py-3 text-center">
        <button onClick={() => onSave(id, u.name)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-all flex items-center justify-center mx-auto shadow-md active:scale-95">
          <Save size={16} />
        </button>
      </td>

      {/* Delete */}
      <td className="px-5 py-3 text-center">
        <button onClick={() => onDeleteClick(id, u.name)}
          className="bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 p-2 rounded-lg transition-all flex items-center justify-center mx-auto active:scale-95">
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
};

// ── Table wrapper ─────────────────────────────────────────────────────────────
const UserTable = ({ title, count, users, roleType, loading, editData, onLocalChange, onSave, onDeleteClick }) => {
  const colSpan = roleType === 'supervisor' ? 8 : roleType === 'hod' ? 7 : 6;
  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-emerald-50 overflow-hidden mb-8">
      <div className="bg-emerald-900 p-5 text-white flex justify-between items-center">
        <h3 className="font-black uppercase text-xs tracking-widest">{title}</h3>
        <span className="bg-emerald-800 px-4 py-1 rounded-full text-[10px] font-bold">COUNT: {count}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-emerald-50/50 text-emerald-900 text-[10px] font-black uppercase tracking-widest border-b border-emerald-100">
              <th className="px-5 py-4">Emp ID</th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Email</th>
              {roleType === 'hod'        && <th className="px-5 py-4">Department</th>}
              {roleType === 'supervisor' && <><th className="px-5 py-4">Department</th><th className="px-5 py-4">Shift</th></>}
              <th className="px-5 py-4">Password</th>
              <th className="px-5 py-4 text-center">Save</th>
              <th className="px-5 py-4 text-center">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {loading ? (
              <tr><td colSpan={colSpan} className="py-16 text-center font-black text-emerald-200 uppercase tracking-widest animate-pulse">Syncing...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={colSpan} className="py-12 text-center font-bold text-slate-200 uppercase tracking-widest">No records found</td></tr>
            ) : users.map(u => (
              <UserRow key={u._id} u={u} roleType={roleType}
                editData={editData} onLocalChange={onLocalChange}
                onSave={onSave} onDeleteClick={onDeleteClick} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Admin card ────────────────────────────────────────────────────────────────
const AdminCard = ({ title, desc, icon, color, onClick }) => (
  <div onClick={onClick}
    className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-xl transition-all group cursor-pointer flex flex-col justify-between">
    <div>
      <div className={`w-12 h-12 md:w-14 md:h-14 ${color} rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h2 className="text-lg md:text-xl font-black text-emerald-950 mb-2 uppercase tracking-tighter">{title}</h2>
      <p className="text-emerald-600/70 mb-6 text-[10px] md:text-xs font-bold leading-relaxed">{desc}</p>
    </div>
    <div className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
      Launch Form <ChevronRight size={14} />
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', role: '' });
  const [formData, setFormData]       = useState({
    name: '', dob: '', employeeId: '', gmail: '', password: '',
    hodDept: '', selectedDepts: [], selectedShifts: [],
  });

  const [employees,   setEmployees]   = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [hods,        setHods]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [editData,    setEditData]    = useState({});

  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [deleteModal,  setDeleteModal]  = useState({ open: false, userId: null, userName: '' });

  // Time Lock Management
  const [timeLocks,     setTimeLocks]     = useState({});
  const [tlSaving,      setTlSaving]      = useState({});
  const [savingAll,     setSavingAll]     = useState(false);
  const [showTimeLock,  setShowTimeLock]  = useState(false);

  // Login Logs
  const [loginLogs,    setLoginLogs]    = useState([]);
  const [logsLoading,  setLogsLoading]  = useState(false);
  const [showLoginLog, setShowLoginLog] = useState(false);

  const showNotify = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, supRes, hodRes] = await Promise.all([
        axios.get(`${API}/api/users/all/employee`),
        axios.get(`${API}/api/users/all/supervisor`),
        axios.get(`${API}/api/users/all/hod`),
      ]);
      setEmployees(empRes.data);
      setSupervisors(supRes.data);
      setHods(hodRes.data);
    } catch {
      showNotify('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Time lock fetch
  const fetchTimeLocks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/timelock`);
      const map = {};
      (res.data || []).forEach(tl => { map[`${tl.dept}-${tl.shift}`] = tl; });
      // Initialise missing combos with defaults
      ALL_DEPT_SHIFTS.forEach(({ dept, shift }) => {
        const k = `${dept}-${shift}`;
        if (!map[k]) map[k] = { dept, shift, startTime: '06:00', endTime: '23:00', enabled: false };
      });
      setTimeLocks(map);
    } catch {}
  }, []);

  const saveSingleTimeLock = async (dept, shift) => {
    const k = `${dept}-${shift}`;
    setTlSaving(prev => ({ ...prev, [k]: true }));
    try {
      const tl = timeLocks[k] || { startTime: '06:00', endTime: '23:00', enabled: false };
      await axios.post(`${API}/api/timelock`, { dept, shift, startTime: tl.startTime, endTime: tl.endTime, enabled: tl.enabled });
      showNotify(`Time lock saved: ${dept} Shift ${shift}`, 'success');
    } catch (err) {
      showNotify(err.response?.data?.message || 'Save failed', 'error');
    }
    setTlSaving(prev => ({ ...prev, [k]: false }));
  };

  const saveAllTimeLocks = async () => {
    setSavingAll(true);
    try {
      const locks = ALL_DEPT_SHIFTS.map(({ dept, shift }) => {
        const k = `${dept}-${shift}`;
        const tl = timeLocks[k] || { startTime: '06:00', endTime: '23:00', enabled: false };
        return { dept, shift, startTime: tl.startTime, endTime: tl.endTime, enabled: tl.enabled };
      });
      await axios.post(`${API}/api/timelock`, { locks });
      showNotify('All time locks saved successfully', 'success');
      fetchTimeLocks();
    } catch (err) {
      showNotify(err.response?.data?.message || 'Save all failed', 'error');
    }
    setSavingAll(false);
  };

  // Login log fetch
  const fetchLoginLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await axios.get(`${API}/api/loginlog`);
      setLoginLogs(res.data || []);
    } catch {}
    setLogsLoading(false);
  }, []);

  useEffect(() => {
    if (showTimeLock && Object.keys(timeLocks).length === 0) fetchTimeLocks();
  }, [showTimeLock, timeLocks, fetchTimeLocks]);

  useEffect(() => {
    if (showLoginLog) fetchLoginLogs();
  }, [showLoginLog, fetchLoginLogs]);

  const handleLocalChange = (id, field, value) => {
    setEditData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleRowSave = async (id, name) => {
    const raw = editData[id];
    if (!raw) { showNotify('No changes to save', 'error'); return; }
    const updates = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ''));
    try {
      const res = await axios.put(`${API}/api/users/update/${id}`, updates);
      if (res.data.success) {
        showNotify(`${name} updated!`, 'success');
        setEditData(prev => { const s = { ...prev }; delete s[id]; return s; });
        fetchAll();
      }
    } catch (err) {
      showNotify(err.response?.data?.message || 'Update failed', 'error');
    }
  };

  const handleDeleteClick = (userId, userName) =>
    setDeleteModal({ open: true, userId, userName });

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`${API}/api/users/delete/${deleteModal.userId}`);
      showNotify(`${deleteModal.userName} removed`, 'success');
      setDeleteModal({ open: false, userId: null, userName: '' });
      fetchAll();
    } catch (err) {
      showNotify(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const openModal = (title, role) => {
    setFormData({
      name: '', dob: '', employeeId: '', gmail: '', password: '',
      hodDept: ALL_DEPARTMENTS[0]?.key || '',
      selectedDepts: [], selectedShifts: [],
    });
    setModalConfig({ isOpen: true, title, role });
  };

  const handleCreateUser = async () => {
    const { role } = modalConfig;
    const department =
      role === 'hod'        ? formData.hodDept || 'NONE'
      : role === 'supervisor' ? arrToStr(formData.selectedDepts)
      : 'NONE';
    const shift = role === 'supervisor' ? arrToStr(formData.selectedShifts) : 'NONE';

    try {
      await axios.post(`${API}/api/users/register`, {
        name: formData.name, dob: formData.dob,
        employeeId: formData.employeeId, gmail: formData.gmail,
        password: formData.password, role, department, shift,
      });
      showNotify(`${role.toUpperCase()} registered successfully!`, 'success');
      setModalConfig({ ...modalConfig, isOpen: false });
      fetchAll();
    } catch (err) {
      showNotify('Error: ' + (err.response?.data?.message || 'Internal Server Error'), 'error');
    }
  };

  const inputCls = 'w-full py-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold';

  return (
    <div className="min-h-screen bg-emerald-50/30 p-4 md:p-8 lg:p-12">

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white ${
          notification.type === 'error' ? 'bg-red-600' : 'bg-emerald-900'
        }`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <header className="mb-10 border-b border-emerald-100 pb-6">
          <h1 className="text-3xl md:text-4xl font-black text-emerald-900 tracking-tighter uppercase">Administration</h1>
          <p className="text-emerald-600 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs">PivotPath Management Portal</p>
        </header>

        {/* Register cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12">
          <AdminCard title="Manage HODs"  desc="Single department oversight access"  icon={<ShieldCheck size={28}/>} color="bg-emerald-700" onClick={() => openModal('Register HOD', 'hod')} />
          <AdminCard title="Supervisors"  desc="Multi-shift & department tracking"   icon={<UserPlus size={28}/>}   color="bg-emerald-900" onClick={() => openModal('Register Supervisor', 'supervisor')} />
          <AdminCard title="Employees"    desc="General staff — view only access"    icon={<Users size={28}/>}      color="bg-green-500"   onClick={() => openModal('Register Employee', 'employee')} />
          <AdminCard title="Time Lock"    desc="Configure save windows per dept/shift" icon={<Timer size={28}/>}   color="bg-amber-600"   onClick={() => setShowTimeLock(o => !o)} />
          <AdminCard title="Login Logs"   desc="View user login & logout activity"   icon={<LogIn size={28}/>}    color="bg-slate-700"   onClick={() => setShowLoginLog(o => !o)} />
        </div>

        {/* Time Lock Management Panel */}
        {showTimeLock && (
          <div className="bg-white rounded-[2rem] shadow-xl border border-amber-100 overflow-hidden mb-8">
            <div className="bg-amber-600 p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2"><Timer size={16}/> Time Lock Management</h3>
              <div className="flex items-center gap-2">
                <button onClick={saveAllTimeLocks} disabled={savingAll}
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-60 px-4 py-2 text-[11px] font-black uppercase rounded-full tracking-[0.18em] transition-all">
                  {savingAll ? 'Saving all…' : 'Save all'}
                </button>
                <button onClick={() => setShowTimeLock(false)} className="hover:bg-amber-500 p-1 rounded-lg transition-colors"><X size={18}/></button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-amber-50 text-amber-900 text-[10px] font-black uppercase tracking-widest border-b border-amber-100">
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Shift</th>
                    <th className="px-5 py-3">Enabled</th>
                    <th className="px-5 py-3">Start Time</th>
                    <th className="px-5 py-3">End Time</th>
                    <th className="px-5 py-3 text-center">Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50">
                  {ALL_DEPT_SHIFTS.map(({ dept, deptName, shift }) => {
                    const k = `${dept}-${shift}`;
                    const tl = timeLocks[k] || { startTime: '06:00', endTime: '23:00', enabled: false };
                    return (
                      <tr key={k} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-5 py-2.5 font-bold text-slate-700">{deptName}</td>
                        <td className="px-5 py-2.5 font-black text-slate-500">Shift {shift}</td>
                        <td className="px-5 py-2.5">
                          <button
                            onClick={() => setTimeLocks(prev => ({ ...prev, [k]: { ...tl, enabled: !tl.enabled } }))}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${tl.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {tl.enabled ? 'ON' : 'OFF'}
                          </button>
                        </td>
                        <td className="px-5 py-2.5">
                          <input type="time" value={tl.startTime}
                            onChange={e => setTimeLocks(prev => ({ ...prev, [k]: { ...tl, startTime: e.target.value } }))}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-amber-400" />
                        </td>
                        <td className="px-5 py-2.5">
                          <input type="time" value={tl.endTime}
                            onChange={e => setTimeLocks(prev => ({ ...prev, [k]: { ...tl, endTime: e.target.value } }))}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-amber-400" />
                        </td>
                        <td className="px-5 py-2.5 text-center">
                          <button onClick={() => saveSingleTimeLock(dept, shift)} disabled={tlSaving[k]}
                            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white p-2 rounded-lg transition-all flex items-center justify-center mx-auto">
                            <Save size={14}/>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Login Log Panel */}
        {showLoginLog && (
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden mb-8">
            <div className="bg-slate-700 p-5 text-white flex justify-between items-center">
              <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2"><LogIn size={16}/> Login / Logout Logs</h3>
              <div className="flex items-center gap-2">
                <button onClick={fetchLoginLogs} className="text-[10px] font-black bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded-lg transition-all">Refresh</button>
                <button onClick={() => setShowLoginLog(false)} className="hover:bg-slate-600 p-1 rounded-lg transition-colors"><X size={18}/></button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Emp ID</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Dept</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logsLoading ? (
                    <tr><td colSpan={6} className="py-10 text-center text-slate-300 font-bold uppercase animate-pulse">Loading...</td></tr>
                  ) : loginLogs.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-slate-300 font-bold uppercase">No logs found</td></tr>
                  ) : loginLogs.slice(0, 100).map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-5 py-2.5 font-black text-slate-700 uppercase">{log.empId || '—'}</td>
                      <td className="px-5 py-2.5 font-semibold text-slate-700">{log.empName || log.userId || '—'}</td>
                      <td className="px-5 py-2.5 font-bold text-slate-500 uppercase">{log.role || '—'}</td>
                      <td className="px-5 py-2.5 font-bold text-slate-500 uppercase">{log.dept || '—'}</td>
                      <td className="px-5 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${log.action === 'login' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                          {log.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tables */}
        <UserTable title="Active HODs"        count={hods.length}        users={hods}        roleType="hod"        loading={loading} editData={editData} onLocalChange={handleLocalChange} onSave={handleRowSave} onDeleteClick={handleDeleteClick} />
        <UserTable title="Active Supervisors" count={supervisors.length} users={supervisors} roleType="supervisor" loading={loading} editData={editData} onLocalChange={handleLocalChange} onSave={handleRowSave} onDeleteClick={handleDeleteClick} />
        <UserTable title="Active Employees"   count={employees.length}   users={employees}   roleType="employee"   loading={loading} editData={editData} onLocalChange={handleLocalChange} onSave={handleRowSave} onDeleteClick={handleDeleteClick} />
      </div>

      {/* Register Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-900 p-6 flex justify-between items-center text-white shrink-0">
              <h3 className="text-lg font-black uppercase tracking-widest">{modalConfig.title}</h3>
              <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="hover:bg-emerald-800 p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-4">
              {/* Name */}
              <div className="relative">
                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none" size={20} />
                <input required type="text" placeholder="Full Name" value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  style={{ paddingLeft: '50px' }} className={inputCls} />
              </div>

              {/* DOB + Emp ID */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none" size={20} />
                  <input required type="date" value={formData.dob}
                    onChange={e => setFormData(p => ({ ...p, dob: e.target.value }))}
                    style={{ paddingLeft: '50px' }} className={inputCls} />
                </div>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none" size={20} />
                  <input required type="text" placeholder="Emp ID" value={formData.employeeId}
                    onChange={e => setFormData(p => ({ ...p, employeeId: e.target.value }))}
                    style={{ paddingLeft: '50px' }} className={`${inputCls} uppercase`} />
                </div>
              </div>

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none" size={20} />
                <input required type="email" placeholder="Email Address" value={formData.gmail}
                  onChange={e => setFormData(p => ({ ...p, gmail: e.target.value }))}
                  style={{ paddingLeft: '50px' }} className={inputCls} />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none" size={20} />
                <input required type="password" placeholder="Set Password" value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  style={{ paddingLeft: '50px' }} className={inputCls} />
              </div>

              {/* HOD — single dept select */}
              {modalConfig.role === 'hod' && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-emerald-600" />
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Department</span>
                  </div>
                  <select
                    value={formData.hodDept}
                    onChange={e => setFormData(p => ({ ...p, hodDept: e.target.value }))}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-3 text-sm font-semibold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {ALL_DEPARTMENTS.map(d => (
                      <option key={d.key} value={d.key}>{d.short} — {d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Supervisor — multi-shift + multi-dept */}
              {modalConfig.role === 'supervisor' && (
                <>
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-emerald-600" />
                      <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Shift Assignment</span>
                    </div>
                    <div className="flex gap-2">
                      {SHIFTS.map(s => (
                        <button key={s} type="button"
                          onClick={() => setFormData(p => ({ ...p, selectedShifts: toggleItem(p.selectedShifts, s) }))}
                          className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${
                            formData.selectedShifts.includes(s)
                              ? 'bg-emerald-700 text-white shadow-md'
                              : 'bg-white text-emerald-300 border border-emerald-200 hover:text-emerald-600'
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-emerald-600" />
                      <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Department(s)</span>
                    </div>
<div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {LOCAL_ALL_DEPARTMENTS.map(dept => (
                        <label key={dept.key}
                          onClick={() => setFormData(p => ({ ...p, selectedDepts: toggleItem(p.selectedDepts, dept.key) }))}
                          className="flex items-center gap-3 cursor-pointer group py-1">
                          <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            formData.selectedDepts.includes(dept.key)
                              ? 'bg-emerald-600 border-emerald-600'
                              : 'border-emerald-300 group-hover:border-emerald-500'
                          }`}>
                            {formData.selectedDepts.includes(dept.key) && <span className="text-white text-[10px] font-black">✓</span>}
                          </span>
                          <span className="text-xs font-semibold text-emerald-800 leading-tight">{dept.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button onClick={handleCreateUser}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all shadow-lg active:scale-95">
                Confirm Registration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Trash2 size={28} className="text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Confirm Delete</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Are you sure you want to remove{' '}
              <span className="font-black text-slate-900">{deleteModal.userName}</span>?
              <br />
              <span className="text-[11px] text-rose-400 font-semibold">This action cannot be undone.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, userId: null, userName: '' })}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-rose-200">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
