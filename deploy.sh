#!/bin/bash
set -e

echo "🚀 Memulai Deployment TLive Webhook..."
git pull
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 reload tlive-backend || pm2 start dist/src/main.js --name "tlive-backend" --uid www --gid www
cd ../frontend
cp ../.env .env 2>/dev/null || true
rm -rf .next node_modules/.cache
npm install
npm run build
pm2 reload tlive-frontend || pm2 start npm --name "tlive-frontend" --uid www --gid www -- start -- -p 10311
cd ..
chown -R www:www .
pm2 save
echo "✅ Selesai!"
