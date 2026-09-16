import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export const showDetailedAuditLog = (log) => {
  if (!log) return;

  const trackerId = log.trackerId || log.id || (log._id ? `ACT-${log._id.toString().slice(-6).toUpperCase()}` : 'CHALLENGE DETAILS');
  const occDate = log.date || log.rawDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const occTime = log.occurredTime || log.time || new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  const severity = log.severity || 'Medium';
  const devType = log.errorType || log.deviationType || 'Other';
  const alerts = log.alertIncidentType || (Array.isArray(log.alertTypes) && log.alertTypes.length > 0 ? log.alertTypes.join(', ') : 'Quality Compliance');
  
  const desc = log.description || log.name || log.actionNotes || log.action || 'Quality / Safety Action Event Logged.';
  
  const respName = log.responsiblePersonName || log.responsiblePerson?.name || (log.assignedName && log.assignedName !== 'N/A' ? log.assignedName : null) || (typeof log.responsiblePerson === 'string' && log.responsiblePerson.length > 0 ? log.responsiblePerson : null) || log.reportedByName || log.reporter || 'System User';
  const respId = log.responsiblePersonEmployeeId || log.responsiblePerson?.employeeId || log.responsiblePersonId || log.assignedId || log.reportedByEmployeeId || 'EMP-101';
  
  const repName = log.reportedByName || log.reportedBy?.name || log.reporter || (typeof log.reportedBy === 'string' ? log.reportedBy : null) || log.responsiblePersonName || 'Quality Supervisor';
  const repId = log.reportedByEmployeeId || log.reportedBy?.employeeId || log.reportedByUserId || 'SUP-001';

  const capa = log.capa || log.actionNotes || log.action || 'Corrective & Preventive Action (CAPA) logged and executed.';
  const status = log.status || (log.markResolved || log.resolved ? 'RESOLVED' : (log.actionStatus || 'PENDING'));
  
  const ver = log.resolutionVerification || log.aiAnalysis || {};
  const beforeUrl = log.beforeImage?.secure_url || log.beforeImage?.url || log.beforeUrl || ver.beforeImage?.secure_url || ver.beforeImage?.url || null;
  const afterUrl = log.afterImage?.secure_url || log.afterImage?.url || log.afterUrl || ver.afterImage?.secure_url || ver.afterImage?.url || null;

  const aiModel = ver.aiModel || log.aiAnalysis?.model || 'Gemini Vision AI';
  const aiReason = ver.analysisReason || log.aiAnalysis?.recommendation || '';
  const reasonLower = aiReason.toLowerCase();
  
  let aiAssessment = ver.resolutionAssessment ? ver.resolutionAssessment.replace(/_/g, ' ') : (ver.analysisStatus === 'COMPLETED' ? 'Resolution Supported' : 'Pending Verification');
  if (
    ver.suspiciousEvidence ||
    (ver.sameAreaConfidence !== undefined && ver.sameAreaConfidence < 60) ||
    reasonLower.includes('location mismatch') ||
    reasonLower.includes('different area') ||
    reasonLower.includes('place')
  ) {
    aiAssessment = '⚠️ Place Mismatched (Location Mismatch)';
  } else if (
    ver.verificationRecommendation === 'REJECT_OR_RETAKE_IMAGE' ||
    ver.resolutionAssessment === 'INSUFFICIENT_EVIDENCE' ||
    reasonLower.includes('retake') ||
    reasonLower.includes('blurry')
  ) {
    aiAssessment = '📷 Retake Image Required';
  }
  const aiConfidence = ver.resolutionConfidence || ver.sameAreaConfidence || log.aiAnalysis?.confidence || 0;

  const isResolved = log.markResolved || log.resolved || status === 'RESOLVED' || status === 'CLOSED';
  const resolvedOnStr = log.resolvedAt ? new Date(log.resolvedAt).toLocaleString('en-GB') : (isResolved ? occDate : 'Pending');

  MySwal.fire({
    title: `<div class="text-left"><span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Detailed Audit Log</span><h3 class="text-lg font-black text-slate-800 tracking-tight mt-0.5">${trackerId}</h3></div>`,
    width: '680px',
    html: `
      <div class="text-left space-y-4 text-xs p-2 text-slate-700 select-text">
        
        <div class="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
          <div>
            <strong class="text-slate-400 uppercase text-[9px] font-black tracking-wider block">Occurred Date & Time</strong>
            <span class="font-bold text-slate-800 text-sm mt-0.5 block">${occDate} at ${occTime}</span>
          </div>
          <div>
            <strong class="text-slate-400 uppercase text-[9px] font-black tracking-wider block">Severity / Rating</strong>
            <span class="mt-1 inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
              severity === 'Critical' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
              severity === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
            }">${severity} Severity</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
          <div>
            <strong class="text-slate-400 uppercase text-[9px] font-black tracking-wider block">Deviation Type</strong>
            <span class="font-bold text-slate-800 block mt-0.5">${devType}</span>
            ${log.otherErrorType ? `<span class="text-[10px] text-slate-400 font-bold block mt-0.5">Specify: ${log.otherErrorType}</span>` : ''}
          </div>
          <div>
            <strong class="text-slate-400 uppercase text-[9px] font-black tracking-wider block">Alert / Incident Type</strong>
            <span class="font-bold text-orange-600 block mt-0.5">${alerts}</span>
          </div>
        </div>

        <div class="border-b border-slate-100 pb-3">
          <strong class="text-slate-400 uppercase text-[9px] font-black tracking-wider block">Description of Challenge</strong>
          <p class="mt-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100/60 font-medium leading-relaxed text-slate-700 whitespace-pre-line">${desc}</p>
        </div>

        <div class="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
          <div>
            <strong class="text-slate-400 uppercase text-[9px] font-black tracking-wider block">Responsible Person</strong>
            <span class="font-bold text-slate-800 mt-0.5 block">${respName}</span>
            <span class="text-[10px] text-slate-400 font-bold block">ID: ${respId}</span>
          </div>
          <div>
            <strong class="text-slate-400 uppercase text-[9px] font-black tracking-wider block">Reported By</strong>
            <span class="font-bold text-slate-800 mt-0.5 block">${repName}</span>
            <span class="text-[10px] text-slate-400 font-bold block">ID: ${repId}</span>
          </div>
        </div>

        <div class="border-b border-slate-100 pb-3">
          <strong class="text-slate-400 uppercase text-[9px] font-black tracking-wider block mb-2">Problem-Specific Visual Evidence</strong>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex flex-col items-center">
              <span class="text-[9px] font-black text-slate-400 uppercase mb-1.5">BEFORE IMAGE</span>
              ${beforeUrl ? `<img src="${beforeUrl}" class="w-full h-32 object-cover rounded-xl border border-slate-200" alt="Before Evidence" />` : '<div class="w-full h-32 bg-slate-100 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-bold italic">No Before Image Uploaded</div>'}
            </div>
            <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex flex-col items-center">
              <span class="text-[9px] font-black text-slate-400 uppercase mb-1.5">AFTER IMAGE</span>
              ${afterUrl ? `<img src="${afterUrl}" class="w-full h-32 object-cover rounded-xl border border-slate-200" alt="After Evidence" />` : '<div class="w-full h-32 bg-slate-100 rounded-xl flex items-center justify-center text-[10px] text-amber-600 font-bold italic text-center p-2">Waiting for Responsible Person Resolution</div>'}
            </div>
          </div>
        </div>

        <div class="border-b border-slate-100 pb-3">
          <strong class="text-slate-400 uppercase text-[9px] font-black tracking-wider block">CAPA / Corrective Action Plan</strong>
          <div class="mt-1.5 p-3 rounded-2xl bg-emerald-50/20 border border-emerald-100/40 text-slate-700">
            <div class="flex justify-between items-center mb-1">
              <span class="text-[10px] font-black uppercase text-emerald-800 tracking-wide">Status: ${status}</span>
              <span class="text-[10px] font-black text-slate-400">Resolved: ${resolvedOnStr}</span>
            </div>
            <p class="font-semibold text-xs leading-relaxed mt-1">${capa}</p>
          </div>
        </div>

        ${ver.analysisStatus === 'COMPLETED' || log.aiAnalysis ? `
        <div class="bg-gradient-to-r from-orange-50/60 to-amber-50/60 border border-orange-200/60 rounded-2xl p-3.5 space-y-1.5">
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-black uppercase text-orange-700 tracking-wide flex items-center gap-1">✨ AI Verification (${aiModel})</span>
            <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">${aiConfidence}% Confidence</span>
          </div>
          <p class="text-xs font-bold text-slate-800">Assessment: <span class="text-emerald-700">${aiAssessment}</span></p>
          ${aiReason ? `<p class="text-[10.5px] text-slate-600 font-medium italic">${aiReason}</p>` : ''}
        </div>
        ` : ''}

      </div>
    `,
    confirmButtonText: 'CLOSE AUDIT LOG',
    confirmButtonColor: '#0f172a',
    customClass: {
      confirmButton: 'rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-wider',
      popup: 'rounded-[2rem] p-6'
    }
  });
};
