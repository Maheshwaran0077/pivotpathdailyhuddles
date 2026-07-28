module.exports = {
  apps: [
    {
      name: 'qdshi-backend',
      script: './backend/server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        START_WATCHDOG_SEPARATELY: 'true'
      }
    },
    {
      name: 'qdshi-mail-watchdog',
      script: './backend/watchdog.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'qdshi-ml-service',
      script: 'python',
      args: 'main.py',
      cwd: './ml-service',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
