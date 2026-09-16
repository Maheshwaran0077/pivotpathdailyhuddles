require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express       = require('express');
const mongoose      = require('mongoose');
const cors          = require('cors');
const dns           = require('dns');
const path          = require('path');  // ✅ Added for serving frontend compilation files
const { spawn }     = require('child_process');

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const metricRoutes      = require('./routes/metricRoutes');
const userRoutes        = require('./routes/userRoutes');
const healthRoutes       = require('./routes/healthRoutes');
const ideationRoutes    = require('./routes/IdeationRoutes');
const ehsRoutes          = require('./routes/ehsRoutes');
const engineeringRoutes  = require('./routes/engineeringRoutes');
const hrRoutes           = require('./routes/hrRoutes');
const timeLockRoutes     = require('./routes/timeLockRoutes');
const loginLogRoutes     = require('./routes/loginLogRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const plantDashboardRoutes = require('./routes/plantDashboardRoutes');
const factoryRoutes = require('./routes/factoryRoutes');
const fdaRoutes = require('./routes/fdaRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const { startShiftAlertJob } = require('./jobs/shiftAlertJob');
const { initWatchdogScheduler } = require('./utils/watchdogScheduler');

const app = express();

const helmet = require('helmet');
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// API Endpoints
app.use('/api/metrics',      metricRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/health',       healthRoutes);
app.use('/api/ideation',     ideationRoutes);
app.use('/api/ehs',          ehsRoutes);
app.use('/api/engineering',  engineeringRoutes);
app.use('/api/hr',           hrRoutes);
app.use('/api/timelock',     timeLockRoutes);
app.use('/api/loginlog',     loginLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/plant-dashboard', plantDashboardRoutes);
app.use('/api/factory',         factoryRoutes);
app.use('/api/fda',             fdaRoutes);
app.use('/api/verification',    verificationRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ CENTRAL CONFIG (IMPORTANT — SAME AS FRONTEND)
const DEPT_CONFIG = {
  fgmw: 'Finished Goods Warehouse',
  pmw: 'Packing Material Warehouse',
  rmw: 'Raw Material Warehouse',
  ppp: 'Primary Packing Production',
  pop: 'Post Production',
  qcmad: 'QC & Microbiology Lab',
  pro: 'Production',
  spp: 'Secondary Packing Production',
  fac: 'Facilities'
};

const LETTERS = ['Q', 'D', 'S', 'H', 'I'];

const TYPE_MAP = {
  Q: 'Quality',
  D: 'Delivery',
  S: 'Safety',
  H: 'Health',
  I: 'Improvement'
};

// ✅ SMART LABEL
const getLabel = (letter, dept) => {
  const deptName = DEPT_CONFIG[dept] || 'General';
  const isProduction = ['ppp', 'pro', 'spp'].includes(dept);

  const type =
    letter === 'D'
      ? (isProduction ? 'Production' : 'Dispatch')
      : TYPE_MAP[letter] || 'Metric';

  return `${deptName} ${type}`;
};

// 🔄 OLD → NEW DEPT MIGRATION MAP
const OLD_TO_NEW_DEPT = {
  fg: 'fgmw',
  pm: 'pmw',
  rm: 'rmw',
  pp: 'ppp'
};

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');

    const Metric = require('./models/Metrics');
    const Health = require('./models/Health');

    // ── 1. Drop old index ─────────────────────────────
    try {
      await Metric.collection.dropIndex('letter_1');
      console.log('✅ Dropped legacy index');
    } catch (_) {}

    // ── 2. MIGRATE OLD DEPT VALUES ────────────────────
    for (const [oldDept, newDept] of Object.entries(OLD_TO_NEW_DEPT)) {
      const res = await Metric.collection.updateMany(
        { dept: oldDept },
        { $set: { dept: newDept } }
      );

      if (res.modifiedCount > 0) {
        console.log(`✅ Migrated ${res.modifiedCount} docs: ${oldDept} → ${newDept}`);
      }
    }

    // ── 3. FIX EMPTY / NULL DEPTS ─────────────────────
    await Metric.collection.updateMany(
      { $or: [{ dept: { $exists: false } }, { dept: null }, { dept: '' }] },
      { $set: { dept: 'fgmw' } }
    );

    // ── 4. UPDATE LABELS (FIXED TO PREVENT DUPLICATE KEY E11000 ERRORS) ──
    const allMetrics = await Metric.find();
    for (const m of allMetrics) {
      const newLabel = getLabel(m.letter, m.dept);
      if (m.label !== newLabel) {
        // Target updates via explicit updateOne to sidestep active unique validation rules on save hooks
        await Metric.updateOne({ _id: m._id }, { $set: { label: newLabel } });
      }
    }
    console.log('✅ Labels synced');

    // ── 5. INITIALISE ALL (LETTER × DEPT) - FIXED VIA EXPLICIT PRE-CHECK EXCLUSION ──
    let created = 0;
    for (const letter of LETTERS) {
      for (const dept of Object.keys(DEPT_CONFIG)) {
        // Run an active existence lookup to completely eliminate upsert index friction
        const alreadyExists = await Metric.exists({ letter, dept });
        
        if (!alreadyExists) {
          await Metric.create({
            letter,
            dept,
            label: getLabel(letter, dept),
            shifts: { '1': {}, '2': {}, '3': {} }
          });
          created++;
        }
      }
    }
    console.log(`✅ Initialised ${created} metric stubs`);

    // ── 6. HEALTH COLLECTION MIGRATION ────────────────
    await Health.collection.updateMany(
      { $or: [{ dept: 'COMMON' }, { dept: { $exists: false } }] },
      { $set: { dept: 'fgmw' } }
    );
    console.log('✅ Health migration done');

    // Start shift-missed-alert cron job
    startShiftAlertJob();

    // Start watchdog scheduler after DB is available (unless running separately)
    if (process.env.START_WATCHDOG_SEPARATELY !== 'true') {  
      initWatchdogScheduler();
    } else {
      console.log('ℹ️ Watchdog Scheduler startup bypassed (running separately)');
    }

  })
  .catch(err => console.error('❌ MongoDB error:', err.message));

// ── IN-APP DIRECT MAIL DISPATCH API ────────────────
app.post('/api/admin/send-mail', async (req, res) => {
  const { recipient_email, subject, body } = req.body;
  if (!recipient_email || !subject || !body) {
    return res.status(400).json({ error: 'recipient_email, subject, and body are required' });
  }

  const nodemailer = require('nodemailer');
  const smtp_host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtp_port = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtp_secure = process.env.SMTP_SECURE === 'true';
  const smtp_user = process.env.SMTP_USER;
  const smtp_pass = process.env.SMTP_PASS;

  if (!smtp_user || !smtp_pass) {
    console.error('❌ SMTP credentials not configured in environment.');
    return res.status(500).json({ error: 'Mail credentials are not configured in the application environment.' });
  }

  const transporter = nodemailer.createTransport({
    host: smtp_host,
    port: smtp_port,
    secure: smtp_secure,
    auth: {
      user: smtp_user,
      pass: smtp_pass,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || `"PivotPath Superadmin" <${smtp_user}>`,
    to: recipient_email,
    subject: subject,
    html: body,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Silent Watchdog email dispatched successfully to ${recipient_email} (${info.messageId})`);
    return res.status(200).json({
      status: 'success',
      message: `Email successfully dispatched to ${recipient_email}`,
      recipient: recipient_email,
    });
  } catch (err) {
    console.error('❌ SMTP dispatch error:', err.message);
    return res.status(502).json({
      error: `Mail pipeline failed: ${err.message}`,
    });
  }
});

// ── GOOGLE MEET AI SCHEDULING WIZARD API ────────────────
app.post('/api/admin/schedule-meet', async (req, res) => {
  const { date, timeSlot, attendeeCount } = req.body;
  if (!date || !timeSlot || !attendeeCount) {
    return res.status(400).json({ error: 'date, timeSlot, and attendeeCount are required' });
  }

  try {
    const User = require('./models/User');
    const FactoryDefect = require('./models/FactoryDefect');

    // Organizer host is mageshedu77@gmail.com
    const hostEmail = 'mageshedu77@gmail.com';
    const mandatoryRecipients = ['mageshedu77@gmail.com', 'admin@gmail.com', 'hodfgmw2@gmail.com'];

    // Find all HODs
    const HODs = await User.find({ role: 'hod' });

    // Query active error counts from FactoryDefect group by department
    const errorStats = await FactoryDefect.aggregate([
      { $group: { _id: "$department", errorCount: { $sum: 1 } } }
    ]);

    // Sort by errorCount descending
    errorStats.sort((a, b) => b.errorCount - a.errorCount);

    const FACTORY_DEPT_TO_HOD_KEY = {
      'Finished Good Material Warehouse': 'fgmw',
      'Finished Goods Warehouse': 'fgmw',
      'Packing Material Warehouse': 'pmw',
      'Raw Material Warehouse': 'rmw',
      'Primary Packing Production': 'ppp',
      'Post Production': 'pop',
      'QC & Microbiology Lab': 'qcmad',
      'QC & Microbiology & AD Lab': 'qcmad',
      'Production': 'pro',
      'Secondary Packing Production': 'spp',
      'Facilities': 'fac'
    };

    const DEPT_FULL_NAME = {
      fgmw: 'Finished Goods Warehouse',
      pmw: 'Packing Material Warehouse',
      rmw: 'Raw Material Warehouse',
      ppp: 'Primary Packing Production',
      pop: 'Post Production',
      qcmad: 'QC & Microbiology Lab',
      pro: 'Production',
      spp: 'Secondary Packing Production',
      fac: 'Facilities'
    };

    const selectedHods = [];
    const invitedEmails = [];

    // Target HODs matching highest-alert departments
    for (const stat of errorStats) {
      if (selectedHods.length >= attendeeCount - 1) break;
      const hodKey = FACTORY_DEPT_TO_HOD_KEY[stat._id];
      if (!hodKey) continue;
      const matchedHod = HODs.find(h => h.department === hodKey);
      if (matchedHod) {
        const email = matchedHod.gmail || matchedHod.email;
        if (email && !invitedEmails.includes(email)) {
          selectedHods.push({
            name: matchedHod.name,
            email,
            departmentName: stat._id,
            errorCount: stat.errorCount
          });
          invitedEmails.push(email);
        }
      }
    }

    // Fill up slots with remaining HODs if needed
    if (selectedHods.length < attendeeCount - 1) {
      for (const hod of HODs) {
        if (selectedHods.length >= attendeeCount - 1) break;
        const email = hod.gmail || hod.email;
        if (email && !invitedEmails.includes(email)) {
          const deptName = DEPT_FULL_NAME[hod.department] || hod.department;
          selectedHods.push({
            name: hod.name,
            email,
            departmentName: deptName,
            errorCount: 0
          });
          invitedEmails.push(email);
        }
      }
    }

    // Parse slots into correct ISO 8601 calendar strings
    const parseDateTime = (dStr, tStr) => {
      try {
        const cleanedTime = tStr.trim().replace(/\s+/g, ' ');
        const parts = cleanedTime.split(' ');
        const timePart = parts[0];
        const ampm = parts[1];
        let [hours, minutes] = timePart.split(':').map(Number);
        if (ampm && ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        
        // India is UTC+5:30 offset
        const dateObj = new Date(dStr);
        dateObj.setHours(hours, minutes, 0, 0);
        return dateObj;
      } catch (err) {
        return new Date();
      }
    };

    const startDateTime = parseDateTime(date, timeSlot);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    const allInvitedEmails = [
      ...mandatoryRecipients,
      ...invitedEmails
    ].filter((val, idx, self) => val && self.indexOf(val) === idx);

    // Google Calendar API Payload configuration (organizer, attendee bypass lobby)
    const eventPayload = {
      summary: 'Urgent Operational Performance Review & Defect Alignment',
      description: 'AI-dispatched meeting to calibrate error telemetry and verify defect containment checklists.',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Kolkata'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Kolkata'
      },
      organizer: {
        email: 'mageshedu77@gmail.com',
        displayName: 'Superadmin Host'
      },
      attendees: allInvitedEmails.map(email => ({
        email,
        responseStatus: email === 'mageshedu77@gmail.com' ? 'accepted' : 'needsAction'
      })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        },
        conferenceProperties: {
          allowedConferenceSolutionTypes: ['hangoutsMeet'],
          anyoneCanAddSelf: true // entryPoint access without knock/manual approval loops
        }
      },
      guestsCanModify: false,
      guestsCanInviteOthers: true,
      guestsCanSeeOtherGuests: true
    };

    console.log("📅 Google Calendar API Payload generated:\n", JSON.stringify(eventPayload, null, 2));

    let meetLink = '';
    let apiUsed = false;

    // Optional OAuth dispatch to Google Calendar API
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN) {
      try {
        console.log("🔑 Authenticating Google Calendar API OAuth client...");
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: GOOGLE_REFRESH_TOKEN,
          grant_type: 'refresh_token'
        });

        const accessToken = tokenRes.data.access_token;
        if (accessToken) {
          console.log("📅 Dispatching Google Calendar API event creation request...");
          const calendarRes = await axios.post(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
            eventPayload,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const confData = calendarRes.data.conferenceData;
          if (confData && confData.entryPoints) {
            const videoEP = confData.entryPoints.find(ep => ep.entryPointType === 'video');
            if (videoEP && videoEP.uri) {
              meetLink = videoEP.uri;
              apiUsed = true;
              console.log(`✅ Real Google Meet Link created by Calendar API: ${meetLink}`);
            }
          }
        }
      } catch (err) {
        console.error("❌ Google Calendar API failed, falling back to functional room:", err.response?.data || err.message);
      }
    }

    if (!apiUsed) {
      // Fallback: Generate Jitsi Meet Link for instant functional browser review rooms
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      const randPart = (len) => Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      meetLink = `https://meet.jit.si/PivotPath-Review-${randPart(3)}-${randPart(4)}-${randPart(3)}`;
      console.log(`ℹ️ Google OAuth not configured. Generated functional fallback meet link: ${meetLink}`);
    }

    // Nodemailer setup
    const nodemailer = require('nodemailer');
    const smtp_host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtp_port = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtp_secure = process.env.SMTP_SECURE === 'true';
    const smtp_user = process.env.SMTP_USER;
    const smtp_pass = process.env.SMTP_PASS;

    if (!smtp_user || !smtp_pass) {
      return res.status(500).json({ error: 'Mail credentials are not configured in the application environment.' });
    }

    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_secure,
      auth: {
        user: smtp_user,
        pass: smtp_pass,
      },
    });

    const inviteeListHtml = selectedHods.map(h => `
      <li style="margin-bottom: 6px;">
        <strong>${h.name}</strong> (${h.departmentName}) - <span style="font-family: monospace;">${h.email}</span> [${h.errorCount} active defects]
      </li>
    `).join('');

    const emailBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; border: 2px solid #10b981; border-radius: 16px; color: #334155; max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
          <span style="font-size: 48px;">📅</span>
          <h2 style="color: #059669; margin: 12px 0 4px 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Operations review meeting</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0; font-weight: 600; text-transform: uppercase; tracking: 1px;">Google Meet Scheduling Invite</p>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Greetings,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          You have been scheduled for an operational review meeting by the Superadministrator to address active telemetry defects and improve process alignment.
        </p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 18px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #065f46; font-size: 15px; font-weight: 800; text-transform: uppercase;">Meeting Schedule</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
            <tr>
              <td style="padding: 6px 0; font-weight: 800; width: 130px; text-transform: uppercase; color: #64748b; font-size: 11px;">Scheduled Date:</td>
              <td style="font-weight: 600;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 800; text-transform: uppercase; color: #64748b; font-size: 11px;">Time Slot:</td>
              <td style="font-weight: 600;">${timeSlot}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 800; text-transform: uppercase; color: #64748b; font-size: 11px;">Meeting Host:</td>
              <td style="font-weight: 600;">Superadmin (Host)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 800; text-transform: uppercase; color: #64748b; font-size: 11px;">Video Meeting Link:</td>
              <td><a href="${meetLink}" style="color: #059669; font-weight: 700; text-decoration: none; border-bottom: 1.5px solid #059669;">${meetLink}</a></td>
            </tr>
          </table>
        </div>
        
        <div style="margin: 20px 0; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
          <h3 style="color: #191d24; font-size: 14px; font-weight: 800; margin-bottom: 10px; text-transform: uppercase;">Targeted Attending HODs:</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
            ${inviteeListHtml || '<li>No HODs matched</li>'}
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 28px;">
          <a href="${meetLink}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 800; display: inline-block; box-shadow: 0 4px 12px rgba(5,150,105,0.3); text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">
            Join Video Meeting
          </a>
        </div>
        
        <p style="font-size: 10px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          Automated meeting invite dispatched by PivotPath AI calendar module.
        </p>
      </div>
    `;

    const allRecipients = allInvitedEmails.join(',');

    const mailOptions = {
      from: process.env.SMTP_FROM || `"PivotPath Superadmin" <${smtp_user}>`,
      to: allRecipients,
      subject: `[GOOGLE MEET CALENDAR INVITE] operational performance review - ${timeSlot} on ${date}`,
      html: emailBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Google Meet invitation scheduled & sent directly to HODs: ${allRecipients} (${info.messageId})`);

    return res.status(200).json({
      status: 'success',
      message: 'Google Meet scheduled successfully',
      meetLink,
      recipients: allRecipients,
      invitedHods: selectedHods
    });
  } catch (err) {
    console.error('❌ Google Meet scheduling wizard failed:', err);
    return res.status(500).json({ error: `Scheduler failed: ${err.message}` });
  }
});

// ── SERVE STATIC FRONTEND ON PRODUCTION ────────────────
// Directs express to stream pre-compiled production UI layers
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath));

// ✅ Serve React frontend for all non-API paths (Express 4 & 5 compatible)
app.get(/^\/(?!api).*/, (req, res, next) => {
  const indexPath = path.join(frontendBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Failed to serve frontend index.html:', err.message);
      if (!res.headersSent) {
        res.status(500).send(`
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; text-align: center; max-width: 600px; margin: 50px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <h2 style="color: #e11d48; margin-top: 0;">Frontend Build Not Found</h2>
            <p style="font-size: 15px; color: #475569; line-height: 1.5;">
              The server is running, but <code>frontend/build/index.html</code> was not generated during the Render deployment build step.
            </p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: left; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p style="margin-top: 0; font-weight: bold; color: #1e293b;">Fix step for Render Dashboard:</p>
              <ol style="margin-bottom: 0; padding-left: 20px; color: #334155; line-height: 1.8;">
                <li>Go to <strong>Render Dashboard &rarr; daily-huddles Web Service &rarr; Settings</strong></li>
                <li>Ensure <strong>Build Command</strong> is set to: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">npm run build</code></li>
                <li>Ensure <strong>Start Command</strong> is set to: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">npm start</code></li>
                <li>Leave <strong>Root Directory</strong> blank</li>
                <li>Click <strong>Manual Deploy &rarr; Clear Build Cache & Deploy</strong></li>
              </ol>
            </div>
          </div>
        `);
      }
    }
  });
});

// Graceful Shutdown
process.on('SIGINT', async () => { 
  await mongoose.connection.close();
  console.log('🛑 MongoDB connection closed'); 
  process.exit(0);
});
  
// ─────────────────────────────────────────────────────────────────────────────
// ML MICROSERVICE AUTO-LAUNCHER
// Spawns the Python FastAPI forecasting engine automatically so that the
// Node.js backend never fires ECONNREFUSED when calling /predict.
// ─────────────────────────────────────────────────────────────────────────────
let mlProcess = null;

function startMLService() {
  const mlServiceDir = path.join(__dirname, '..', 'ml-service');
  const script       = path.join(mlServiceDir, 'main.py');
  const pythonBin    = process.platform === 'win32' ? 'python' : 'python3';
  const ML_PORT      = parseInt(process.env.ML_SERVICE_PORT || '5001', 10);

  // Probe port first — if it's already bound, skip spawning
  const net = require('net');
  const probe = net.createConnection({ port: ML_PORT, host: '127.0.0.1' });

  probe.on('connect', () => {
    probe.destroy();
    console.log(`✅ [ML SERVICE] Port ${ML_PORT} already in use — reusing existing microservice.`);
  });

  probe.on('error', () => {
    // Port is free — safe to spawn
    probe.destroy();
    console.log(`🐍 [ML SERVICE] Starting Python forecasting microservice on port ${ML_PORT}...`);

    mlProcess = spawn(pythonBin, [script], {
      cwd: mlServiceDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    mlProcess.stdout.on('data', (data) => process.stdout.write(`[ML] ${data}`));
    mlProcess.stderr.on('data', (data) => process.stderr.write(`[ML] ${data}`));

    mlProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`⚠️  [ML SERVICE] Python process exited (code ${code}). Retrying in 5 s...`);
        setTimeout(startMLService, 5000);
      } else {
        console.log(`🛑 [ML SERVICE] Python process stopped (code ${code}).`);
      }
    });

    mlProcess.on('error', (err) => {
      console.error(`❌ [ML SERVICE] Failed to spawn Python: ${err.message}`);
      console.error('   Ensure Python is installed and on your PATH.');
    });
  });
}

// Shut down ML service when Node exits
process.on('exit', () => { if (mlProcess) mlProcess.kill(); });
process.on('SIGTERM', () => { if (mlProcess) mlProcess.kill(); process.exit(0); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Auto-start the Python ML forecasting microservice
  startMLService();

  try {
    console.log("🔍 Diagnosing registered routes:");
    const router = app._router || app.router;
    if (router && router.stack) {
      router.stack.forEach(r => {
        if (r.route) {
          console.log(`   - ${Object.keys(r.route.methods).join(',').toUpperCase()} ${r.route.path}`);
        } else if (r.name === 'router') {
          r.handle.stack.forEach(sub => {
            if (sub.route) {
              console.log(`   - SUB ROUTE: ${Object.keys(sub.route.methods).join(',').toUpperCase()} ${sub.route.path}`);
            }
          });
        }
      });
    } else {
      console.log("   - (Unable to read Express router stack: property undefined)");
    }
  } catch (err) {
    console.warn("⚠️ Route diagnostic warning:", err.message);
  }
});