import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { UserCircle, LogOut, LayoutDashboard, Settings2, Monitor, Activity, Home, Globe, ChevronDown, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logo from '../assest/pivotPathLogo.svg';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);

const DEPT_SHORT = { fg: 'FG Warehouse', pm: 'PM Warehouse', rm: 'RM Warehouse' };
const MODULE_LABEL = { q: 'Quality', d: 'Delivery', s: 'Safety', h: 'Health' };

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('userInfo'));
  const { t, i18n } = useTranslation();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'Hindi (हिन्दी)', flag: '🇮🇳' },
    { code: 'ta', label: 'Tamil (தமிழ்)', flag: '🇮🇳' },
    { code: 'mr', label: 'Marathi (मराठी)', flag: '🇮🇳' },
    { code: 'gu', label: 'Gujarati (ગુજરાતી)', flag: '🇮🇳' },
    { code: 'te', label: 'Telugu (తెలుగు)', flag: '🇮🇳' },
    { code: 'kn', label: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' }
  ];

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (code) => {
    i18n.changeLanguage(code);
    setLangDropdownOpen(false);
  };

  // Parse current shift/dept/module from URL
  // URL pattern: /shift/:shift/:dept/:module or /:dept/:module
  const pathParts = location.pathname.split('/').filter(Boolean);
  let currentDept   = null;
  let currentShift  = null;
  let currentModule = null;

  if (pathParts[0] === 'shift' && pathParts.length >= 4) {
    currentShift  = pathParts[1];
    currentDept   = pathParts[2];
    currentModule = pathParts[3];
  } else if (pathParts.length === 2) {
    currentDept   = pathParts[0];
    currentModule = pathParts[1];
  }

  const handleLogout = () => {
    // Log the logout event (excluding superadmin)
    if (user && user.role !== 'superadmin') {
      fetch(`${API}/api/loginlog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:  user._id  || '',
          empId:   user.employeeId || '',
          empName: user.name || '',
          role:    user.role || '',
          dept:    user.department || '',
          action:  'logout',
        }),
      }).catch(() => {});
    }
    localStorage.removeItem('userInfo');
    window.dispatchEvent(new Event("storage"));
    navigate('/login');
  };

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition duration-200 border ${
      isActive 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50 shadow-xs' 
        : 'bg-white text-slate-655 hover:text-slate-900 border-slate-200/60 hover:bg-slate-50'
    }`;
  };

  return (
    <nav className="flex justify-between items-center px-6 py-3 bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <img src={logo} alt="PivotPath Logo" className="h-16 w-auto" />
          <span className="text-lg font-bold text-slate-800 hidden sm:block">{t('navbar.dailyHuddles')}</span>
        </Link>

        {/* Breadcrumb context: dept → shift → module */}
        {currentDept && (
          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span className="text-slate-300">/</span>
            <button onClick={() => navigate('/')} className="hover:text-slate-600 transition">{DEPT_SHORT[currentDept] || currentDept.toUpperCase()}</button>
            {currentModule && (
              <>
                <span className="text-slate-300">/</span>
                <span className="text-slate-600">{MODULE_LABEL[currentModule] || currentModule.toUpperCase()}</span>
              </>
            )}
            {currentShift && (
              <>
                <span className="text-slate-300">/</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                  {currentShift === 'overall' ? t('navbar.overall') : t('navbar.shiftNum', { num: currentShift })}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {/* Shift selector (contextual) */}
        {user && currentDept && currentModule && (
          <div className="flex items-center gap-2 pr-1.5">
            <select
              value={currentShift || 'overall'}
              onChange={(e) => navigate(`/shift/${e.target.value}/${currentDept}/${currentModule}`)}
              className="bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider rounded-xl px-2.5 py-1.5 outline-none"
            >
              <option value="overall">{t('navbar.overall')}</option>
              <option value="1">{t('navbar.shiftNum', { num: 1 })}</option>
              <option value="2">{t('navbar.shiftNum', { num: 2 })}</option>
              <option value="3">{t('navbar.shiftNum', { num: 3 })}</option>
            </select>
          </div>
        )}

        {/* Language Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition duration-200 border bg-white text-slate-655 hover:text-slate-900 border-slate-200/60 hover:bg-slate-50 shadow-xs outline-none"
          >
            <Globe size={14} className="text-emerald-600 animate-pulse" />
            <span className="hidden sm:inline">{currentLanguage.flag} {currentLanguage.label}</span>
            <span className="inline sm:hidden">{currentLanguage.flag} {currentLanguage.code.toUpperCase()}</span>
            <ChevronDown size={12} className={`transition-transform duration-200 ${langDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {langDropdownOpen && (
            <>
              {/* Backdrop to close dropdown on click outside */}
              <div 
                className="fixed inset-0 z-[998]" 
                onClick={() => setLangDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-[999] py-1.5 animate-in fade-in duration-100">
                <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-1">
                  Language / भाषा / Idioma
                </div>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex items-center justify-between w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 transition-colors ${
                      i18n.language === lang.code ? 'text-emerald-700 bg-emerald-50/50' : 'text-slate-655 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                    {i18n.language === lang.code && (
                      <span className="w-1.5 h-1.5 bg-emerald-650 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {user ? (
          <>
            {/* Admin button (only directly visible if superadmin) */}
            {user.role === 'superadmin' && (
              <Link to="/admin" className={getLinkClass('/admin')}>
                <LayoutDashboard size={14} /> <span className="hidden sm:inline">{t('navbar.admin')}</span>
              </Link>
            )}

            {/* Error Forecasting in the main navbar, placed after admin button */}
            <Link to="/forecast" className={getLinkClass('/forecast')}>
              <Activity size={14} /> <span className="hidden sm:inline">{t('navbar.errorForecast')}</span>
            </Link>

            {/* Daily Huddles Tracking External Deploy Link */}
            <a 
              href="https://dailyhuddlestracking.onrender.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition duration-200 border bg-white text-slate-655 hover:text-slate-900 border-slate-200/60 hover:bg-slate-50 shadow-xs"
            >
              <Globe size={14} className="text-emerald-650" /> <span className="hidden sm:inline">Daily Huddles Tracking</span>
            </a>

            {/* Menu Dropdown Container */}
            <div className="relative">
              <button
                onClick={() => setMenuDropdownOpen(!menuDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition duration-200 border bg-white text-slate-655 hover:text-slate-900 border-slate-200/60 hover:bg-slate-50 shadow-xs outline-none"
              >
                <Menu size={14} className="text-emerald-600" />
                <span className="hidden sm:inline">{user.name}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${menuDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown on click outside */}
                  <div 
                    className="fixed inset-0 z-[998]" 
                    onClick={() => setMenuDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-[999] py-1.5 animate-in fade-in duration-100">
                    <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-1">
                      {user.role} · {user.name}
                    </div>

                    <Link to="/" onClick={() => setMenuDropdownOpen(false)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                      <Home size={14} className="text-emerald-600" /> {t('navbar.home')}
                    </Link>

                    <Link to="/plant-dashboard" onClick={() => setMenuDropdownOpen(false)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                      <LayoutDashboard size={14} className="text-emerald-600" /> {t('navbar.plantDashboard')}
                    </Link>

                    <Link to="/monitor" onClick={() => setMenuDropdownOpen(false)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                      <Monitor size={14} className="text-emerald-600" /> {t('navbar.qdshiBoard')}
                    </Link>

                    {user.role === 'hod' && (
                      <Link to="/hod-dashboard" onClick={() => setMenuDropdownOpen(false)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                        <Settings2 size={14} className="text-emerald-600" /> {t('navbar.supervisors')}
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setMenuDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-red-650 hover:text-red-900 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} /> {t('navbar.logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition"
          >
            <UserCircle size={18} />
            <span className="font-medium text-sm">{t('navbar.login')}</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
