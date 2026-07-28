import React, { useState, useEffect, useMemo, useRef } from 'react';
import './QDSHIMonitor.css';
import { Search, ChevronDown, CheckCircle, Clock, AlertTriangle, Battery, Shield, Info, Activity, Maximize2, Minimize2, Lock, Unlock } from 'lucide-react';
import axios from 'axios';
import logo from '../assest/pivotPathLogo.svg';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);

// Concentric Donut showing Shift 1, Shift 2, Shift 3 overall metrics
const ConcentricShiftsDonut = ({ s1, s2, s3 }) => {
    // All coordinates designed for viewBox="0 0 260 150"
    // center of rings at (75, 75), outer ring radius 58
    const cx = 75, cy = 75;

    const totalSuccessAll = s1.totalSuccess + s2.totalSuccess + s3.totalSuccess;
    const totalAlertsAll = s1.totalAlerts + s2.totalAlerts + s3.totalAlerts;
    const grandTotalAll = totalSuccessAll + totalAlertsAll;
    const overallPercentAll = grandTotalAll ? Math.round((totalSuccessAll / grandTotalAll) * 100) : 0;

    const getSuccessColor = (stats) => (stats.total === 0 || stats.successPercent === 0) ? "#94a3b8" : "#16a34a";
    const getAlertColor   = (stats) => (stats.total === 0 || stats.alertPercent === 0)   ? "#94a3b8" : "#dc2626";

    const renderRing = (radius, sw, stats, key) => {
        const circ = 2 * Math.PI * radius;
        const hasData = stats.total > 0;
        const sOff = circ * (1 - stats.successPercent / 100);
        const aOff = circ * (1 - stats.alertPercent / 100);
        const rot  = -90 + (360 * stats.successPercent / 100);
        return (
            <g key={key}>
                <circle cx={cx} cy={cy} r={radius} stroke="#e8edf2" strokeWidth={sw} fill="none" />
                {hasData ? (<>
                    <circle cx={cx} cy={cy} r={radius} stroke="#22c55e" strokeWidth={sw} fill="none"
                        strokeDasharray={circ} strokeDashoffset={sOff} strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`} />
                    <circle cx={cx} cy={cy} r={radius} stroke="#ef4444" strokeWidth={sw} fill="none"
                        strokeDasharray={circ} strokeDashoffset={aOff} strokeLinecap="round"
                        transform={`rotate(${rot} ${cx} ${cy})`} />
                </>) : (
                    <circle cx={cx} cy={cy} r={radius} stroke="#cbd5e1" strokeWidth={sw} fill="none" />
                )}
            </g>
        );
    };

    // Labels start at x=148 (cx+58+14 gap), three rows at y=38, y=75, y=118
    const lx = cx + 58 + 14; // 147
    const rows = [
        { y: 38,  stats: s1, label: 'S1' },
        { y: 75,  stats: s2, label: 'S2' },
        { y: 118, stats: s3, label: 'S3' },
    ];

    return (
        <div className="flex items-center justify-center bg-white/95 rounded-2xl shadow-md border border-slate-200 w-full" style={{ padding: '4px 6px' }}>
            <svg viewBox="0 0 268 150" className="w-full h-auto" style={{ overflow: 'visible', display: 'block' }}>
                {/* Rings */}
                {renderRing(58, 10, s1, 'r1')}
                {renderRing(44, 10, s2, 'r2')}
                {renderRing(30, 10, s3, 'r3')}

                {/* Center */}
                <circle cx={cx} cy={cy} r={22} fill="#fff" stroke="#e2e8f0" strokeWidth="1.5" />
                <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="900" fill="#0f172a">{overallPercentAll}%</text>
                <text x={cx} y={cy + 10} textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#64748b" letterSpacing="0.8">OVERALL</text>

                {/* Pointers */}
                <path d={`M ${cx+57} 38 L ${lx-6} 38`} stroke="#94a3b8" strokeWidth="1.2" fill="none"/>
                <circle cx={cx+57} cy={38} r="1.8" fill="#94a3b8"/>

                <path d={`M ${cx+58} ${cy} L ${lx-6} ${cy}`} stroke="#94a3b8" strokeWidth="1.2" fill="none"/>
                <circle cx={cx+58} cy={cy} r="1.8" fill="#94a3b8"/>

                <path d={`M ${cx+35} ${cy+36} L ${cx+50} 118 L ${lx-6} 118`} stroke="#94a3b8" strokeWidth="1.2" fill="none"/>
                <circle cx={cx+35} cy={cy+36} r="1.8" fill="#94a3b8"/>

                {/* Label rows */}
                {rows.map(({ y, stats, label }) => (
                    <g key={label}>
                        <text x={lx}    y={y} alignmentBaseline="middle" fontSize="10" fontWeight="900" fill="#334155">{label}:</text>
                        <text x={lx+18} y={y} alignmentBaseline="middle" fontSize="11" fontWeight="900" fill={getSuccessColor(stats)}>{stats.successPercent}%</text>
                        <text x={lx+46} y={y} alignmentBaseline="middle" fontSize="10" fill="#94a3b8">/</text>
                        <text x={lx+53} y={y} alignmentBaseline="middle" fontSize="11" fontWeight="900" fill={getAlertColor(stats)}>{stats.alertPercent}%</text>
                    </g>
                ))}
            </svg>
        </div>
    );
};



// Reusable Circle Component
const DailyCircle = ({ letter, selectedMonthIdx, selectedYear, colors }) => {
    const numDots = new Date(selectedYear, selectedMonthIdx + 1, 0).getDate();
    const center = 75;
    const dotRadius = 62;

    const dots = Array.from({ length: numDots }).map((_, i) => {
        const angle = (i / numDots) * 2 * Math.PI - Math.PI / 2;
        const cx = center + dotRadius * Math.cos(angle);
        const cy = center + dotRadius * Math.sin(angle);
        
        const fill = colors && colors[i] ? colors[i] : '#222';
        
        return (
            <circle key={i} cx={cx} cy={cy} r={3.5} fill={fill} stroke="#555" strokeWidth="1" />
        );
    });

    return (
        <div className="flex justify-center items-center mb-2 relative z-10 transition-all duration-300 hover:scale-105 hover:z-20">
            <div className="bg-white/40 backdrop-blur-xs rounded-full p-1.5 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.15)] border border-white/60">
                <svg width="150" height="150" style={{ overflow: 'visible' }}>
                    <circle cx={center} cy={center} r={48} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2.5" />
                    <circle cx={center} cy={center} r={55} fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 3" />
                    <text x={center} y={center + 1} textAnchor="middle" dy=".35em" fontSize="58" fontWeight="900" fill="#0f172a">{letter}</text>
                    {dots}
                </svg>
            </div>
        </div>
    );
};

// Reusable Daily Table
const DailyTable = ({ title, metricHeader, subheaders, colorClass, rowsData, formatCell, getCellClass }) => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    return (
        <div className="board-table-wrapper">
            <div className="table-title">{title}</div>
            <table className="border-collapse border border-slate-300 w-full board-table text-[8.5px]">
                <thead>
                    <tr className={colorClass}>
                        <th rowSpan="2" className="text-center align-middle" style={{width: '28px'}}>Date</th>
                        <th colSpan={subheaders.length} className="text-center">{metricHeader}</th>
                    </tr>
                    <tr className={colorClass}>
                        {subheaders.map((sh, i) => <th key={i} className="text-center">{sh}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {days.map((day, dIdx) => (
                        <tr key={day}>
                            <td className="text-center font-bold text-slate-500">{day}</td>
                            {subheaders.map((_, colIdx) => (
                                <td key={colIdx} className={`text-center font-medium ${getCellClass ? getCellClass(rowsData[dIdx], colIdx) : ''}`}>
                                    {formatCell(rowsData[dIdx], colIdx)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Reusable Issues Table
const IssuesTable = ({ issues }) => {
    const rows = Array.from({ length: 11 }, (_, i) => issues[i] || { date: '', challenge: '', owner: '' });
    return (
        <div className="board-table-wrapper">
            <div className="table-title uppercase" style={{color: '#666'}}>Challenge Board</div>
            <table className="border-collapse border border-slate-300 w-full board-table text-[8.5px]">
                <thead>
                    <tr className="bg-slate-100">
                        <th className="text-center" style={{width: '20%'}}>Time</th>
                        <th className="text-center" style={{width: '50%'}}>Challenge faced</th>
                        <th className="text-center" style={{width: '30%'}}>To be actioned by</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            <td className="text-center">{r.date || '\u00A0'}</td>
                            <td className="truncate max-w-[50px]">{r.owner}</td>
                            <td className="truncate max-w-[80px]" title={r.challenge}>{r.challenge}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Reusable Action Tracker Table
const ActionTable = ({ actions }) => {
    const rows = Array.from({ length: 8 }, (_, i) => actions[i] || { date: '', action: '', owner: '', target: '', status: '' });
    return (
        <div className="board-table-wrapper">
            <div className="table-title uppercase" style={{color: '#666'}}>Action Tracker Details</div>
            <table className="border-collapse border border-slate-300 w-full board-table text-[8.5px]">
                <thead>
                    <tr className="bg-slate-100">
                        <th className="text-center" style={{width: '15%'}}>Time</th>
                        <th className="text-center" style={{width: '45%'}}>Action</th>
                        <th className="text-center" style={{width: '25%'}}>Owner</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            <td className="text-center">{r.date || '\u00A0'}</td>                    
                            <td className="truncate max-w-[30px]">{r.owner}</td>
                            <td className="truncate max-w-[70px]" title={r.action}>{r.action}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const parseRawDate = (rawDate) => {
    if (!rawDate) return null;
    const parts = rawDate.split('-');
    if (parts.length !== 3) return null;
    return {
        year: Number(parts[0]),
        monthIdx: Number(parts[1]) - 1,
        date: Number(parts[2])
    };
};

export default function QDSHIMonitor() {
    const [dept, setDept] = useState('pop');
    const [selectedDateStr, setSelectedDateStr] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [metrics, setMetrics] = useState([]);
    const [healthData, setHealthData] = useState([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const boardRef = useRef(null);
    
    const DEPT_MAP = {
        'fgmw': 'FG Warehouse', 'pmw': 'PM Warehouse', 'rmw': 'RM Warehouse',
        'ppp': 'Primary Packing', 'pop': 'Post-production', 'qcmad': 'QC Lab',
        'pro': 'Production', 'spp': 'Secondary Packing', 'fac': 'Facilities'
    };

    const dateParts = selectedDateStr.split('-');
    const currentYear = Number(dateParts[0]);
    const currentMonthIdx = Number(dateParts[1]) - 1;
    const MONTHS_MAP = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const currentMonthLong = MONTHS_MAP[currentMonthIdx];

    const [activeCarouselShift, setActiveCarouselShift] = useState('overall');
    const [isHovered, setIsHovered] = useState(false);

    // Watch for native browser window changes (like pressing Esc to leave fullscreen)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            try {
                if (boardRef.current) {
                    await boardRef.current.requestFullscreen();
                }
            } catch (err) {
                console.error(`Error attempting to enable fullscreen layout: ${err.message}`);
            }
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        if (isHovered) return;
        const interval = setInterval(() => {
            setActiveCarouselShift(prev => prev === 'overall' ? '1' : prev === '1' ? '2' : prev === '2' ? '3' : 'overall');
        }, 5000);
        return () => clearInterval(interval);
    }, [isHovered]);

    const fetchData = async () => {
        try {
            const [metricsRes, h1, h2, h3] = await Promise.all([
                fetch(`${API}/api/metrics?dept=${dept}`),
                fetch(`${API}/api/health?month=${currentMonthLong}&year=${currentYear}&dept=${dept}&shift=1`),
                fetch(`${API}/api/health?month=${currentMonthLong}&year=${currentYear}&dept=${dept}&shift=2`),
                fetch(`${API}/api/health?month=${currentMonthLong}&year=${currentYear}&dept=${dept}&shift=3`)
            ]);
            
            const metricsJson = await metricsRes.json().catch(() => []);
            const health1 = await h1.json().catch(() => null);
            const health2 = await h2.json().catch(() => null);
            const health3 = await h3.json().catch(() => null);
            
            setMetrics(Array.isArray(metricsJson) ? metricsJson : []);
            setHealthData([health1, health2, health3].filter(Boolean));
            
        } catch (e) {
            console.error("Failed to fetch monitor data", e);
        }
    };
    
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [dept, selectedDateStr]);

    // Derived Data
    const qData = metrics.find(m => m.letter === 'Q') || {};
    const dData = metrics.find(m => m.letter === 'D') || {};
    const sData = metrics.find(m => m.letter === 'S') || {};

    // Q Rows
    const qRows = Array.from({length: 31}, () => (['']));
    const qLogs = [];
    if (activeCarouselShift === 'overall') {
        ['1', '2', '3'].forEach(s => {
            qLogs.push(...(qData.shifts?.[s]?.issueLogs || []));
        });
    } else {
        qLogs.push(...(qData.shifts?.[activeCarouselShift]?.issueLogs || []));
    }
    qLogs.forEach(log => {
        const parsed = parseRawDate(log.rawDate);
        if (parsed && parsed.monthIdx === currentMonthIdx && parsed.year === currentYear) {
            const dayIdx = parsed.date - 1;
            if (dayIdx >= 0 && dayIdx < 31) {
                const currentVal = qRows[dayIdx][0];
                const isDeviation = log.reason !== 'Target Met';
                if (isDeviation) {
                    qRows[dayIdx][0] = log.deviationType === 'Human Error' ? 'HE' : 
                                      log.deviationType === 'Process Error' ? 'PE' : '⚠️';
                } else if (!currentVal || currentVal === '') {
                    qRows[dayIdx][0] = '✅';
                }
            }
        }
    });

    // D Rows
    const dRows = Array.from({length: 31}, () => ({ plan: 0, actual: 0 }));
    const dLogs = [];
    if (activeCarouselShift === 'overall') {
        ['1', '2', '3'].forEach(s => {
            dLogs.push(...(dData.shifts?.[s]?.issueLogs || []));
        });
    } else {
        dLogs.push(...(dData.shifts?.[activeCarouselShift]?.issueLogs || []));
    }
    dLogs.forEach(log => {
        const parsed = parseRawDate(log.rawDate);
        if (parsed && parsed.monthIdx === currentMonthIdx && parsed.year === currentYear) {
            const dayIdx = parsed.date - 1;
            if (dayIdx >= 0 && dayIdx < 31) {
                dRows[dayIdx].plan += Number(log.planned) || 0;
                dRows[dayIdx].actual += Number(log.dispatched) || 0;
            }
        }
    });

    // S Rows
    const sRows = Array.from({length: 31}, () => null);
    const sLogs = [];
    if (activeCarouselShift === 'overall') {
        ['1', '2', '3'].forEach(s => {
            sLogs.push(...(sData.shifts?.[s]?.issueLogs || []));
        });
    } else {
        sLogs.push(...(sData.shifts?.[activeCarouselShift]?.issueLogs || []));
    }
    sLogs.forEach(log => {
        const parsed = parseRawDate(log.rawDate);
        if (parsed && parsed.monthIdx === currentMonthIdx && parsed.year === currentYear) {
            const dayIdx = parsed.date - 1;
            if (dayIdx >= 0 && dayIdx < 31) {
                if (!sRows[dayIdx]) sRows[dayIdx] = { nm: 0, ua: 0, lti: 0 };
                sRows[dayIdx].nm += Number(log.numNearMiss) || 0;
                sRows[dayIdx].ua += Number(log.numUnsafeActs) || 0;
                sRows[dayIdx].lti += Number(log.numSafetyIncidents) || 0;
            }
        }
    });

    // H Rows
    const hRows = Array.from({length: 31}, () => ({ total: 0, absent: 0 }));
    if (activeCarouselShift === 'overall') {
        healthData.forEach(shiftHealth => {
            const days = shiftHealth?.days || [];
            days.forEach(day => {
                const dayIdx = Number(day.date) - 1;
                if (dayIdx >= 0 && dayIdx < 31) {
                    hRows[dayIdx].total += Number(day.totalStrength) || 0;
                    const total = Number(day.totalStrength) || 0;
                    const attendees = day.attendees != null ? Number(day.attendees) : total;
                    hRows[dayIdx].absent += (total - attendees);
                }
            });
        });
    } else {
        const activeHealthRecord = healthData.find(h => String(h.shift) === activeCarouselShift);
        if (activeHealthRecord) {
            const days = activeHealthRecord?.days || [];
            days.forEach(day => {
                const dayIdx = Number(day.date) - 1;
                if (dayIdx >= 0 && dayIdx < 31) {
                    hRows[dayIdx].total += Number(day.totalStrength) || 0;
                    const total = Number(day.totalStrength) || 0;
                    const attendees = day.attendees != null ? Number(day.attendees) : total;
                    hRows[dayIdx].absent += (total - attendees);
                }
            });
        }
    }

    const shiftDisplayName = activeCarouselShift === 'overall' ? 'Overall' : activeCarouselShift === '1' ? 'Shift 1' : activeCarouselShift === '2' ? 'Shift 2' : 'Shift 3';

    const getColors = (rows, type) => {
        const colors = Array(31).fill('#222');
        const today = new Date();
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        rows.forEach((row, idx) => {
            const date = new Date(currentYear, currentMonthIdx, idx + 1);
            if (date > todayDate) return;
            
            let isRed = false;
            let isGreen = false;
            
            if (type === 'Q') {
                const val = row[0];
                if (val === '✅') isGreen = true;
                else if (val === 'HE' || val === 'PE' || val === '⚠️') isRed = true;
            } else if (type === 'D') {
                if (row.plan > 0 || row.actual > 0) {
                    if (row.actual < row.plan) isRed = true;
                    else isGreen = true;
                }
            } else if (type === 'S') {
                if (row) {
                    if (row.nm > 0 || row.ua > 0 || row.lti > 0) isRed = true;
                    else isGreen = true;
                }
            } else if (type === 'H') {
                if (row.total > 0) {
                    if (row.absent > 0) isRed = true;
                    else isGreen = true;
                }
            }
            
            if (isRed) {
                colors[idx] = '#dc3545';
            } else if (isGreen) {
                colors[idx] = '#28a745';
            }
        });
        return colors;
    };

    const getColorsForShift = (shiftVal) => {
        const qRowsLocal = Array.from({length: 31}, () => (['']));
        const qLogsLocal = qData.shifts?.[shiftVal]?.issueLogs || [];
        qLogsLocal.forEach(log => {
            const parsed = parseRawDate(log.rawDate);
            if (parsed && parsed.monthIdx === currentMonthIdx && parsed.year === currentYear) {
                const dayIdx = parsed.date - 1;
                if (dayIdx >= 0 && dayIdx < 31) {
                    qRowsLocal[dayIdx][0] = log.reason === 'Target Met' ? '✅' : 
                                      log.deviationType === 'Human Error' ? 'HE' : 
                                      log.deviationType === 'Process Error' ? 'PE' : '⚠️';
                }
            }
        });

        const dRowsLocal = Array.from({length: 31}, () => ({ plan: 0, actual: 0 }));
        const dLogsLocal = dData.shifts?.[shiftVal]?.issueLogs || [];
        dLogsLocal.forEach(log => {
            const parsed = parseRawDate(log.rawDate);
            if (parsed && parsed.monthIdx === currentMonthIdx && parsed.year === currentYear) {
                const dayIdx = parsed.date - 1;
                if (dayIdx >= 0 && dayIdx < 31) {
                    dRowsLocal[dayIdx].plan += Number(log.planned) || 0;
                    dRowsLocal[dayIdx].actual += Number(log.dispatched) || 0;
                }
            }
        });

        const sRowsLocal = Array.from({length: 31}, () => null);
        const sLogsLocal = sData.shifts?.[shiftVal]?.issueLogs || [];
        sLogsLocal.forEach(log => {
            const parsed = parseRawDate(log.rawDate);
            if (parsed && parsed.monthIdx === currentMonthIdx && parsed.year === currentYear) {
                const dayIdx = parsed.date - 1;
                if (dayIdx >= 0 && dayIdx < 31) {
                    if (!sRowsLocal[dayIdx]) sRowsLocal[dayIdx] = { nm: 0, ua: 0, lti: 0 };
                    sRowsLocal[dayIdx].nm += Number(log.numNearMiss) || 0;
                    sRowsLocal[dayIdx].ua += Number(log.numUnsafeActs) || 0;
                    sRowsLocal[dayIdx].lti += Number(log.numSafetyIncidents) || 0;
                }
            }
        });

        const hRowsLocal = Array.from({length: 31}, () => ({ total: 0, absent: 0 }));
        const activeHealthRecordLocal = healthData.find(h => String(h.shift) === shiftVal);
        if (activeHealthRecordLocal) {
            const days = activeHealthRecordLocal?.days || [];
            days.forEach(day => {
                const dayIdx = Number(day.date) - 1;
                if (dayIdx >= 0 && dayIdx < 31) {
                    hRowsLocal[dayIdx].total += Number(day.totalStrength) || 0;
                    const total = Number(day.totalStrength) || 0;
                    const attendees = day.attendees != null ? Number(day.attendees) : total;
                    hRowsLocal[dayIdx].absent += (total - attendees);
                }
            });
        }

        return {
            Q: getColors(qRowsLocal, 'Q'),
            D: getColors(dRowsLocal, 'D'),
            S: getColors(sRowsLocal, 'S'),
            H: getColors(hRowsLocal, 'H')
        };
    };

    const mergeOverallColors = (colorsList) => {
        const merged = Array(31).fill('#222');
        for (let i = 0; i < 31; i++) {
            let hasRed = false;
            let hasGreen = false;
            colorsList.forEach(c => {
                if (c[i] === '#dc3545') {
                    hasRed = true;
                } else if (c[i] === '#28a745') {
                    hasGreen = true;
                }
            });
            if (hasRed) {
                merged[i] = '#dc3545';
            } else if (hasGreen) {
                merged[i] = '#28a745';
            }
        }
        return merged;
    };

    let qColors, dColors, sColors, hColors;
    if (activeCarouselShift === 'overall') {
        const s1Colors = getColorsForShift('1');
        const s2Colors = getColorsForShift('2');
        const s3Colors = getColorsForShift('3');

        qColors = mergeOverallColors([s1Colors.Q, s2Colors.Q, s3Colors.Q]);
        dColors = mergeOverallColors([s1Colors.D, s2Colors.D, s3Colors.D]);
        sColors = mergeOverallColors([s1Colors.S, s2Colors.S, s3Colors.S]);
        hColors = mergeOverallColors([s1Colors.H, s2Colors.H, s3Colors.H]);
    } else {
        qColors = getColors(qRows, 'Q');
        dColors = getColors(dRows, 'D');
        sColors = getColors(sRows, 'S');
        hColors = getColors(hRows, 'H');
    }

    const getIssues = (letter) => {
        let issuesList = [];
        const m = metrics.find(metric => metric.letter === letter);
        if (m) {
            ['1', '2', '3'].forEach(shift => {
                (m.shifts?.[shift]?.staffLogs || []).forEach(log => {
                    issuesList.push({ date: log.time || '', challenge: log.name || '', owner: log.action || '' });
                });
            });
        }
        issuesList.reverse();
        return issuesList;
    };

    const getActions = (letter) => {
        let actionsList = [];
        const m = metrics.find(metric => metric.letter === letter);
        if (m) {
            ['1', '2', '3'].forEach(shift => {
                (m.shifts?.[shift]?.activityLogs || []).forEach(log => {
                    actionsList.push({ date: log.time || '', action: log.name || '', owner: log.action || '', target: 'TBD', status: 'WIP' });
                });
            });
        }
        actionsList.reverse();
        return actionsList;
    };

    const qIssues = getIssues('Q');
    const dIssues = getIssues('D');
    const sIssues = getIssues('S');
    const hIssues = getIssues('H');

    const qActions = getActions('Q');
    const dActions = getActions('D');
    const sActions = getActions('S');
    const hActions = getActions('H');

    // Calculate overall monthly metrics for S1, S2, S3
    const getShiftOverallPercentages = (shiftVal) => {
        let totalSuccess = 0;
        let totalAlerts = 0;

        // 1. Quality (Q)
        const qLogs = qData.shifts?.[shiftVal]?.issueLogs || [];
        qLogs.forEach(log => {
            const parsed = parseRawDate(log.rawDate);
            if (parsed && parsed.monthIdx === currentMonthIdx && parsed.year === currentYear) {
                if (log.reason === 'Target Met') totalSuccess++;
                else totalAlerts++;
            }
        });

        // 2. Delivery (D)
        const dLogs = dData.shifts?.[shiftVal]?.issueLogs || [];
        dLogs.forEach(log => {
            const parsed = parseRawDate(log.rawDate);
            if (parsed && parsed.monthIdx === currentMonthIdx && parsed.year === currentYear) {
                const plan = Number(log.planned) || 0;
                const actual = Number(log.dispatched) || 0;
                if (plan > 0 || actual > 0) {
                    if (actual >= plan) totalSuccess++;
                    else totalAlerts++;
                }
            }
        });

        // 3. Safety (S)
        const sLogs = sData.shifts?.[shiftVal]?.issueLogs || [];
        sLogs.forEach(log => {
            const parsed = parseRawDate(log.rawDate);
            if (parsed && parsed.monthIdx === currentMonthIdx && parsed.year === currentYear) {
                if (log.numNearMiss > 0 || log.numUnsafeActs > 0 || log.numSafetyIncidents > 0) {
                    totalAlerts++;
                } else {
                    totalSuccess++;
                }
            }
        });

        // 4. Health (H)
        const shiftHealth = healthData.find(h => String(h.shift) === shiftVal);
        if (shiftHealth) {
            (shiftHealth.days || []).forEach(day => {
                const total = Number(day.totalStrength) || 0;
                const attendees = day.attendees != null ? Number(day.attendees) : total;
                const absent = total - attendees;
                if (total > 0) {
                    if (absent > 0) totalAlerts++;
                    else totalSuccess++;
                }
            });
        }

        const total = totalSuccess + totalAlerts;
        const successPercent = total ? Math.round((totalSuccess / total) * 100) : 0;
        const alertPercent = total ? Math.round((totalAlerts / total) * 100) : 0;

        return { successPercent, alertPercent, totalSuccess, totalAlerts, total };
    };

    const shift1Stats = getShiftOverallPercentages('1');
    const shift2Stats = getShiftOverallPercentages('2');
    const shift3Stats = getShiftOverallPercentages('3');

    const yearlyPercent = useMemo(() => {
        let totalSuccess = 0;
        let totalAlerts = 0;

        metrics.forEach(metric => {
            if (!['Q', 'D', 'S'].includes(metric.letter)) return;
            ['1', '2', '3'].forEach(shiftVal => {
                const logs = metric.shifts?.[shiftVal]?.issueLogs || [];
                logs.forEach(log => {
                    const parsed = parseRawDate(log.rawDate);
                    if (parsed && parsed.year === currentYear) {
                        if (metric.letter === 'Q') {
                            if (log.reason === 'Target Met') totalSuccess++;
                            else totalAlerts++;
                        } else if (metric.letter === 'D') {
                            const plan = Number(log.planned) || 0;
                            const actual = Number(log.dispatched) || 0;
                            const breakdownsVal = Number(log.breakdowns || log.breakdownCount || 0);
                            if (plan > 0 || actual > 0) {
                                const efficiency = (actual / (plan || 1)) * 100;
                                const fail = efficiency < 90 || breakdownsVal > 0;
                                if (fail) totalAlerts++;
                                else totalSuccess++;
                            }
                        } else if (metric.letter === 'S') {
                            if (log.numNearMiss > 0 || log.numUnsafeActs > 0 || log.numSafetyIncidents > 0) {
                                totalAlerts++;
                            } else {
                                totalSuccess++;
                            }
                        }
                    }
                });
            });
        });

        healthData.forEach(shiftHealth => {
            if (Number(shiftHealth.year) === currentYear) {
                (shiftHealth.days || []).forEach(day => {
                    const total = Number(day.totalStrength) || 0;
                    const attendees = day.attendees != null ? Number(day.attendees) : total;
                    const absent = total - attendees;
                    if (total > 0) {
                        if (absent > 0) totalAlerts++;
                        else totalSuccess++;
                    }
                });
            }
        });

        const total = totalSuccess + totalAlerts;
        return total ? Math.round((totalSuccess / total) * 100) : 0;
    }, [metrics, healthData, currentYear]);

    return (
        <div 
            ref={boardRef} 
            className={`qdshi-board-container relative ${isFullscreen ? 'bg-slate-900 p-6 overflow-y-auto w-full h-full' : ''}`}
        >
            {/* Shift Indicators */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-2">
                {['overall', '1', '2', '3'].map(s => (
                    <div 
                        key={s} 
                        onClick={() => setActiveCarouselShift(s)}
                        className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${activeCarouselShift === s ? 'bg-emerald-600 text-white shadow-lg scale-110' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                    >
                        {s === 'overall' ? 'Overall' : `Shift ${s}`}
                    </div>
                ))}
            </div>

            {/* Config & Controls */}
            <div className="absolute top-4 right-4 z-10 flex gap-3 items-center">
                <input 
                    type="month" 
                    value={selectedDateStr}
                    onChange={(e) => setSelectedDateStr(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded-lg px-3 py-1.5 shadow-sm outline-none"
                />
                <select 
                    value={dept} 
                    onChange={(e) => setDept(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded-lg px-3 py-1.5 shadow-sm outline-none"
                >
                    {Object.entries(DEPT_MAP).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                     ))}
                </select>
                
                {/* Full Screen Lock/Unlock Toggle Button */}
                <button
                    onClick={toggleFullscreen}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 p-1.5 rounded-lg shadow-sm outline-none transition-colors flex items-center justify-center"
                    title={isFullscreen ? "Unlock Screen Layout" : "Lock Screen to Fullscreen"}
                >
                    {isFullscreen ? <Unlock size={16} /> : <Lock size={16} />}
                </button>
            </div>

            {/* Inner Content Layout Container */}
            <div className="qdshi-board-inner shadow-2xl rounded-xl" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                <div className="board-screw-bl"></div>
                <div className="board-screw-br"></div>
                
                {/* Header Information */}
                <div className="flex flex-wrap board-header-info mb-4 items-center">
                    <div className="w-full md:w-2/12">
                        <div className="logo-placeholder">
                            <img src={logo} alt="PivotPath Logo" className="h-10" />
                        </div>
                    </div>
                    <div className="w-full md:w-2/12 text-center select-none">
                        <strong>Yearly Performance</strong>
                        <span className="text-rose-600 font-black text-sm block mt-0.5">{yearlyPercent}% ({currentYear})</span>
                    </div>
                    <div className="w-full md:w-2/12 text-center">
                        <strong>Area</strong>
                        <span className="text-blue-600">{DEPT_MAP[dept]}</span>
                    </div>
                    <div className="w-full md:w-2/12 text-center">
                        <strong>Month / Year</strong>
                        <span className="text-emerald-600">{currentMonthLong.substring(0, 3).toUpperCase()} / {currentYear}</span>
                    </div>
                    <div className="w-full md:w-2/12 text-center">
                        <strong>Meeting Timing</strong>
                        <span className="text-blue-600">06:00-06:15 | 14:00-14:15</span>
                    </div>
                    <div className="w-full md:w-2/12 text-center">
                        <strong>Board Owner</strong>
                        <span className="text-emerald-600">Dept. Head</span>
                    </div>
                </div>

                {/* Grid Layout (4 columns for QDSH) */}
                <div className="qdshi-grid">
                    {/* Row 0: Grid Headers (Circles) */}
                    <div className="grid-cell flex justify-center items-center">
                        <ConcentricShiftsDonut s1={shift1Stats} s2={shift2Stats} s3={shift3Stats} />
                    </div>
                    <div className="grid-cell"><DailyCircle letter="Q" selectedMonthIdx={currentMonthIdx} selectedYear={currentYear} colors={qColors} /></div>
                    <div className="grid-cell"><DailyCircle letter="D" selectedMonthIdx={currentMonthIdx} selectedYear={currentYear} colors={dColors} /></div>
                    <div className="grid-cell"><DailyCircle letter="S" selectedMonthIdx={currentMonthIdx} selectedYear={currentYear} colors={sColors} /></div>
                    <div className="grid-cell"><DailyCircle letter="H" selectedMonthIdx={currentMonthIdx} selectedYear={currentYear} colors={hColors} /></div>

                    {/* Row 1: Metrics / KPI */}
                    <div className="grid-cell row-label">Metrics / KPI</div>
                    <div className="grid-cell">
                        <div key={`q-${activeCarouselShift}`} className="carousel-fade h-full w-full">
                            <DailyTable 
                                title={`Major Metric: No. of repeat deviation (${shiftDisplayName})`} 
                                metricHeader="Human error related deviations"
                                subheaders={['Status']}
                                colorClass="th-q-bg"
                                rowsData={qRows}
                                formatCell={(row, idx) => row[idx]}
                                getCellClass={(row, idx) => {
                                    const val = row[idx];
                                    if (val === '✅') return 'bg-emerald-100 text-emerald-800';
                                    if (val === 'HE' || val === 'PE' || val === '⚠️') return 'bg-red-100 text-red-800';
                                    return '';
                                }}
                            />
                        </div>
                    </div>
                    <div className="grid-cell">
                        <div key={`d-${activeCarouselShift}`} className="carousel-fade h-full w-full">
                            <DailyTable 
                                title={`Major Metric: Plan Vs Actual (${shiftDisplayName})`} 
                                metricHeader="Delivery Plan Vs Actual"
                                subheaders={['Plan', 'Actual', 'Var']}
                                colorClass="th-d-bg"
                                rowsData={dRows}
                                formatCell={(row, idx) => {
                                    if (row.plan === 0 && row.actual === 0) return '';
                                    if (idx === 0) return row.plan;
                                    if (idx === 1) return row.actual;
                                    const diff = row.actual - row.plan;
                                    return <span className={diff >= 0 ? 'text-emerald-600' : 'text-red-500'}>{diff > 0 ? `+${diff}` : diff}</span>;
                                }}
                                getCellClass={(row, idx) => {
                                    if (row.plan === 0 && row.actual === 0) return '';
                                    if (idx === 2) {
                                        const diff = row.actual - row.plan;
                                        return diff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800';
                                    }
                                    return '';
                                }}
                            />
                        </div>
                    </div>
                    <div className="grid-cell">
                        <div key={`s-${activeCarouselShift}`} className="carousel-fade h-full w-full">
                            <DailyTable 
                                title={`Major Metric: No. of Safety Incidents (${shiftDisplayName})`} 
                                metricHeader="Near Miss / Unsafe Acts / LTI"
                                subheaders={['NM', 'UA', 'LTI']}
                                colorClass="th-s-bg"
                                rowsData={sRows}
                                formatCell={(row, idx) => {
                                    if (!row) return '';
                                    return idx === 0 ? row.nm : idx === 1 ? row.ua : <span className={row.lti > 0 ? 'text-red-500' : ''}>{row.lti}</span>;
                                }}
                                getCellClass={(row, idx) => {
                                    if (!row) return '';
                                    if (idx === 0 && row.nm > 0) return 'bg-amber-100 text-amber-800';
                                    if (idx === 1 && row.ua > 0) return 'bg-orange-100 text-orange-800';
                                    if (idx === 2 && row.lti > 0) return 'bg-red-100 text-red-800';
                                    if (idx === 2 && row.lti === 0) return 'bg-emerald-100 text-emerald-800';
                                    return '';
                                }}
                            />
                        </div>
                    </div>
                    <div className="grid-cell">
                        <div key={`h-${activeCarouselShift}`} className="carousel-fade h-full w-full">
                            <DailyTable 
                                title={`Major Metric: Absenteeism (${shiftDisplayName})`} 
                                metricHeader="Health / Absenteeism Rate"
                                subheaders={['Staff', 'Abs', '%']}
                                colorClass="th-h-bg"
                                rowsData={hRows}
                                formatCell={(row, idx) => {
                                    if (row.total === 0) return '';
                                    if (idx === 0) return row.total;
                                    if (idx === 1) return row.absent;
                                    return ((row.absent / row.total) * 100).toFixed(1) + '%';
                                }}
                                getCellClass={(row, idx) => {
                                    if (row.total === 0) return '';
                                    if (idx === 1 || idx === 2) {
                                        return row.absent > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800';
                                    }
                                    return '';
                                }}
                            />
                        </div>
                    </div>

                    {/* Row 2: Issues / Challenges */}
                    <div className="grid-cell row-label">Issues /<br/>Challenges</div>
                    <div className="grid-cell"><IssuesTable issues={qIssues} /></div>
                    <div className="grid-cell"><IssuesTable issues={dIssues} /></div>
                    <div className="grid-cell"><IssuesTable issues={sIssues} /></div>
                    <div className="grid-cell"><IssuesTable issues={hIssues} /></div>

                    {/* Row 3: Action Tracker */}
                    <div className="grid-cell row-label">Action Tracker</div>
                    <div className="grid-cell"><ActionTable actions={qActions} /></div>
                    <div className="grid-cell"><ActionTable actions={dActions} /></div>
                    <div className="grid-cell"><ActionTable actions={sActions} /></div>
                    <div className="grid-cell"><ActionTable actions={hActions} /></div>
                </div>
            </div>
        </div>
    );
}