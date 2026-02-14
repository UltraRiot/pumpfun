module.exports = {
  apps: [
    {
      name: "pumpfun-backend",
      script: "src/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 2000,
      kill_timeout: 10000,
      env: {
        NODE_ENV: "production",
        PORT: 5001,
      },
    },
  ],
};
