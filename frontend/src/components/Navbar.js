import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { UserCircle, LogOut, LayoutDashboard, Settings2, Monitor, Activity, Home, Globe, ChevronDown, Menu, Calendar, Clock, Users, Loader2, X, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import logo from '../assest/pivotPathLogo.svg';
import { MODULES } from '../departments';

const API = process.env.REACT_APP_API_URL ||
  ((window.location.port && window.location.port !== '5000')
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : window.location.origin);

const DEPT_SHORT = { fg: 'FG Warehouse', pm: 'PM Warehouse', rm: 'RM Warehouse' };
const MODULE_LABEL = { q: 'Quality', d: 'Delivery', s: 'Safety', h: 'Health' };

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('userInfo'));
  const { t, i18n } = useTranslation();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);

  // AI Assistant / Presentation Mode State
  const [showWizard, setShowWizard] = useState(false);
  const [duration, setDuration] = useState(() => Number(localStorage.getItem('kioskDuration')) || 30);
  const [timeSlot, setTimeSlot] = useState("10:30");
  const [timeAmPm, setTimeAmPm] = useState("AM");
  const [meetingDate, setMeetingDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [attendees, setAttendees] = useState(3);
  const [isRotating, setIsRotating] = useState(() => localStorage.getItem('kioskActive') === 'true');
  // eslint-disable-next-line no-unused-vars
  const [currentRotationIndex, setCurrentRotationIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(() => Number(localStorage.getItem('kioskDuration')) || 30);
  const [schedulingMeet, setSchedulingMeet] = useState(false);
  const [isCurrentPageLoading, setIsCurrentPageLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // New checkboxes / meet links configuration state
  const [includeMeet, setIncludeMeet] = useState(true);
  const [enableAIAssistant, setEnableAIAssistant] = useState(() => localStorage.getItem('enableAIAssistant') !== 'false');
  const [meetLink, setMeetLink] = useState(localStorage.getItem('meetLink') || '');

  useEffect(() => {
    if (!isRotating) {
      setIsCurrentPageLoading(false);
      localStorage.setItem('kioskActive', 'false');
      localStorage.removeItem('meetScheduled');
      localStorage.removeItem('meetLink');
      setMeetLink('');
      window.dispatchEvent(new Event('kioskStateChange'));
      return;
    }

    const interval = setInterval(() => {
      // Smart loading detection in active content
      const spinners = document.querySelectorAll('.animate-spin, [class*="animate-spin"]');
      let loadingFound = false;

      if (spinners.length > 0) {
        const contentSpinners = Array.from(spinners).filter(el => {
          return !el.closest('nav') && !el.closest('.superadmin-chatbot');
        });
        if (contentSpinners.length > 0) {
          loadingFound = true;
        }
      }

      const bodyText = document.body.innerText || '';
      if (
        bodyText.includes('Syncing...') ||
        bodyText.includes('regression calculations...') ||
        bodyText.includes('Loading...') ||
        bodyText.includes('Fetching...')
      ) {
        loadingFound = true;
      }

      setIsCurrentPageLoading(loadingFound);

      if (loadingFound || isPaused) {
        // Freeze countdown timer
        return;
      }

      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRotating, isPaused]);

  useEffect(() => {
    if (!isRotating) return;

    if (secondsRemaining <= 0) {
      const routes = ['/', '/forecast', '/plant-dashboard', '/monitor'];
      const currentIdx = routes.indexOf(location.pathname);
      let nextIdx = 0;
      if (currentIdx !== -1) {
        nextIdx = (currentIdx + 1) % routes.length;
      }
      setSecondsRemaining(duration);
      navigate(routes[nextIdx]);
    }
  }, [secondsRemaining, isRotating, duration, navigate, location.pathname]);

  useEffect(() => {
    const handlePauseEvent = (e) => {
      setIsPaused(e.detail === true);
    };
    window.addEventListener('kioskPauseToggle', handlePauseEvent);
    return () => window.removeEventListener('kioskPauseToggle', handlePauseEvent);
  }, []);

  useEffect(() => {
    const handleExitEvent = () => {
      setIsRotating(false);
    };
    window.addEventListener('kioskExitEvent', handleExitEvent);
    return () => window.removeEventListener('kioskExitEvent', handleExitEvent);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('kioskSecondsTick', { detail: secondsRemaining }));
  }, [secondsRemaining]);

  const handleStartPresentation = async (e) => {
    e.preventDefault();

    if (includeMeet) {
      setSchedulingMeet(true);
      try {
        const timeString = `${timeSlot} ${timeAmPm}`;
        const res = await axios.post(`${API}/api/admin/schedule-meet`, {
          date: meetingDate,
          timeSlot: timeString,
          attendeeCount: Number(attendees)
        });

        if (res.data.status === 'success') {
          localStorage.setItem('meetScheduled', 'true');
          localStorage.setItem('meetLink', res.data.meetLink);
          setMeetLink(res.data.meetLink);
        }
      } catch (err) {
        alert(`Meeting scheduling failed: ${err.response?.data?.error || err.message}`);
        setSchedulingMeet(false);
        return;
      } finally {
        setSchedulingMeet(false);
      }
    } else {
      localStorage.removeItem('meetScheduled');
      localStorage.removeItem('meetLink');
      setMeetLink('');
    }

    // Start slideshow
    localStorage.setItem('kioskActive', 'true');
    localStorage.setItem('enableAIAssistant', enableAIAssistant ? 'true' : 'false');
    localStorage.setItem('kioskDuration', duration.toString());
    window.dispatchEvent(new Event('kioskStateChange'));

    setIsRotating(true);
    setCurrentRotationIndex(0);
    setSecondsRemaining(duration);
    navigate('/'); // Start from Home page
    setShowWizard(false);
  };

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
  let currentDept = null;
  let currentShift = null;
  let currentModule = null;

  if (pathParts[0] === 'shift' && pathParts.length >= 4) {
    currentShift = pathParts[1];
    currentDept = pathParts[2];
    currentModule = pathParts[3];
  } else if (pathParts.length === 2) {
    currentDept = pathParts[0];
    currentModule = pathParts[1];
  }

  const moduleStyles = {
    q: {
      active: 'bg-emerald-600 text-white shadow-sm font-black scale-105'
    },
    d: {
      active: 'bg-blue-600 text-white shadow-sm font-black scale-105'
    },
    s: {
      active: 'bg-orange-500 text-white shadow-sm font-black scale-105'
    },
    h: {
      active: 'bg-rose-500 text-white shadow-sm font-black scale-105'
    }
  };

  const handleModuleSwitch = (targetModule) => {
    if (currentDept && currentModule) {
      const targetShift = currentShift || 'overall';
      navigate(`/shift/${targetShift}/${currentDept}/${targetModule}`);
    } else if (currentDept && !currentShift) {
      navigate(`/${currentDept}/${targetModule}`);
    } else if (location.pathname.startsWith('/portal/pillar/')) {
      navigate(`/portal/pillar/${targetModule}`);
    } else {
      navigate(`/portal/pillar/${targetModule}`);
    }
  };

  const handleLogout = () => {
    // Log the logout event (excluding superadmin)
    if (user && user.role !== 'superadmin') {
      fetch(`${API}/api/loginlog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id || '',
          empId: user.employeeId || '',
          empName: user.name || '',
          role: user.role || '',
          dept: user.department || '',
          action: 'logout',
        }),
      }).catch(() => { });
    }
    localStorage.removeItem('userInfo');
    window.dispatchEvent(new Event("storage"));
    navigate('/login');
  };

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition duration-200 border ${isActive
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50 shadow-xs'
      : 'bg-white text-slate-655 hover:text-slate-900 border-slate-200/60 hover:bg-slate-50'
      }`;
  };

  if (isRotating) {
    return null;
  }

  return (
    <nav className="flex justify-between items-center px-6 py-2.5 bg-white shadow-sm border-b sticky top-0 z-50 h-[64px]">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition pointer-events-auto">
          <img src={logo} alt="PivotPath Logo" className={`h-12 w-auto transition-all ${isRotating ? 'filter brightness-0 invert' : ''}`} />
          {!isRotating && <span className="text-lg font-bold text-slate-800 hidden sm:block">{t('navbar.dailyHuddles')}</span>}
        </Link>

        {/* Breadcrumb context: dept → shift → module */}
        {!isRotating && currentDept && (
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

      {/* Quick Department Switcher */}
      {user && !isRotating && currentDept && currentModule && (
        <div className="flex items-center gap-1 bg-slate-100/50 p-0.5 rounded-full border border-slate-200/50 select-none shrink-0 sm:mx-3">
          {['q', 'd', 's', 'h'].map((modKey) => {
            const mod = MODULES.find(m => m.key === modKey);
            const isActive = currentModule === modKey || (location.pathname.startsWith('/portal/pillar/') && location.pathname.endsWith('/' + modKey));
            const style = moduleStyles[modKey];

            return (
              <button
                key={modKey}
                title={t('modules.' + modKey, mod?.label || modKey.toUpperCase())}
                onClick={() => handleModuleSwitch(modKey)}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black tracking-normal transition-all duration-300 transform hover:scale-115 active:scale-90 cursor-pointer select-none ${isActive
                  ? style.active
                  : 'bg-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
              >
                {modKey.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}

      {!isRotating ? (
        <div className="flex items-center gap-2.5">

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
                      className={`flex items-center justify-between w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 transition-colors ${i18n.language === lang.code ? 'text-emerald-700 bg-emerald-50/50' : 'text-slate-655 hover:text-slate-900'
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

              {/* Error Forecasting in the main navbar, placed after admin button */}
              <Link to="/forecast" className={getLinkClass('/forecast')}>
                <Activity size={14} /> <span className="hidden sm:inline">{t('navbar.errorForecast')}</span>
              </Link>

              {/* FDA Defence Link */}
              <Link to="/fda-defence" className={getLinkClass('/fda-defence')}>
                <ShieldAlert size={14} className="text-orange-500" /> <span className="hidden sm:inline">FDA Defence</span>
              </Link>

              {/* AI Assistant / Presentation Mode Button */}
              {user.role === 'superadmin' && (
                <button
                  onClick={() => {
                    if (isRotating) {
                      setIsRotating(false);
                    } else {
                      setShowWizard(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition duration-200 border ${isRotating
                    ? 'bg-red-50 text-red-700 border-red-200/50 shadow-xs animate-pulse font-extrabold'
                    : 'bg-emerald-500 text-white border-transparent hover:bg-emerald-600 shadow-md hover:scale-102 active:scale-98 font-extrabold'
                    }`}
                >
                  <Monitor size={14} />
                  <span>{isRotating ? 'Stop Slideshow' : 'AI Assistant / Kiosk'}</span>
                </button>
              )}

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

                      <Link to="/fda-defence" onClick={() => setMenuDropdownOpen(false)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                        <ShieldAlert size={14} className="text-orange-500" /> FDA Defence
                      </Link>

                      {user.role === 'hod' && (
                        <Link to="/hod-dashboard" onClick={() => setMenuDropdownOpen(false)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                          <Settings2 size={14} className="text-emerald-600" /> {t('navbar.supervisors')}
                        </Link>
                      )}

                      {user.role === 'superadmin' && (
                        <Link to="/admin" onClick={() => setMenuDropdownOpen(false)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                          <LayoutDashboard size={14} className="text-emerald-600" /> {t('navbar.admin')}
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
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition pointer-events-auto"
            >
              <UserCircle size={18} />
              <span className="font-medium text-sm">{t('navbar.login')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-4 pointer-events-auto text-white text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2 bg-slate-950/40 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <span className="relative flex h-2.5 w-2.5 mr-1">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCurrentPageLoading ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isCurrentPageLoading ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            </span>
            <span className={`${isCurrentPageLoading ? 'text-amber-400' : 'text-emerald-400'} font-extrabold text-[10px]`}>
              {isCurrentPageLoading ? 'AI Kiosk: Loading...' : 'AI Kiosk Mode Active'}
            </span>
          </div>

          <div className="h-4 w-px bg-white/20 hidden md:block" />

          {meetLink && (
            <a
              href={meetLink}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-md text-[10px] font-black tracking-normal transition-all flex items-center gap-1 normal-case hover:scale-105"
            >
              🎥 Join Meet
            </a>
          )}

          {isCurrentPageLoading ? (
            <span className="text-amber-300 font-extrabold text-[10px] animate-pulse">
              Timer Paused
            </span>
          ) : (
            <span className="text-[10px] text-slate-300">
              Next slide: <strong className={isPaused ? "text-amber-400 font-black text-xs" : "text-emerald-400 font-black text-xs"}>
                {isPaused ? 'PAUSED' : `${secondsRemaining}s`}
              </strong>
            </span>
          )}

          <button
            onClick={() => setIsRotating(false)}
            className="bg-red-600 hover:bg-red-750 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-md border border-red-500/20"
          >
            Exit Kiosk
          </button>
        </div>
      )}

      {/* AI Assistant Setup Modal Overlay */}
      {showWizard && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowWizard(false)}>
          <div className="bg-white rounded-3xl w-full max-w-[440px] p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col animate-scale-up">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                  <Monitor className="text-white" size={18} />
                </div>
                <div className="text-left">
                  <h2 className="font-black uppercase tracking-widest text-[11px] text-slate-800">
                    AI Assistant Kiosk Setup
                  </h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Configure slideshow & schedule meet</p>
                </div>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleStartPresentation} className="space-y-4">
              {/* Slideshow Duration */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 ml-1 text-left">
                  Slideshow Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-emerald-500 font-bold text-slate-700"
                >
                  <option value={10}>10 Seconds (Fast Review)</option>
                  <option value={30}>30 Seconds (Default)</option>
                  <option value={60}>60 Seconds (Detailed Audit)</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-3.5 text-left border-t border-slate-100 pt-3">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeMeet}
                    onChange={(e) => setIncludeMeet(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-700 uppercase">Include Google Meet Invite</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Auto-create Google calendar event & video link</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableAIAssistant}
                    onChange={(e) => setEnableAIAssistant(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-700 uppercase">Enable AI Assistant / Summary Mode</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Display structured card decks with magical themes</span>
                  </div>
                </label>
              </div>

              {includeMeet && (
                <div className="border-t border-slate-100 my-4 pt-3">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-3 ml-1 text-left">
                    📅 AI Google Meet Scheduling Wizard
                  </span>

                  {/* Date Picker */}
                  <div className="mb-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 ml-1 text-left">
                      Select Time Slot Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 ring-emerald-500 font-bold text-slate-700"
                      />
                      <Calendar size={14} className="text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  {/* Time Slot Picker */}
                  <div className="mb-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 ml-1 text-left">
                      Select Free Meeting Time
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="e.g. 10:30"
                          value={timeSlot}
                          onChange={(e) => setTimeSlot(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 ring-emerald-500 font-bold text-slate-700"
                        />
                        <Clock size={14} className="text-slate-400 absolute left-3.5 top-3.5" />
                      </div>
                      <select
                        value={timeAmPm}
                        onChange={(e) => setTimeAmPm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-emerald-500 font-bold text-slate-700"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  {/* Attendee Count */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 ml-1 text-left">
                      Attendee Count (Persons)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min={2}
                        max={10}
                        value={attendees}
                        onChange={(e) => setAttendees(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 ring-emerald-500 font-bold text-slate-700"
                      />
                      <Users size={14} className="text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium mt-1 ml-1 text-left">
                      Targets HODs of departments with highest active telemetry defects.
                    </p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={schedulingMeet}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all mt-4 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {schedulingMeet ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Scheduling Invitations...</span>
                  </>
                ) : (
                  <span>Launch Kiosk & Schedule</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
