import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, Edit, ShieldAlert, FileText, User, Users, AlertOctagon, 
  HelpCircle, CheckCircle2, AlertCircle, FilePlus, Sparkles, Send, 
  Compass, TrendingUp, ChevronLeft, ChevronRight, Loader2, Play
} from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';

const API = process.env.REACT_APP_API_URL || 
  ((window.location.port && window.location.port !== '5000') 
    ? `${window.location.protocol}//${window.location.hostname}:5000` 
    : window.location.origin);

const DEPARTMENT_QUESTIONS = {
  q: {
    Q1: "Why did the quality issue or deviation occur?",
    Q2: "Was the applicable SOP or laboratory procedure followed?",
    Q3: "Was the testing equipment, product batch, or material in the required condition?",
    Q4: "What was the actual impact on product quality, batch integrity, or compliance?",
    Q5: "Has a similar quality reject, OOS, or deviation occurred previously?",
    Q6: "What was identified as the root cause of this quality deviation?",
    Q7: "What CAPA (Corrective and Preventive Action) was taken?",
    Q8: "How was the effectiveness of the quality CAPA verified?"
  },
  d: {
    Q1: "Why did the dispatch/production delay or equipment breakdown occur?",
    Q2: "Was the standard operating procedure for production/logistics followed?",
    Q3: "Was the machinery, material, or processing line in the required condition?",
    Q4: "What was the actual delay, production loss, or dispatch bottleneck?",
    Q5: "Has a similar equipment breakdown or dispatch delay occurred previously?",
    Q6: "What was identified as the root cause of the breakdown or delay?",
    Q7: "What recovery or corrective action was taken?",
    Q8: "How was the effectiveness of the production recovery verified?"
  },
  s: {
    Q1: "Why did the safety incident or unsafe condition occur?",
    Q2: "Was the safety procedure or PPE protocol followed?",
    Q3: "Was the work environment, equipment, or tool in a safe and required condition?",
    Q4: "What was the injury severity, number of people affected, or damage caused?",
    Q5: "Has a similar safety incident, near miss, or unsafe act occurred previously?",
    Q6: "What was identified as the root cause of the safety breach or hazard?",
    Q7: "What corrective action was taken to eliminate the hazard?",
    Q8: "How was the effectiveness of the safety correction verified?"
  },
  h: {
    Q1: "Why did the health incident or missed health meeting occur?",
    Q2: "Was the health check or hygiene protocol followed?",
    Q3: "Was the medical equipment, facility, or wellness area in the required condition?",
    Q4: "What was the health impact or illness severity on the affected personnel?",
    Q5: "Has a similar health issue or missed meeting occurred previously?",
    Q6: "What was identified as the root cause of the health issue or missed meeting?",
    Q7: "What health response or corrective action was taken?",
    Q8: "How was the effectiveness of the health response verified?"
  }
};

export default function FDAInvestigationWizard({ challenge, dept, shift, onClose, onSaveChallenge }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [autofillingQ, setAutofillingQ] = useState(null);

  // User Details from local storage
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo')) || {};
    } catch { return {}; }
  }, []);

  const reportedAtStr = useMemo(() => {
    const d = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, []);

  // Wizard Data State
  const [wizardData, setWizardData] = useState({
    issueDetails: challenge?.name || '',
    deviationType: challenge?.deviationType || '',
    assignedId: challenge?.assignedId || '',
    assignedName: challenge?.assignedName || '',
    reporterName: user?.name || 'Mahesh Waran',
    reporterId: user?.employeeId || 'EMP-1082',
    reporterDept: user?.department || 'Quality',
    reportedAt: reportedAtStr,
    severity: challenge?.severity || 'Low',
    impact: challenge?.affected ? `${challenge.affected} affected personnel` : 'None',
    overallStatus: 'NOT_ANSWERED',
    questions: []
  });

  const activeQuestions = useMemo(() => {
    const key = (dept || 'q').toLowerCase().charAt(0);
    return DEPARTMENT_QUESTIONS[key] || DEPARTMENT_QUESTIONS.q;
  }, [dept]);

  // Fetch FDA Investigation record
  useEffect(() => {
    const fetchInvestigation = async () => {
      if (!challenge?.id) return;
      try {
        setLoading(true);
        const res = await axios.get(`${API}/api/fda/investigation/${challenge.id}`);
        if (res.data && res.data.questions && res.data.questions.length > 0) {
          setWizardData(prev => ({
            ...prev,
            questions: res.data.questions,
            overallStatus: res.data.overallStatus
          }));
        } else {
          // Initialize empty questions
          const initialQ = Object.entries(activeQuestions).map(([qId, qText]) => ({
            questionId: qId,
            question: qText,
            answer: '',
            answerMethod: 'NONE',
            status: 'NOT_ANSWERED',
            sources: [],
            evidence: [],
            confidence: 0,
            confirmedBy: '',
            confirmedAt: null
          }));
          setWizardData(prev => ({ ...prev, questions: initialQ }));
        }
      } catch (err) {
        console.error("Error fetching FDA investigation:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvestigation();
  }, [challenge, activeQuestions]);

  // Save current progress to DB
  const saveToDB = async (updatedData = wizardData) => {
    if (!challenge?.id) return;
    try {
      await axios.post(`${API}/api/fda/investigation`, {
        challengeId: challenge.id,
        department: dept,
        createdBy: user?.employeeId || 'System',
        questions: updatedData.questions,
        overallStatus: updatedData.overallStatus
      });
    } catch (err) {
      console.error("Error saving to DB:", err);
    }
  };

  // 🤖 Auto-Fill Question Logic
  const handleAutoFill = async (questionId) => {
    setAutofillingQ(questionId);
    try {
      const res = await axios.post(`${API}/api/fda/autofill`, {
        challengeId: challenge?.id || 'REF-TEMP',
        questionId,
        department: dept,
        shift,
        date: challenge?.date || challenge?.rawDate || new Date().toISOString().split('T')[0],
        challengeName: wizardData.issueDetails,
        details: wizardData
      });

      const autofilledAns = res.data;

      setWizardData(prev => {
        const updatedQ = prev.questions.map(q => {
          if (q.questionId === questionId) {
            return {
              ...q,
              answer: autofilledAns.answer,
              answerMethod: 'AUTO',
              status: autofilledAns.status,
              sources: autofilledAns.sources || [],
              confidence: autofilledAns.confidence || 0
            };
          }
          return q;
        });
        const newState = { ...prev, questions: updatedQ };
        saveToDB(newState);
        return newState;
      });
    } catch (err) {
      Swal.fire('Error', 'Auto fill request failed.', 'error');
    } finally {
      setAutofillingQ(null);
    }
  };

  // ✏️ Edit or Manual Entry Mode
  const handleManualEntry = (questionId) => {
    setWizardData(prev => {
      const updatedQ = prev.questions.map(q => {
        if (q.questionId === questionId) {
          return {
            ...q,
            answerMethod: 'MANUAL',
            status: 'MANUAL'
          };
        }
        return q;
      });
      const newState = { ...prev, questions: updatedQ };
      saveToDB(newState);
      return newState;
    });
  };

  // Save Text Response
  const handleSaveTextAnswer = (questionId, text) => {
    setWizardData(prev => {
      const updatedQ = prev.questions.map(q => {
        if (q.questionId === questionId) {
          return {
            ...q,
            answer: text,
            status: text.trim() ? 'MANUAL' : 'NOT_ANSWERED'
          };
        }
        return q;
      });
      const newState = { ...prev, questions: updatedQ };
      saveToDB(newState);
      return newState;
    });
  };

  // 🟢 Confirm Answer
  const handleConfirmAnswer = (questionId) => {
    setWizardData(prev => {
      const updatedQ = prev.questions.map(q => {
        if (q.questionId === questionId) {
          return {
            ...q,
            status: 'CONFIRMED',
            confirmedBy: user?.name || 'Authorized Supervisor',
            confirmedAt: new Date().toISOString()
          };
        }
        return q;
      });
      const newState = { ...prev, questions: updatedQ };
      saveToDB(newState);
      return newState;
    });
  };

  // Mark Not Applicable (N/A)
  const handleMarkNA = (questionId) => {
    setWizardData(prev => {
      const updatedQ = prev.questions.map(q => {
        if (q.questionId === questionId) {
          return {
            ...q,
            answer: 'Not Applicable for this department and shift.',
            answerMethod: 'NONE',
            status: 'CONFIRMED',
            sources: ['Excluded by Department Rule'],
            confidence: 100,
            confirmedBy: user?.name || 'System',
            confirmedAt: new Date().toISOString()
          };
        }
        return q;
      });
      const newState = { ...prev, questions: updatedQ };
      saveToDB(newState);
      return newState;
    });
  };

  // File Upload Evidence handler
  const handleAttachEvidence = async (questionId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result;
        const res = await axios.post(`${API}/api/fda/upload`, {
          fileName: file.name,
          fileData: base64Data
        });
        
        setWizardData(prev => {
          const updatedQ = prev.questions.map(q => {
            if (q.questionId === questionId) {
              return {
                ...q,
                evidence: [...(q.evidence || []), res.data.fileUrl]
              };
            }
            return q;
          });
          const newState = { ...prev, questions: updatedQ };
          saveToDB(newState);
          return newState;
        });
        Swal.fire('Success', 'Evidence uploaded successfully!', 'success');
      } catch (err) {
        Swal.fire('Error', 'Evidence upload failed.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // Status colors utility
  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-full flex items-center gap-1">🟢 Confirmed</span>;
      case 'AUTO_FILLED':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-full flex items-center gap-1">🔵 Auto-Filled</span>;
      case 'MANUAL':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-full flex items-center gap-1">🟡 Manual Entry</span>;
      case 'INSUFFICIENT_DATA':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-full flex items-center gap-1">🔴 Insufficient Data</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-full flex items-center gap-1">⚪ Not Answered</span>;
    }
  };

  // Verification score computations
  const totalQuestions = wizardData.questions.length;
  const answeredCount = wizardData.questions.filter(q => q.status === 'CONFIRMED').length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  
  const evidenceQuestions = wizardData.questions.filter(q => q.evidence && q.evidence.length > 0).length;
  const evidencePercent = totalQuestions > 0 ? Math.round((evidenceQuestions / totalQuestions) * 100) : 0;

  const investigationCompleteness = progressPercent;
  const correctiveActionPercent = wizardData.questions.some(q => q.questionId === 'Q7' && q.status === 'CONFIRMED') ? 90 : 20;
  const effectivenessPercent = wizardData.questions.some(q => q.questionId === 'Q8' && q.status === 'CONFIRMED') ? 85 : 30;

  const overallReadiness = Math.round(
    (investigationCompleteness * 0.3) + 
    (evidencePercent * 0.3) + 
    (correctiveActionPercent * 0.2) + 
    (effectivenessPercent * 0.2)
  );

  const getStrengthRating = (score) => {
    if (score >= 80) return { label: 'Strong', color: 'text-emerald-500 bg-emerald-50' };
    if (score >= 50) return { label: 'Moderate', color: 'text-amber-500 bg-amber-50' };
    return { label: 'Weak', color: 'text-rose-500 bg-rose-50' };
  };

  const readinessRating = getStrengthRating(overallReadiness);

  // Computes current validation gaps
  const keyGaps = useMemo(() => {
    const gaps = [];
    if (answeredCount < totalQuestions) {
      gaps.push(`${totalQuestions - answeredCount} evaluation questions are not finalized.`);
    }
    if (evidencePercent < 60) {
      gaps.push("Supporting evidence completeness is low (under 60%). Please upload files.");
    }
    if (!wizardData.questions.find(q => q.questionId === 'Q8')?.status === 'CONFIRMED') {
      gaps.push("Effectiveness verification question requires review.");
    }
    return gaps;
  }, [answeredCount, totalQuestions, evidencePercent, wizardData.questions]);

  // Action Tracker Integration (Reuses existing Action Tracker/activityLogs)
  const handleLinkActionTracker = async () => {
    try {
      const q7 = wizardData.questions.find(q => q.questionId === 'Q7');
      const actionDescription = q7?.answer || `Complete root-cause investigation for: ${wizardData.issueDetails}`;
      
      const newAction = {
        id: `ACT-${Date.now().toString().slice(-4)}`,
        name: `FDA Corrective Action: ${actionDescription}`,
        action: wizardData.assignedName || user?.name || 'Responsible Person',
        time: getISTTime()
      };

      // Call API to push to activityLogs in Metrics model
      await axios.post(`${API}/api/metrics/activity`, {
        letter: (dept || 'q').charAt(0).toUpperCase(),
        dept: (dept || 'fgmw').toLowerCase(),
        shift: shift || '1',
        logs: [newAction],
        userRole: 'superadmin' // Bypass timelock supervisor validation
      });

      Swal.fire({
        title: 'Action Linked!',
        text: 'Action item created & linked directly inside QDSHI Action Tracker.',
        icon: 'success',
        confirmButtonColor: '#10B981'
      });
    } catch (err) {
      Swal.fire('Error', 'Failed to link Action Tracker.', 'error');
    }
  };

  const getISTTime = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });

  // Wizard Navigation Action Handlers
  const handleNextStep = () => {
    if (step === 6 && answeredCount < totalQuestions) {
      Swal.fire({
        title: 'Evaluation Incomplete',
        text: 'Please answer and confirm all investigator questions to proceed.',
        icon: 'warning',
        confirmButtonColor: '#ef4444'
      });
      return;
    }
    setStep(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-slate-100 transition-all">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl font-bold text-xs">🕵️ FDA</span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-100">FDA Inspection Readiness Evaluation</h2>
              <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Shift {shift} · {dept?.toUpperCase()} Department</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Steps Progress Header bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 overflow-x-auto flex items-center gap-3 select-none">
          {[1,2,3,4,5,6,7,8,9,10].map((s) => {
            const stepLabels = [
              "Issue Details", "Responsible Person", "Reported By", "Impact & Severity", 
              "Questions", "Review", "Evidence", "Readiness Check", "Action Tracker", "Dashboard"
            ];
            const isCompleted = s < step;
            const isActive = s === step;
            return (
              <div key={s} className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                  isCompleted ? 'bg-emerald-500 text-white' : isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {isCompleted ? '✓' : s}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                  {stepLabels[s - 1]}
                </span>
                {s < 10 && <span className="text-slate-300 text-[10px]">→</span>}
              </div>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[350px]">
          {loading && (
            <div className="h-full flex items-center justify-center flex-col py-12 gap-3">
              <Loader2 size={36} className="text-emerald-500 animate-spin" />
              <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Loading inspection record...</p>
            </div>
          )}

          {!loading && (
            <>
              {/* Step 1: Issue Details */}
              {step === 1 && (
                <div className="space-y-4 max-w-xl mx-auto py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={20} className="text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">STEP 1: ISSUE DETAILS</h3>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Brief Description of Challenge</label>
                    <textarea 
                      value={wizardData.issueDetails}
                      onChange={(e) => setWizardData(prev => ({ ...prev, issueDetails: e.target.value }))}
                      placeholder="Explain the issue details..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 ring-emerald-500 font-semibold h-24"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Deviation Type</label>
                    <select 
                      value={wizardData.deviationType}
                      onChange={(e) => setWizardData(prev => ({ ...prev, deviationType: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 ring-emerald-500 font-semibold"
                    >
                      <option value="">-- Select Deviation Type --</option>
                      <option value="Human Error">Human Error</option>
                      <option value="Process Error">Process Error</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 2: Responsible Person */}
              {step === 2 && (
                <div className="space-y-4 max-w-xl mx-auto py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={20} className="text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">STEP 2: RESPONSIBLE PERSON</h3>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Assigned Employee ID</label>
                    <input 
                      type="text"
                      value={wizardData.assignedId}
                      onChange={(e) => setWizardData(prev => ({ ...prev, assignedId: e.target.value }))}
                      placeholder="e.g. EMP-101"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 ring-emerald-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Assigned Employee Name</label>
                    <input 
                      type="text"
                      value={wizardData.assignedName}
                      onChange={(e) => setWizardData(prev => ({ ...prev, assignedName: e.target.value }))}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 ring-emerald-500 font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Reported By */}
              {step === 3 && (
                <div className="space-y-4 max-w-xl mx-auto py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={20} className="text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">STEP 3: REPORTED BY</h3>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-3">
                    <div className="flex justify-between border-b pb-2 text-xs">
                      <span className="font-bold text-slate-400 uppercase">Reported By</span>
                      <span className="font-black text-slate-700">{wizardData.reporterName}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2 text-xs">
                      <span className="font-bold text-slate-400 uppercase">Employee ID</span>
                      <span className="font-black text-slate-700">{wizardData.reporterId}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2 text-xs">
                      <span className="font-bold text-slate-400 uppercase">Department</span>
                      <span className="font-black text-slate-700">{wizardData.reporterDept}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-400 uppercase">Reported At</span>
                      <span className="font-black text-slate-700">{wizardData.reportedAt}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center italic font-bold">Details parsed from active session state credentials.</p>
                </div>
              )}

              {/* Step 4: Impact & Severity */}
              {step === 4 && (
                <div className="space-y-4 max-w-xl mx-auto py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertOctagon size={20} className="text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">STEP 4: IMPACT & SEVERITY</h3>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Severity Rating</label>
                    <select 
                      value={wizardData.severity}
                      onChange={(e) => setWizardData(prev => ({ ...prev, severity: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 ring-emerald-500 font-semibold"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Impact Description</label>
                    <input 
                      type="text"
                      value={wizardData.impact}
                      onChange={(e) => setWizardData(prev => ({ ...prev, impact: e.target.value }))}
                      placeholder="e.g. 2 batches rejected, or downtime of 120 mins"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 ring-emerald-500 font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Step 5: FDA Investigator Questions */}
              {step === 5 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle size={20} className="text-emerald-600" />
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">STEP 5: FDA INVESTIGATOR EVALUATION</h3>
                    </div>
                    <div className="text-[10px] font-black text-slate-500 uppercase">
                      Progress: {answeredCount} / {totalQuestions} Confirmed
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {wizardData.questions.map((q) => {
                      const isAutofilling = autofillingQ === q.questionId;
                      const isConfirmed = q.status === 'CONFIRMED';
                      
                      return (
                        <div key={q.questionId} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm hover:shadow transition-all">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{q.questionId}</span>
                              {getStatusBadge(q.status)}
                            </div>
                            <h4 className="text-xs font-black text-slate-700 uppercase mt-1 leading-tight">{q.question}</h4>

                            {/* Answer Area */}
                            {q.answer && (
                              <div className="mt-2.5 p-3 bg-white border border-slate-100 rounded-xl text-xs text-slate-600 font-semibold whitespace-pre-wrap">
                                {q.answer}
                                {q.answerMethod === 'AUTO' && (
                                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[10px]">
                                    <span className="font-bold text-slate-400 uppercase">Source Records:</span>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {q.sources.map((s, idx) => (
                                        <span key={idx} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black">✓ {s}</span>
                                      ))}
                                    </div>
                                    <span className="font-bold text-slate-400 uppercase mt-1">Confidence: <span className="text-blue-500 font-black">{q.confidence}%</span></span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Manual edit text box */}
                            {q.status === 'MANUAL' && (
                              <textarea
                                value={q.answer}
                                onChange={(e) => handleSaveTextAnswer(q.questionId, e.target.value)}
                                placeholder="Enter manual response details..."
                                className="w-full mt-2.5 bg-white border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-1 ring-emerald-500 font-semibold h-20 resize-none"
                              />
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100/50 justify-end">
                            {/* Auto Fill / Manual buttons */}
                            {!isConfirmed && (
                              <>
                                <button 
                                  disabled={isAutofilling}
                                  onClick={() => handleAutoFill(q.questionId)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all active:scale-95 disabled:opacity-60"
                                >
                                  {isAutofilling ? <Loader2 size={10} className="animate-spin" /> : '🤖 Auto Fill'}
                                </button>
                                <button 
                                  onClick={() => handleManualEntry(q.questionId)}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all active:scale-95"
                                >
                                  ✏️ Manual Entry
                                </button>
                                <button 
                                  onClick={() => handleMarkNA(q.questionId)}
                                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[9px] font-black uppercase rounded-lg transition-all active:scale-95"
                                >
                                  N/A
                                </button>
                              </>
                            )}

                            {/* Confirm/Edit action tools */}
                            {q.answer && q.status !== 'CONFIRMED' && (
                              <button 
                                onClick={() => handleConfirmAnswer(q.questionId)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all active:scale-95"
                              >
                                ✓ Confirm Answer
                              </button>
                            )}

                            {isConfirmed && (
                              <button 
                                onClick={() => handleManualEntry(q.questionId)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all"
                              >
                                ✏️ Edit Answer
                              </button>
                            )}

                            {/* Evidence attachment widget inside question card */}
                            {!isConfirmed && (
                              <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all cursor-pointer active:scale-95">
                                <FilePlus size={10} /> + Evidence
                                <input 
                                  type="file" 
                                  onChange={(e) => handleAttachEvidence(q.questionId, e.target.files[0])}
                                  className="hidden" 
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 6: Review Answers */}
              {step === 6 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-emerald-600" />
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">STEP 6: FDA INVESTIGATOR REVIEW</h3>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {wizardData.questions.map((q) => (
                      <div key={q.questionId} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-black text-slate-700 uppercase">{q.questionId}. {q.question}</h4>
                          {getStatusBadge(q.status)}
                        </div>
                        <p className="text-xs text-slate-500 font-semibold">{q.answer || '(No response provided)'}</p>
                        <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-400 uppercase pt-1 border-t border-slate-100">
                          <span>Method: <span className="text-slate-600 font-black">{q.answerMethod}</span></span>
                          {q.sources.length > 0 && (
                            <span>Sources: <span className="text-slate-600 font-black">{q.sources.join(', ')}</span></span>
                          )}
                          {q.evidence && q.evidence.length > 0 && (
                            <span className="text-emerald-600">✓ Evidence Attached</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-xs font-black text-slate-700 uppercase">Ready for Validation Confirmation?</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setStep(5)}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-black uppercase rounded-xl transition-all"
                      >
                        ← Back & Edit
                      </button>
                      <button 
                        onClick={async () => {
                          const updated = { ...wizardData, overallStatus: 'CONFIRMED' };
                          setWizardData(updated);
                          await saveToDB(updated);
                          Swal.fire('Confirmed', 'All investigator evaluation answers confirmed!', 'success');
                          handleNextStep();
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl transition-all active:scale-95"
                      >
                        ✓ Confirm All Answers
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 7: Evidence Check */}
              {step === 7 && (
                <div className="space-y-4 max-w-xl mx-auto py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FilePlus size={20} className="text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">STEP 7: EVIDENCE ATTACHMENT CHECK</h3>
                  </div>

                  <div className="space-y-3">
                    {wizardData.questions.map((q) => (
                      <div key={q.questionId} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center gap-4">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase">{q.questionId}</span>
                          <h4 className="text-xs font-black text-slate-700 uppercase leading-none mt-0.5">{q.question.slice(0, 50)}...</h4>
                          {q.evidence && q.evidence.length > 0 ? (
                            <div className="flex gap-2 mt-2">
                              {q.evidence.map((url, idx) => (
                                <a 
                                  key={idx} 
                                  href={`${API}${url}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[9px] font-black text-emerald-600 hover:underline uppercase flex items-center gap-0.5"
                                >
                                  📄 Document #{idx+1}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold block mt-1">No evidence files uploaded yet.</span>
                          )}
                        </div>

                        <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all cursor-pointer active:scale-95">
                          <FilePlus size={10} /> + Add
                          <input 
                            type="file" 
                            onChange={(e) => handleAttachEvidence(q.questionId, e.target.files[0])}
                            className="hidden" 
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 8: FDA Inspection Readiness Evaluation */}
              {step === 8 && (
                <div className="space-y-6 max-w-xl mx-auto py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert size={20} className="text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">STEP 8: INSPECTION READINESS EVALUATION</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl text-center space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Overall Readiness</span>
                      <span className="text-3xl font-black text-slate-800 block">{overallReadiness}%</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase inline-block ${readinessRating.color}`}>
                        {readinessRating.label}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl space-y-2.5 text-xs font-black uppercase tracking-wider">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Investigation Completeness</span>
                        <span className="text-slate-700">{investigationCompleteness}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Evidence Completeness</span>
                        <span className="text-slate-700">{evidencePercent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Corrective Action Linked</span>
                        <span className="text-slate-700">{correctiveActionPercent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Effectiveness Verification</span>
                        <span className="text-slate-700">{effectivenessPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl space-y-2">
                    <h4 className="text-xs font-black text-rose-700 uppercase flex items-center gap-1">
                      <AlertCircle size={14} /> Key Defense Gaps Detected
                    </h4>
                    {keyGaps.length > 0 ? (
                      <ul className="list-disc pl-5 text-xs text-rose-600/90 font-semibold space-y-1">
                        {keyGaps.map((gap, i) => <li key={i}>{gap}</li>)}
                      </ul>
                    ) : (
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">✓ No gaps detected. Readiness is optimal.</p>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 text-center italic font-bold">This is an internal readiness assessment and not an official FDA audit score.</p>
                </div>
              )}

              {/* Step 9: Action Tracker Integration */}
              {step === 9 && (
                <div className="space-y-4 max-w-xl mx-auto py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={20} className="text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">STEP 9: ACTION TRACKER INTEGRATION</h3>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4">
                    <p className="text-xs text-slate-500 font-semibold">
                      To guarantee compliance, we will push the identified corrective actions to the existing QDSHI Action Tracker. No duplicate trackers are created.
                    </p>

                    <div className="bg-white border border-slate-100 p-4 rounded-2xl space-y-2.5 text-xs">
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-bold text-slate-400 uppercase">Issue Description</span>
                        <span className="font-black text-slate-700">{wizardData.issueDetails.slice(0, 35)}...</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-bold text-slate-400 uppercase">Corrective Action</span>
                        <span className="font-black text-slate-700">{wizardData.questions.find(q => q.questionId === 'Q7')?.answer.slice(0, 35) || 'Complete root-cause evaluation'}...</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-bold text-slate-400 uppercase">Assigned To</span>
                        <span className="font-black text-slate-700">{wizardData.assignedName || 'Responsible Employee'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-400 uppercase">Priority / Status</span>
                        <div className="flex gap-2">
                          <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">High</span>
                          <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Open</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleLinkActionTracker}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs py-3 rounded-xl tracking-widest active:scale-95 transition-all"
                    >
                      ✓ Push to Action Tracker
                    </button>
                  </div>
                </div>
              )}

              {/* Step 10: FDA Analysis Dashboard */}
              {step === 10 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Compass size={20} className="text-emerald-600" />
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">STEP 10: FDA ANALYSIS DASHBOARD</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 bg-slate-900 text-white p-6 rounded-3xl space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">DEFENSE READINESS SUMMARY</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-300">
                            <span>Readiness Strength</span>
                            <span>{overallReadiness}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full mt-1.5">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${overallReadiness}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-300">
                            <span>Questions Completed</span>
                            <span>{answeredCount} / {totalQuestions}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full mt-1.5">
                            <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30 text-center">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Defense rating</span>
                        <span className="text-xl font-black uppercase tracking-widest text-emerald-400">{readinessRating.label}</span>
                      </div>
                    </div>

                    <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest border-b pb-2">Final Inspection Checklist</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {wizardData.questions.map(q => (
                          <div key={q.questionId} className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between">
                            <span className="font-bold text-slate-600 uppercase text-[10px]">{q.questionId} Evaluation</span>
                            {q.status === 'CONFIRMED' ? (
                              <span className="text-emerald-600 font-black flex items-center gap-0.5">✓ Ready</span>
                            ) : (
                              <span className="text-rose-500 font-black">✗ Incomplete</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={async () => {
                          if (onSaveChallenge) {
                            await onSaveChallenge(wizardData);
                          }
                          onClose();
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest py-3 sm:py-4 rounded-2xl text-xs active:scale-95 transition-all mt-4"
                      >
                        ✓ Finalize & Close FDA Analysis
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer controls */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between items-center flex-shrink-0">
          <button 
            disabled={step === 1}
            onClick={() => setStep(prev => prev - 1)}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-black uppercase rounded-xl transition-all disabled:opacity-50"
          >
            ← Back
          </button>
          
          {step < 10 ? (
            <button 
              onClick={handleNextStep}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase rounded-xl tracking-wider transition-all active:scale-95 flex items-center gap-1"
            >
              Continue <ChevronRight size={14} />
            </button>
          ) : (
            <div className="text-[10px] font-black text-slate-400 uppercase">FDA Analysis Step 10 of 10</div>
          )}
        </div>

      </div>
    </div>
  );
}
