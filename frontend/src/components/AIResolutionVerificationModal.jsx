import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Sparkles, Loader2, ShieldCheck, ShieldAlert, CheckCircle2,
  XCircle, AlertTriangle, Eye, ZoomIn, Upload,
  Clock, FileText, AlertCircle, RefreshCw
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL ||
  ((window.location.port && window.location.port !== '5000')
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : window.location.origin);

// Score Gauge Bar Component
const ScoreGauge = ({ label, score, color = 'emerald', minThreshold = 60, icon }) => {
  const isPassing = (score ?? 0) >= minThreshold;
  const colorMap = {
    emerald: isPassing ? 'bg-emerald-500 text-emerald-700 bg-emerald-50' : 'bg-amber-500 text-amber-700 bg-amber-50',
    blue: 'bg-blue-500 text-blue-700 bg-blue-50',
    purple: 'bg-purple-500 text-purple-700 bg-purple-50',
    orange: 'bg-orange-500 text-orange-700 bg-orange-50'
  };

  return (
    <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
          {icon} {label}
        </span>
        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${colorMap[color].split(' ').slice(1).join(' ')}`}>
          {score ?? 0}%
        </span>
      </div>
      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorMap[color].split(' ')[0]}`}
          style={{ width: `${Math.min(100, Math.max(0, score ?? 0))}%` }}
        />
      </div>
    </div>
  );
};

const AIResolutionVerificationModal = ({
  isOpen,
  onClose,
  challenge,
  onVerificationComplete,
  currentUser: propUser
}) => {
  const loggedInUser = useMemo(() => {
    if (propUser && propUser.name) return propUser;
    try {
      return JSON.parse(localStorage.getItem('userInfo')) || {};
    } catch {
      return {};
    }
  }, [propUser]);

  // Local state
  const [challengeData, setChallengeData] = useState(challenge || null);
  const [beforePreview, setBeforePreview] = useState(null);
  const [afterPreview, setAfterPreview] = useState(null);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [verifierComments, setVerifierComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [activeTab, setActiveTab] = useState('verification'); // 'verification' | 'history'
  const [zoomImage, setZoomImage] = useState(null); // null | { src, title }

  // Sync challenge prop
  useEffect(() => {
    if (!challenge) return;
    setChallengeData(challenge);
    const ver = challenge.resolutionVerification || {};
    if (ver.beforeImage?.url) setBeforePreview(ver.beforeImage.url);
    if (ver.afterImage?.url) setAfterPreview(ver.afterImage.url);
    setErrorMsg('');
    setSuccessMsg('');
    setVerifierComments('');
    setRejectionReason('');
  }, [challenge, isOpen]);

  // Fetch latest status on open
  const fetchStatus = useCallback(async () => {
    const trkId = challengeData?.trackerId || challengeData?.id;
    if (!trkId) return;
    try {
      const res = await axios.get(`${API}/api/verification/status/${trkId}`);
      if (res.data) {
        setChallengeData(prev => ({
          ...prev,
          status: res.data.status,
          markResolved: res.data.markResolved,
          resolutionVerification: res.data.resolutionVerification
        }));
        const ver = res.data.resolutionVerification || {};
        if (ver.beforeImage?.url) setBeforePreview(ver.beforeImage.url);
        if (ver.afterImage?.url) setAfterPreview(ver.afterImage.url);
      }
    } catch (err) {
      console.warn('Failed to refresh status:', err.message);
    }
  }, [challengeData?.trackerId, challengeData?.id]);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen, fetchStatus]);

  if (!isOpen || !challengeData) return null;

  const ver = challengeData.resolutionVerification || {};
  const hasBefore = !!(beforePreview || ver.beforeImage?.url);
  const hasAfter = !!(afterPreview || ver.afterImage?.url);
  const isAnalyzed = ver.analysisStatus === 'COMPLETED' || !!ver.resolutionAssessment || typeof ver.imageQualityScore === 'number';

  // Segregation of duties check
  const respEmpId = (challengeData.responsiblePersonEmployeeId || '').trim().toUpperCase();
  const currentEmpId = (loggedInUser.employeeId || '').trim().toUpperCase();
  const respUserId = String(challengeData.responsiblePersonId || '');
  const currentUserId = String(loggedInUser._id || loggedInUser.id || '');
  const isResponsiblePerson = (respEmpId && currentEmpId && respEmpId === currentEmpId) ||
    (respUserId && currentUserId && respUserId === currentUserId) ||
    (challengeData.responsiblePersonName && loggedInUser.name && challengeData.responsiblePersonName.toLowerCase() === loggedInUser.name.toLowerCase());

  const canVerifyRole = ['superadmin', 'hod', 'supervisor'].includes((loggedInUser.role || '').toLowerCase());
  const canApprove = canVerifyRole && !isResponsiblePerson;

  // Handle image upload
  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 10MB limit.');
      return;
    }

    const setLoader = type === 'before' ? setUploadingBefore : setUploadingAfter;
    setLoader(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const trkId = challengeData.trackerId || challengeData.id;

        const res = await axios.post(`${API}/api/verification/upload-evidence`, {
          trackerId: trkId,
          imageType: type,
          fileName: file.name,
          fileData: base64Data,
          mimeType: file.type,
          uploadedBy: loggedInUser.name || 'User',
          uploadedByEmployeeId: loggedInUser.employeeId || '',
          userRole: loggedInUser.role || 'employee'
        });

        if (res.data?.success) {
          if (type === 'before') {
            setBeforePreview(res.data.fileUrl);
          } else {
            setAfterPreview(res.data.fileUrl);
          }
          await fetchStatus();
          setSuccessMsg(`${type === 'before' ? 'Before' : 'After'} evidence image uploaded successfully.`);
        }
      } catch (err) {
        setErrorMsg(err.response?.data?.error || err.message || 'Failed to upload image.');
      } finally {
        setLoader(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run AI Verification
  const handleTriggerAnalysis = async () => {
    if (!hasBefore || !hasAfter) {
      setErrorMsg('Both Before and After evidence photos are required to run AI verification.');
      return;
    }

    setAnalyzing(true);
    setErrorMsg('');
    setSuccessMsg('');
    setAnalysisStep('Initiating Gemini Vision resolution analysis...');

    try {
      const trkId = challengeData.trackerId || challengeData.id;
      setTimeout(() => setAnalysisStep('Evaluating problem-specific criteria & same-area markers...'), 1200);
      setTimeout(() => setAnalysisStep('Analyzing multi-dimensional evidence quality & improvement score...'), 2400);

      const res = await axios.post(`${API}/api/verification/analyze/${trkId}`, {
        requestedBy: loggedInUser.name || 'User',
        requestedByEmployeeId: loggedInUser.employeeId || '',
        requestedByRole: loggedInUser.role || 'employee'
      });

      if (res.data?.success) {
        setSuccessMsg('AI Resolution Analysis completed successfully.');
        const updatedReport = res.data.report || res.data.challenge?.resolutionVerification;
        const updatedChallenge = res.data.challenge || {
          ...challengeData,
          status: 'PENDING_VERIFICATION',
          resolutionVerification: updatedReport
        };
        setChallengeData(prev => ({
          ...prev,
          ...updatedChallenge,
          status: updatedChallenge.status || 'PENDING_VERIFICATION',
          resolutionVerification: updatedReport
        }));
        if (onVerificationComplete) {
          onVerificationComplete(updatedChallenge);
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'AI verification failed.');
    } finally {
      setAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // Submit Human Verification Decision
  const handleDecision = async (decision) => {
    if (decision === 'REJECT' && !verifierComments.trim() && !rejectionReason.trim()) {
      setErrorMsg('Please enter a comment or reason when rejecting resolution.');
      return;
    }

    setSubmittingDecision(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const trkId = challengeData.trackerId || challengeData.id;
      const res = await axios.post(`${API}/api/verification/verify/${trkId}`, {
        decision,
        verifierComments: verifierComments.trim(),
        rejectionReason: rejectionReason.trim() || verifierComments.trim(),
        currentUser: {
          id: loggedInUser._id || loggedInUser.id,
          employeeId: loggedInUser.employeeId,
          name: loggedInUser.name,
          role: loggedInUser.role
        }
      });

      if (res.data?.success) {
        setSuccessMsg(`Challenge successfully ${decision === 'APPROVE' ? 'approved and closed' : 'rejected and reopened'}.`);
        setChallengeData(res.data.challenge);
        onVerificationComplete && onVerificationComplete(res.data.challenge);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to submit decision.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Assessment badge styling & calculation
  const getModalAssessment = () => {
    const reason = (ver.analysisReason || '').toLowerCase();
    const sameArea = ver.sameAreaConfidence;
    const suspicious = ver.suspiciousEvidence;
    const rec = ver.verificationRecommendation;

    // 1. Place / Location Mismatched
    if (
      suspicious ||
      (sameArea !== undefined && sameArea < 60) ||
      reason.includes('location mismatch') ||
      reason.includes('different area') ||
      reason.includes('place')
    ) {
      if (reason.includes('same image') || reason.includes('identical')) {
        return { label: 'Duplicate Image (Retake Required)', cls: 'bg-rose-600 text-white border-rose-700', icon: <AlertTriangle size={14} /> };
      }
      return { label: 'Place Mismatched (Location Mismatch)', cls: 'bg-rose-600 text-white border-rose-700', icon: <AlertTriangle size={14} /> };
    }

    // 2. Retake Image Required
    if (
      rec === 'REJECT_OR_RETAKE_IMAGE' ||
      ver.resolutionAssessment === 'INSUFFICIENT_EVIDENCE' ||
      reason.includes('retake') ||
      reason.includes('blurry') ||
      (ver.imageQualityScore !== undefined && ver.imageQualityScore < 55)
    ) {
      return { label: 'Retake Image Required (Low Quality)', cls: 'bg-amber-600 text-white border-amber-700', icon: <RefreshCw size={14} /> };
    }

    const assessmentCfg = {
      LIKELY_RESOLVED: { label: 'Likely Resolved', cls: 'bg-emerald-500 text-white border-emerald-600', icon: <CheckCircle2 size={14} /> },
      PARTIALLY_RESOLVED: { label: 'Partially Resolved', cls: 'bg-amber-500 text-white border-amber-600', icon: <AlertTriangle size={14} /> },
      NOT_RESOLVED: { label: 'Not Resolved', cls: 'bg-rose-500 text-white border-rose-600', icon: <XCircle size={14} /> },
      INSUFFICIENT_EVIDENCE: { label: 'Retake Image Required', cls: 'bg-amber-600 text-white border-amber-700', icon: <RefreshCw size={14} /> }
    };

    return assessmentCfg[ver.resolutionAssessment] || assessmentCfg.INSUFFICIENT_EVIDENCE;
  };

  const currentAssessment = getModalAssessment();

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[220] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] w-full max-w-4xl my-auto flex flex-col shadow-2xl border border-slate-100 overflow-hidden relative"
        style={{ maxHeight: '92vh', animation: 'scaleUp 0.18s ease-out forwards' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center shadow-md">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs uppercase tracking-wider text-orange-400">
                  {challengeData.trackerId || challengeData.id || 'Challenge'}
                </span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                  challengeData.status === 'CLOSED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  challengeData.status === 'REOPENED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {challengeData.status || (challengeData.markResolved ? 'CLOSED' : 'OPEN')}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-300 line-clamp-1 max-w-md">
                {challengeData.description || 'AI Challenge Resolution Verification'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'verification' ? 'history' : 'verification')}
              className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Clock size={13} /> {activeTab === 'verification' ? 'Audit History' : 'Verification'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Alerts Banner */}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-100 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {activeTab === 'verification' ? (
            <>
              {/* Challenge summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Department & Shift</span>
                  <span className="font-bold text-slate-700">{(challengeData.department || 'General').toUpperCase()} · Shift {challengeData.shift || '1'}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Incident Type</span>
                  <span className="font-bold text-slate-700">{challengeData.alertIncidentType || challengeData.errorType || 'Issue'}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Responsible Person</span>
                  <span className="font-bold text-slate-700 truncate block">{challengeData.responsiblePersonName || 'Unassigned'}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Reported By</span>
                  <span className="font-bold text-slate-700 truncate block">{challengeData.reportedByName || 'System'}</span>
                </div>
              </div>

              {/* Side-by-Side Image Comparison Panel */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    📷 Problem-Specific Visual Evidence
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Upload clear photos of the reported problem area
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Before Evidence Card */}
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                        Before Evidence
                      </span>
                      {hasBefore && (
                        <button
                          onClick={() => setZoomImage({ src: beforePreview || ver.beforeImage?.url, title: 'Before Corrective Action' })}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                          <ZoomIn size={13} /> Zoom
                        </button>
                      )}
                    </div>

                    <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-200 group">
                      {beforePreview || ver.beforeImage?.url ? (
                        <img
                          src={beforePreview || ver.beforeImage?.url}
                          alt="Before evidence"
                          className="w-full h-full object-contain cursor-pointer transition-transform duration-200 group-hover:scale-105"
                          onClick={() => setZoomImage({ src: beforePreview || ver.beforeImage?.url, title: 'Before Corrective Action' })}
                        />
                      ) : (
                        <div className="text-center p-4 text-slate-400">
                          <Upload size={24} className="mx-auto mb-1 text-slate-500" />
                          <p className="text-[11px] font-bold">No Before Image Uploaded</p>
                        </div>
                      )}

                      {uploadingBefore && (
                        <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center text-white text-xs font-bold gap-2">
                          <Loader2 size={16} className="animate-spin text-orange-400" /> Uploading...
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <label className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-sm flex items-center gap-1.5">
                        <Upload size={12} /> {hasBefore ? 'Change Photo' : 'Upload Before Photo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={e => handleFileUpload(e, 'before')}
                          disabled={uploadingBefore || analyzing}
                        />
                      </label>
                      {ver.beforeImage?.uploadedAt && (
                        <span className="text-[9px] text-slate-400 font-bold">
                          {new Date(ver.beforeImage.uploadedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* After Evidence Card */}
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        After Evidence
                      </span>
                      {hasAfter && (
                        <button
                          onClick={() => setZoomImage({ src: afterPreview || ver.afterImage?.url, title: 'After Corrective Action' })}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                          <ZoomIn size={13} /> Zoom
                        </button>
                      )}
                    </div>

                    <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-200 group">
                      {afterPreview || ver.afterImage?.url ? (
                        <img
                          src={afterPreview || ver.afterImage?.url}
                          alt="After evidence"
                          className="w-full h-full object-contain cursor-pointer transition-transform duration-200 group-hover:scale-105"
                          onClick={() => setZoomImage({ src: afterPreview || ver.afterImage?.url, title: 'After Corrective Action' })}
                        />
                      ) : (
                        <div className="text-center p-4 text-slate-400">
                          <Upload size={24} className="mx-auto mb-1 text-slate-500" />
                          <p className="text-[11px] font-bold">No After Image Uploaded</p>
                        </div>
                      )}

                      {uploadingAfter && (
                        <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center text-white text-xs font-bold gap-2">
                          <Loader2 size={16} className="animate-spin text-orange-400" /> Uploading...
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <label className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-sm flex items-center gap-1.5">
                        <Upload size={12} /> {hasAfter ? 'Change Photo' : 'Upload After Photo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={e => handleFileUpload(e, 'after')}
                          disabled={uploadingAfter || analyzing}
                        />
                      </label>
                      {ver.afterImage?.uploadedAt && (
                        <span className="text-[9px] text-slate-400 font-bold">
                          {new Date(ver.afterImage.uploadedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Verification Trigger Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/40 border border-orange-200 rounded-2xl">
                <div>
                  <h4 className="text-xs font-black uppercase text-orange-950 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-orange-500" /> AI Vision Resolution Verification
                  </h4>
                  <p className="text-[11px] text-orange-800/80 font-medium mt-0.5">
                    Evaluates Before/After evidence against problem criteria, location landmarks, and visual resolution.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerAnalysis}
                  disabled={!hasBefore || !hasAfter || analyzing}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase transition-all flex items-center gap-2 shadow-md shrink-0 ${
                    !hasBefore || !hasAfter
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : analyzing
                      ? 'bg-orange-500 text-white cursor-wait animate-pulse'
                      : 'bg-orange-600 hover:bg-orange-700 text-white active:scale-95'
                  }`}
                >
                  {analyzing ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Analyzing Evidence...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} /> {isAnalyzed ? 'Re-Analyze Evidence' : 'Analyze With AI'}
                    </>
                  )}
                </button>
              </div>

              {/* Live Analysis Progress Bar */}
              {analyzing && (
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="flex items-center gap-2 text-orange-400">
                      <Loader2 size={14} className="animate-spin" /> {analysisStep || 'AI Analysis in progress...'}
                    </span>
                    <span className="text-slate-400 text-[10px]">Gemini Vision Model</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-400 h-full w-2/3 animate-pulse rounded-full" />
                  </div>
                </div>
              )}

              {/* AI Evidence Report Card */}
              {isAnalyzed && (
                <div className="border border-slate-200 rounded-3xl p-5 bg-white shadow-sm space-y-4">
                  {/* Assessment Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-slate-400 tracking-wider">AI Assessment:</span>
                      <span className={`text-xs font-black px-3 py-1 rounded-full border flex items-center gap-1.5 ${currentAssessment.cls}`}>
                        {currentAssessment.icon} {currentAssessment.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500 font-bold">
                        AI Confidence: <strong className="text-slate-900">{ver.resolutionConfidence ?? 0}%</strong>
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        Model: {ver.aiModel || 'Gemini Vision'}
                      </span>
                    </div>
                  </div>

                  {/* Suspicious Evidence Warning Banner */}
                  {ver.suspiciousEvidence && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-800 text-xs">
                      <AlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-black uppercase text-[10px] tracking-wider text-amber-900">
                          ⚠️ Suspicious / Ambiguous Visual Evidence Flagged
                        </strong>
                        <p className="text-[11px] font-medium leading-relaxed mt-0.5">
                          {ver.analysisReason || 'The AI detected low same-area confidence or duplicate image characteristics. Detailed manual inspection is required.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Multi-Dimensional Scores Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <ScoreGauge
                      label="Same Area"
                      score={ver.sameAreaConfidence}
                      color="blue"
                      minThreshold={60}
                      icon={<Eye size={12} />}
                    />
                    <ScoreGauge
                      label="Image Quality"
                      score={ver.imageQualityScore}
                      color="purple"
                      minThreshold={55}
                      icon={<Sparkles size={12} />}
                    />
                    <ScoreGauge
                      label="Evidence Quality"
                      score={ver.evidenceQualityScore}
                      color="orange"
                      minThreshold={50}
                      icon={<FileText size={12} />}
                    />
                    <ScoreGauge
                      label="Improvement"
                      score={ver.visualImprovementScore}
                      color="emerald"
                      minThreshold={70}
                      icon={<CheckCircle2 size={12} />}
                    />
                  </div>

                  {/* Problem detection status */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-500">Problem Detected Before:</span>
                      <span className={`font-black px-2.5 py-0.5 rounded-full text-[10px] ${
                        ver.problemDetectedBefore ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {ver.problemDetectedBefore ? 'YES' : 'NO / UNCLEAR'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-500">Problem Detected After:</span>
                      <span className={`font-black px-2.5 py-0.5 rounded-full text-[10px] ${
                        ver.problemDetectedAfter ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {ver.problemDetectedAfter ? 'YES (STILL PRESENT)' : 'NO (RESOLVED)'}
                      </span>
                    </div>
                  </div>

                  {/* Analysis Reason Explanation */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      AI Analysis Findings & Reasoning
                    </span>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                      {ver.analysisReason || 'Visual inspection shows corrective changes between Before and After evidence.'}
                    </p>
                  </div>

                  {/* Conditions Detected Lists */}
                  {(ver.detectedBeforeConditions?.length > 0 || ver.detectedAfterConditions?.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {ver.detectedBeforeConditions?.length > 0 && (
                        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-3">
                          <span className="text-[9px] font-black uppercase text-rose-600 block mb-1.5">
                            Detected in Before Photo:
                          </span>
                          <ul className="space-y-1">
                            {ver.detectedBeforeConditions.map((cond, idx) => (
                              <li key={idx} className="text-[11px] font-medium text-slate-700 flex items-start gap-1.5">
                                <span className="text-rose-500 font-bold">•</span> {cond}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {ver.detectedAfterConditions?.length > 0 && (
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3">
                          <span className="text-[9px] font-black uppercase text-emerald-600 block mb-1.5">
                            Observed in After Photo:
                          </span>
                          <ul className="space-y-1">
                            {ver.detectedAfterConditions.map((cond, idx) => (
                              <li key={idx} className="text-[11px] font-medium text-slate-700 flex items-start gap-1.5">
                                <span className="text-emerald-500 font-bold">•</span> {cond}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Advisory Disclaimer */}
                  <div className="text-[10px] font-bold text-slate-400 text-center italic pt-1">
                    ℹ️ AI analysis is advisory. Final challenge closure requires independent human verification.
                  </div>
                </div>
              )}

              {/* Independent Human Verifier Panel */}
              <div className="border border-slate-200 rounded-3xl p-5 bg-slate-900 text-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Independent Human Verification
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    Verifier: {loggedInUser.name || 'User'} ({loggedInUser.role || 'Role'})
                  </span>
                </div>

                {/* Segregation of duties alert if user is responsible person */}
                {isResponsiblePerson && (
                  <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl flex items-start gap-2.5 text-rose-200 text-xs">
                    <ShieldAlert size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-black uppercase text-[10px] tracking-wider text-rose-300">
                        ⛔ Segregation of Duties Enforced
                      </strong>
                      <p className="text-[11px] font-medium leading-relaxed mt-0.5 text-rose-200">
                        You are designated as the Responsible Person for this challenge. Independent verification is required — you cannot approve your own resolution closure.
                      </p>
                    </div>
                  </div>
                )}

                {/* Verifier comments input */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Verifier Comments / Rejection Rationale
                  </label>
                  <textarea
                    rows={2}
                    value={verifierComments}
                    onChange={e => setVerifierComments(e.target.value)}
                    placeholder="Enter observation notes, verification comments, or reason for reopening..."
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-medium"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    onClick={() => handleDecision('APPROVE')}
                    disabled={!canApprove || submittingDecision}
                    className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 shadow-lg ${
                      !canApprove
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : submittingDecision
                        ? 'bg-emerald-600 text-white cursor-wait opacity-75'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                    }`}
                  >
                    <CheckCircle2 size={15} /> Approve & Close Challenge
                  </button>

                  <button
                    onClick={() => handleDecision('REJECT')}
                    disabled={!canVerifyRole || submittingDecision}
                    className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 shadow-lg ${
                      !canVerifyRole
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : submittingDecision
                        ? 'bg-rose-600 text-white cursor-wait opacity-75'
                        : 'bg-rose-600 hover:bg-rose-500 text-white active:scale-95'
                    }`}
                  >
                    <XCircle size={15} /> Reject & Reopen Issue
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Audit History Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  📜 Complete Verification Audit Trail
                </h3>
                <span className="text-[10px] font-bold text-slate-400">
                  {(ver.verificationHistory || []).length} Recorded Actions
                </span>
              </div>

              {(!ver.verificationHistory || ver.verificationHistory.length === 0) ? (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  No verification actions recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ver.verificationHistory.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-start justify-between text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                            item.action === 'VERIFIED_APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                            item.action === 'VERIFIED_REJECTED' ? 'bg-rose-100 text-rose-700' :
                            item.action === 'AI_ANALYSIS' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {item.action.replace('_', ' ')}
                          </span>
                          <span className="font-bold text-slate-700">by {item.performedBy || 'System'}</span>
                          {item.performedByRole && (
                            <span className="text-[9px] text-slate-400">({item.performedByRole})</span>
                          )}
                        </div>
                        {item.details && Object.keys(item.details).length > 0 && (
                          <p className="text-[11px] text-slate-500 font-medium">
                            {JSON.stringify(item.details)}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString('en-GB') : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <span className="text-[10px] font-bold text-slate-400">
            QDSHI AI Vision Verification System · v1.0
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase transition-all"
          >
            Close
          </button>
        </div>
      </div>

      {/* Fullscreen Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[250] flex flex-col items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <div className="w-full max-w-5xl flex justify-between items-center text-white mb-3 px-2">
            <span className="text-xs font-black uppercase tracking-wider">{zoomImage.title}</span>
            <button
              onClick={() => setZoomImage(null)}
              className="text-white/80 hover:text-white p-1 rounded-full bg-white/10 hover:bg-white/20"
            >
              <X size={20} />
            </button>
          </div>
          <img
            src={zoomImage.src}
            alt={zoomImage.title}
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AIResolutionVerificationModal;
