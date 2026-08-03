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
const { startShiftAlertJob } = require('./jobs/shiftAlertJob');
const { initWatchdogScheduler } = require('./utils/watchdogScheduler');

const app = express();

const helmet = require('helmet');
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

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

// ── SERVE STATIC FRONTEND ON PRODUCTION ────────────────
// Directs express to stream pre-compiled production UI layers
app.use(express.static(path.join(__dirname, '../frontend/build')));

// ✅ Serve React frontend for all non-API paths (Express 4 & 5 compatible)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
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