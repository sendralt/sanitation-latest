module.exports = {
  apps: [
    {
      name: 'dhl_login',
      cwd: './dhl_login',
      script: 'app.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        // PM2 will also read dhl_login/.env automatically if you use pm2 start with --env or dotenv, but explicit env is clearer
      }
    },
    {
      name: 'backend',
      cwd: './backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3001'
      }
    }
  ]
}