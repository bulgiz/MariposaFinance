// ecosystem.config.js — PM2 process config
// Copy this file and fill in your own values, or set env vars before running pm2.
// NEVER commit real API keys or passwords to this file.
module.exports = {
  apps: [
    {
      name: 'mariposa-web',
      cwd: '/var/www/mariposa/apps/web',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      autorestart: true,
      watch: false,
      merge_logs: true,
      error_file: '/var/www/mariposa/logs/web-error.log',
      out_file: '/var/www/mariposa/logs/web-out.log',
    },
    {
      name: 'mariposa-api',
      cwd: '/var/www/mariposa/apps/api',
      script: 'node',
      args: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1',
        // Set these via .env or environment before starting PM2:
        // REDIS_URL: "redis://127.0.0.1:6379",
        // POSTGRES_URL: "postgresql://user:pass@localhost:5432/mariposa",
        // BASE_RPC_URL: "https://base.llamarpc.com",
        // ARBITRUM_RPC_URL: "https://arb1.arbitrum.io/rpc",
        // ZEROX_API_KEY: "",
        // SWAP_FEE_RECIPIENT: "",
      },
      max_memory_restart: '800M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      autorestart: true,
      watch: false,
      merge_logs: true,
      error_file: '/var/www/mariposa/logs/api-error.log',
      out_file: '/var/www/mariposa/logs/api-out.log',
    },
  ],
};
