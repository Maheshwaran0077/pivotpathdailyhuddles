import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, Send, Shield, Sparkles, Bot, User, 
  Mail, Users, CheckCircle, AlertTriangle, Play, Loader2
} from 'lucide-react';
import axios from 'axios';

// Backend API endpoint configuration
const API_URL = 'http://localhost:8000';

const ChatbotWidget = ({ onOpenRichText, summaryData, onRefreshSummary }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      type: 'text',
      content: '👋 Welcome back, Superadmin! I am your **AI Operations Assistant**.\n\nAsk me about today\'s status, alert breakdowns, HOD contacts, or use the quick access chips below to monitor the plant telemetry.',
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // Tracks prompt confirmation workflows
  const [selectedHodForMail, setSelectedHodForMail] = useState(null); // Tracks HOD active in email quick actions
  const [hasUnread, setHasUnread] = useState(true);
  
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);

  // Auto-scroll messages to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
    }
  }, [isOpen]);

  const addMessage = (sender, type, content) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender,
        type,
        content,
        timestamp: new Date()
      }
    ]);
  };

  const handleSend = async (customText = '') => {
    const textToSend = customText.trim() || input.trim();
    if (!textToSend) return;

    if (!customText) {
      setInput('');
    }

    addMessage('user', 'text', textToSend);
    setLoading(true);
    setPendingAction(null); // Cancel previous workflow on new input

    // Simulate thinking delay for chatbot realism
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

    const lowercaseText = textToSend.toLowerCase();

    const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    let matchedMonth = null;
    for (const m of monthNames) {
      if (lowercaseText.includes(m)) {
        matchedMonth = m;
        break;
      }
    }

    // Intent detection logic
    if (lowercaseText.includes('hi') || lowercaseText.includes('hello') || lowercaseText.includes('hey')) {
      addMessage('bot', 'text', 'Greetings, Superadmin! How can I assist you with today\'s metrics and HOD dispatches?');
      setLoading(false);
    } 
    else if (matchedMonth) {
      try {
        const response = await axios.get(`${API_URL}/api/v1/admin/summary?period=overall&month=${matchedMonth}`);
        const monthData = response.data;
        
        addMessage('bot', 'text', `📅 **Operations Summary for ${matchedMonth.toUpperCase()}:**\n\n` + 
          `• **Overall Yield:** ${monthData.success_count} Green · ${monthData.alert_count} Red\n` +
          `• **Total Successes:** ${monthData.success_count} logs\n` +
          `• **Total Alerts:** ${monthData.alert_count} active alerts\n` +
          `• **Total Errors:** ${monthData.error_count} mechanical breakdowns\n\n` +
          `*Period filter applied: ${monthData.period} across all shifts (Shifts 1, 2, 3).*`
        );
        
        // Also show top alert ranking for that month
        const sortedDepts = [...(monthData?.departments || [])].sort((a, b) => b.alert_count - a.alert_count);
        if (sortedDepts.length > 0 && sortedDepts[0].alert_count > 0) {
          const topList = sortedDepts.slice(0, 3).map((d, i) => `${i+1}. **${d.name}**: ${d.alert_count} Alerts`).join('\n');
          
          setTimeout(() => {
            addMessage('bot', 'text', `🚨 **Top Alert Departments in ${matchedMonth.toUpperCase()}:**\n\n${topList}\n\n💡 Wanna see the supervisor?`);
            
            setPendingAction({
              type: 'confirm_supervisors',
              departments: sortedDepts.slice(0, 3).map(d => d.key)
            });
          }, 400);
        } else {
          setTimeout(() => {
            addMessage('bot', 'text', `✨ Excellent news! All departments report **0 active alerts** for ${matchedMonth.toUpperCase()}.`);
          }, 400);
        }
      } catch (err) {
        console.error(err);
        addMessage('bot', 'text', `❌ Failed to fetch database yields for ${matchedMonth}.`);
      } finally {
        setLoading(false);
      }
    }
    else if (lowercaseText.includes('status') || lowercaseText.includes('today') || lowercaseText.includes('summary') || lowercaseText.includes('yield') || lowercaseText.includes('report')) {
      // Show Today's Status summary
      if (onRefreshSummary) await onRefreshSummary();
      
      addMessage('bot', 'summary', summaryData);
      
      // Prompt user to view HODs if there are Red or Orange alert departments
      const highRiskDepts = summaryData?.departments?.filter(d => d.risk_level === 'Red' || d.risk_level === 'Orange') || [];
      if (highRiskDepts.length > 0) {
        setTimeout(() => {
          setPendingAction({
            type: 'confirm_hods',
            departments: highRiskDepts.map(d => d.key)
          });
        }, 500);
      }
      setLoading(false);
    }
    else if (lowercaseText.includes('most alerts') || lowercaseText.includes('highest alerts') || lowercaseText.includes('worst department') || lowercaseText.includes('highest risk')) {
      const sortedDepts = [...(summaryData?.departments || [])].sort((a, b) => b.alert_count - a.alert_count);
      if (sortedDepts.length === 0 || sortedDepts[0].alert_count === 0) {
        addMessage('bot', 'text', '✨ Excellent news! All departments currently report **0 active alerts** in the database.');
      } else {
        const topDept = sortedDepts[0];
        const topDepts = sortedDepts.filter(d => d.alert_count === topDept.alert_count);
        
        let replyText = '';
        if (topDepts.length === 1) {
          replyText = `🚨 The department with the highest alert volume is **${topDept.name}** with **${topDept.alert_count}** alerts (Risk Level: **${topDept.risk_level}**).`;
        } else {
          const names = topDepts.map(d => `**${d.name}**`).join(', ');
          replyText = `🚨 The departments tied with the highest alert volume are ${names} with **${topDept.alert_count}** alerts each.`;
        }
        
        replyText += `\n\nHere are the top active alert rankings in this period (${summaryData.period}):\n\n`;
        replyText += sortedDepts.slice(0, 5).map((d, idx) => `${idx + 1}. **${d.name}**: ${d.alert_count} Alerts (Successes: ${d.success_count})`).join('\n');
        
        addMessage('bot', 'text', replyText);
        
        setPendingAction({
          type: 'confirm_hods',
          departments: topDepts.map(d => d.key)
        });
      }
      setLoading(false);
    }
    else if (lowercaseText.includes('alert') || lowercaseText.includes('error') || lowercaseText.includes('red') || lowercaseText.includes('critical')) {
      // Filter red and orange risk departments
      const issuesDepts = summaryData?.departments?.filter(d => d.alert_count > 0) || [];
      if (issuesDepts.length === 0) {
        addMessage('bot', 'text', '✨ Excellent news! All departments report **0 active alerts** for today. Operational health index is 100%.');
      } else {
        const listText = issuesDepts.map(d => `• **${d.name}**: ${d.alert_count} Alerts (${d.risk_level} Risk)`).join('\n');
        addMessage('bot', 'text', `🚨 **Active Department Alerts Today:**\n\n${listText}\n\nWould you like to contact their HODs?`);
        
        setPendingAction({
          type: 'confirm_hods',
          departments: issuesDepts.map(d => d.key)
        });
      }
      setLoading(false);
    }
    else if (lowercaseText.includes('hod') || lowercaseText.includes('contact') || lowercaseText.includes('directory') || lowercaseText.includes('manager')) {
      // List HOD Directory
      addMessage('bot', 'hod_list', summaryData?.departments || []);
      setLoading(false);
    }
    else if (lowercaseText.includes('help') || lowercaseText.includes('features')) {
      addMessage('bot', 'text', '💡 **I can parse the following conversational commands:**\n\n• `"status of today"` - Displays today\'s alerts, successes, and department risks.\n• `"alerts breakdown"` - Checks only departments with active anomalies.\n• `"HOD list"` - Views the current contact directory of managers.\n\nAlternatively, you can tap on the interactive department elements or quick action chips below.');
      setLoading(false);
    }
    else {
      addMessage('bot', 'text', 'I didn\'t quite catch that. Try asking:\n• "status of today"\n• "active alerts"\n• "HOD directory"\n\nOr click on the quick action chips below.');
      setLoading(false);
    }
  };

  const handleQuickChip = (command) => {
    handleSend(command);
  };

  // Confirm viewing HODs
  const handleConfirmHods = () => {
    if (!pendingAction) return;
    
    // Find departments that match
    const deptsToFilter = pendingAction.departments;
    const filteredHods = (summaryData?.departments || []).filter(d => deptsToFilter.includes(d.key));
    
    addMessage('bot', 'hod_list', filteredHods);
    setPendingAction(null);
  };

  // Confirm viewing Supervisors
  const handleConfirmSupervisors = () => {
    if (!pendingAction) return;
    
    const deptsToFilter = pendingAction.departments;
    const supervisorsList = [];
    (summaryData?.departments || []).forEach(dept => {
      if (deptsToFilter.includes(dept.key) && dept.supervisors) {
        dept.supervisors.forEach(sub => {
          supervisorsList.push({
            ...sub,
            dept_key: dept.key,
            dept_name: dept.name,
            risk_level: dept.risk_level,
            alert_count: dept.alert_count,
            success_count: dept.success_count,
            error_count: dept.error_count
          });
        });
      }
    });
    
    addMessage('bot', 'supervisor_list', supervisorsList);
    setPendingAction(null);
  };

  // Trigger quick-reply email dispatch
  const handleSendQuickReply = async (hod, messageText) => {
    setSelectedHodForMail(null); // Close quick replies layout
    setLoading(true);

    try {
      const todayStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
      
      const roleText = hod.isSupervisor ? `Supervisor Shift ${hod.shift}` : 'HOD';
      const emailSubject = `[URGENT RESPONSE REQUIRED] Administrative Notification - ${hod.dept_name || hod.name}`;
      const emailBody = `
        <p>Dear <strong>${hod.hod_name}</strong> (${roleText}),</p>
        <p>&nbsp;</p>
        <p>This is an automated dispatch from the SuperAdministrator regarding the performance profile of <strong>${hod.dept_name || hod.name}</strong> on <strong>${todayStr}</strong>.</p>
        <p>&nbsp;</p>
        <p>Message: <strong style="color: #ef4444; font-size: 15px;">"${messageText}"</strong></p>
        <p>&nbsp;</p>
        <p>Please review dashboard logs immediately and log compliance check-ins.</p>
        <p>&nbsp;</p>
        <p>Regards,<br/><strong>Superadministrator Portal</strong></p>
      `;

      const response = await axios.post(`${API_URL}/api/v1/admin/send-mail`, {
        recipient_email: hod.hod_email,
        subject: emailSubject,
        body: emailBody
      });

      if (response.data.status === 'success') {
        // Success bubble logged in chatbot
        addMessage('bot', 'text', `✉️ **Silent Email Dispatched Successfully!**\n\n**Recipient:** ${hod.hod_name} (${roleText} · ${hod.hod_email})\n**Message:** "${messageText}"\n\n*Dispatched silently via SMTP background pipeline.*`);
      }
    } catch (err) {
      console.error(err);
      addMessage('bot', 'text', `❌ **Mail Dispatch Failed**\n\nReason: ${err.response?.data?.detail || 'SMTP Server connection issue. Check configuration.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Render chatbot message bubbles
  const renderMessageContent = (msg) => {
    switch (msg.type) {
      case 'summary':
        const data = msg.content;
        return (
          <div className="bubble-summary-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p>📊 **Industrial Telemetry Yield: ${data.date_formatted}**</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '6px 0' }}>
              <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#ef4444' }}>ALERTS</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#ef4444' }}>{data.alert_count}</div>
              </div>
              <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#10b981' }}>SUCCESS</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#10b981' }}>{data.success_count}</div>
              </div>
              <div style={{ padding: '8px', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#f97316' }}>ERRORS</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#f97316' }}>{data.error_count}</div>
              </div>
            </div>
            
            <p style={{ fontSize: '10.5px', color: '#8ab6a9', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department Statuses (High Risk First):</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.departments?.map(dept => {
                const badgeColor = 
                  dept.risk_level === 'Red' ? '#ef4444' : 
                  dept.risk_level === 'Orange' ? '#f97316' : 
                  dept.risk_level === 'Amber' ? '#f59e0b' : '#10b981';
                
                return (
                  <div 
                    key={dept.key} 
                    onClick={() => {
                      setPendingAction({
                        type: 'confirm_hods',
                        departments: [dept.key]
                      });
                    }}
                    style={{ 
                      padding: '8px 12px', 
                      background: 'rgba(16, 185, 129, 0.05)', 
                      border: '1px solid rgba(16, 185, 129, 0.12)', 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    className="summary-bubble-item"
                  >
                    <div>
                      <div style={{ fontSize: '11.5px', fontWeight: '700' }}>{dept.name}</div>
                      <div style={{ fontSize: '9px', color: '#537f73' }}>Alerts: {dept.alert_count} · Success: {dept.success_count}</div>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '6px', background: `${badgeColor}15`, color: badgeColor, border: `1px solid ${badgeColor}33`, textTransform: 'uppercase' }}>
                      {dept.risk_level}
                    </span>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: '9px', color: '#537f73', textAlign: 'right', marginTop: '4px' }}>*Source: {data.data_source}</p>
          </div>
        );

      case 'hod_list':
        const list = msg.content;
        return (
          <div className="chat-hod-list">
            <p style={{ fontSize: '11.5px', fontWeight: '600' }}>📋 **HOD Operations Contacts:**</p>
            {list.map(hod => (
              <div key={hod.key} className="chat-hod-card">
                <div 
                  className="chat-hod-avatar"
                  style={{ 
                    background: 
                      hod.risk_level === 'Red' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 
                      hod.risk_level === 'Orange' ? 'linear-gradient(135deg, #f97316, #c2410c)' : 
                      hod.risk_level === 'Amber' ? 'linear-gradient(135deg, #f59e0b, #b45309)' : 
                      'linear-gradient(135deg, #10b981, #047857)' 
                  }}
                >
                  {hod.hod_name ? hod.hod_name.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase() : 'HD'}
                </div>
                
                <div className="chat-hod-meta">
                  <div className="chat-hod-name">{hod.hod_name}</div>
                  <div className="chat-hod-dept">{hod.name}</div>
                  <div className="chat-hod-mail">{hod.hod_email}</div>
                </div>
                
                <div className="chat-card-actions" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button 
                    className="btn-quick-reply"
                    onClick={() => setSelectedHodForMail(hod)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#60a5fa',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '9px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Quick Reply
                  </button>
                  <button 
                    className="btn-chat-action"
                    onClick={() => onOpenRichText(hod)}
                  >
                    <Mail size={10} />
                    Mail
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'supervisor_list':
        const subs = msg.content;
        return (
          <div className="chat-hod-list">
            <p style={{ fontSize: '11.5px', fontWeight: '600' }}>📋 **Supervisor Contacts:**</p>
            {subs.map(sub => (
              <div key={`${sub.employeeId}-${sub.shift}`} className="chat-hod-card">
                <div 
                  className="chat-hod-avatar"
                  style={{ 
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                  }}
                >
                  {sub.name ? sub.name.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase() : 'SV'}
                </div>
                
                <div className="chat-hod-meta">
                  <div className="chat-hod-name">{sub.name} (Shift {sub.shift})</div>
                  <div className="chat-hod-dept">{sub.dept_name}</div>
                  <div className="chat-hod-mail">{sub.email}</div>
                </div>
                
                <div className="chat-card-actions" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button 
                    className="btn-quick-reply"
                    onClick={() => setSelectedHodForMail({
                      ...sub,
                      hod_name: sub.name,
                      hod_email: sub.email,
                      isSupervisor: true
                    })}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#60a5fa',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '9px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Quick Reply
                  </button>
                  <button 
                    className="btn-chat-action"
                    onClick={() => onOpenRichText({
                      ...sub,
                      hod_name: sub.name,
                      hod_email: sub.email,
                      isSupervisor: true
                    })}
                  >
                    <Mail size={10} />
                    Mail
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'text':
      default:
        // Parse simple bold markdown
        const formattedText = msg.content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n/g, '<br/>');

        return <p dangerouslySetInnerHTML={{ __html: formattedText }} />;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chatbot-float">
      {/* Floating Action Button */}
      <button 
        className={`chatbot-btn ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        title="SuperAdmin AI Chatbot"
      >
        {!isOpen && <span className="btn-pulse" />}
        {hasUnread && !isOpen && <span className="badge-unread" />}
        
        {isOpen ? (
          <X size={20} className="text-emerald-300" />
        ) : (
          <div className="relative" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Body/Neck */}
              <rect x="11" y="24" width="12" height="6" rx="2" fill="#34d399" opacity="0.8"/>
              {/* Head */}
              <rect x="7" y="10" width="20" height="15" rx="5" fill="url(#robotGrad)" stroke="#10b981" strokeWidth="1.5"/>
              {/* Antenna */}
              <line x1="17" y1="10" x2="17" y2="4" stroke="#10b981" strokeWidth="1.5"/>
              <circle cx="17" cy="4" r="2.5" fill="#34d399"/>
              {/* Eyes */}
              <circle cx="12" cy="17" r="2" fill="#a7f3d0"/>
              <circle cx="22" cy="17" r="2" fill="#a7f3d0"/>
              {/* Mouth (Smile) */}
              <path d="M14 21C14 21 15.5 22.5 17 22.5C18.5 22.5 20 21 20 21" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/>
              {/* Waving Hand */}
              <g className="robot-hand-wave">
                {/* Hand Arm */}
                <path d="M26 16C28 14 30.5 11 30.5 9" stroke="#34d399" strokeWidth="2" strokeLinecap="round"/>
                {/* Fingers / Hello lines */}
                <path d="M28.5 7L29.5 8" stroke="#a7f3d0" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M30.5 6L30.5 7.5" stroke="#a7f3d0" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M32.5 7.5L31.5 8.5" stroke="#a7f3d0" strokeWidth="1.2" strokeLinecap="round"/>
              </g>
              <defs>
                <linearGradient id="robotGrad" x1="7" y1="10" x2="27" y2="25" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#042c22"/>
                  <stop offset="1" stopColor="#064e3b"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
      </button>

      {/* Chat Window Panel */}
      <div className={`chat-panel ${isOpen ? 'visible' : 'hidden'}`}>
        
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar">
              <Shield size={16} className="text-white" />
            </div>
            <div className="chat-title">
              <h4>Operations Command Bot</h4>
              <div className="chat-status">
                <span className="chat-status-dot"></span>
                <span>Superadmin • Active</span>
              </div>
            </div>
          </div>
          <Sparkles size={14} className="text-emerald-400" />
        </div>

        {/* Messaging Area */}
        <div className="chat-messages" ref={chatMessagesRef}>
          {messages.map(msg => (
            <div key={msg.id} className={`msg-row ${msg.sender}`}>
              {msg.sender === 'bot' && (
                <div className="msg-avatar">
                  <Bot size={13} className="text-white" />
                </div>
              )}
              <div className="bubble">
                {renderMessageContent(msg)}
                <div className="msg-time">
                  {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Interactive Confirm prompt for viewing HODs */}
          {pendingAction?.type === 'confirm_hods' && (
            <div className="prompt-wrap">
              <p className="prompt-text">💡 Would you like to check the operational HODs for these high-alert departments?</p>
              <div className="prompt-actions">
                <button className="btn-confirm" onClick={handleConfirmHods}>
                  <Users size={12} />
                  Show HOD Contacts
                </button>
                <button className="btn-ignore" onClick={() => setPendingAction(null)}>
                  No thanks
                </button>
              </div>
            </div>
          )}

          {/* Interactive Confirm prompt for viewing Supervisors */}
          {pendingAction?.type === 'confirm_supervisors' && (
            <div className="prompt-wrap">
              <p className="prompt-text">💡 Wanna see the supervisor?</p>
              <div className="prompt-actions">
                <button className="btn-confirm" onClick={handleConfirmSupervisors}>
                  <Users size={12} />
                  Show Supervisors
                </button>
                <button className="btn-ignore" onClick={() => setPendingAction(null)}>
                  No thanks
                </button>
              </div>
            </div>
          )}

          {/* Mail Quick Replies Prompt */}
          {selectedHodForMail && (
            <div className="quick-replies-wrap">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="quick-replies-title">Select In-App Reply:</span>
                <button 
                  style={{ background: 'transparent', border: 'none', color: '#537f73', cursor: 'pointer' }}
                  onClick={() => setSelectedHodForMail(null)}
                >
                  <X size={12} />
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#8ab6a9' }}>Sending to: **{selectedHodForMail.hod_name}**</p>
              
              <div className="quick-reply-chips">
                <button 
                  className="chip-btn" 
                  onClick={() => handleSendQuickReply(selectedHodForMail, "Meet me immediately")}
                >
                  ⚡ Meet me immediately
                </button>
                <button 
                  className="chip-btn" 
                  onClick={() => handleSendQuickReply(selectedHodForMail, "Take action in your department and submit the report to my mail id")}
                >
                  📝 Take action in your department and submit the report to my mail id
                </button>
                
                <button 
                  className="btn-compose-briefly"
                  onClick={() => {
                    onOpenRichText(selectedHodForMail);
                    setSelectedHodForMail(null);
                  }}
                >
                  <Play size={10} style={{ transform: 'rotate(90deg)' }} />
                  Send Mail Briefly (Rich Text)
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="msg-row bot">
              <div className="msg-avatar">
                <Bot size={13} className="text-white" />
              </div>
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Access Chips */}
        <div className="quick-chips-row">
          <button className="quick-chip" onClick={() => handleQuickChip('status of today')}>
            📊 Today's Status
          </button>
          <button className="quick-chip" onClick={() => handleQuickChip('active alerts')}>
            🚨 Anomaly Audit
          </button>
          <button className="quick-chip" onClick={() => handleQuickChip('HOD list')}>
            📋 HOD Directory
          </button>
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar">
          <div className="chat-input-wrapper">
            <input 
              type="text" 
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about status, alerts, HODs..."
              disabled={loading}
            />
          </div>
          <button 
            className={`btn-send ${(input.trim() && !loading) ? 'active' : ''}`}
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChatbotWidget;
