# Expo + Backend App

## Structure
- /backend - Express API with SQLite (deploy to Railway)
- /mobile - Expo React Native app (build with EAS)

## Local Development
\`\`\`bash
# Terminal 1: Start backend
cd backend && npm install && npm run dev

# Terminal 2: Start mobile
cd mobile && npm install && npm start
\`\`\`

## Deploying Backend to Railway

1. Go to railway.app and create new project
2. Connect your GitHub repo
3. Set Root Directory to \`backend\` in Settings
4. Railway will auto-detect Node.js and deploy
5. Copy the deployment URL (e.g., https://xxx.railway.app)

## Updating Mobile App for Production

Update API_URL in mobile/App.js:
\`\`\`javascript
const API_URL = 'https://your-backend.railway.app/api';
\`\`\`

## Building Mobile App

\`\`\`bash
cd mobile
npx eas build --platform all
\`\`\`

## Connecting Devices
- iOS Simulator: localhost works
- Android Emulator: Use 10.0.2.2:3001
- Physical Device: Use your computer's IP or deployed URL
