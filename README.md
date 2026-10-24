# Balcacorp EMS

Basic Employee Management System — see [prd.md](prd.md) for the full spec.
React + Vite frontend, Express + Mongoose backend, MongoDB database.

## Setup (one time)

1. Put your MongoDB connection string in `server/.env`:
   ```
   MONGO_URI=mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/
   ```
2. Install and load demo data:
   ```
   cd server && npm install && npm run seed
   cd ../client && npm install && npm run build
   ```

## Run

```
cd server && npm start
```
Open http://localhost:3001

| Login | Email | Password |
|---|---|---|
| Admin | admin@balcacorp.com | admin123 |
| Employee | yash@balcacorp.com (any seeded employee) | welcome123 |

**Change these passwords after first login.** `npm run seed` wipes the database and reloads demo data — don't run it once real data is in.

## Development

Two terminals:
- `cd server && npm start` (API on :3001)
- `cd client && npm run dev` (Vite on :5173, proxies /api)

## Deployment (Vercel)

Live at https://balcacorp.vercel.app — the Express app runs as a serverless function ([api/index.js](api/index.js)),
sessions and uploaded files are stored in MongoDB, and the React build is served as static files.
To redeploy after changes: `vercel deploy --prod --yes`. Environment variables (`MONGO_URI`, `SESSION_SECRET`)
are set in the Vercel project. Note: uploads are limited to ~4.5 MB on Vercel.

`npm run reset` (in `server/`) wipes the database to just the admin + 4 departments — no demo data.

## Tests

`cd server && npm run smoke` — end-to-end API check against a throwaway database
(uses an in-memory MongoDB if `MONGO_URI` isn't set; never touches your real data).
