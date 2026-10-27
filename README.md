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

## Deployment on Azure

```mermaid
flowchart LR
  U[Browser] -- HTTPS 443 --> PIP[Public IP + DNS<br/>ems-arnav08f8.centralindia.cloudapp.azure.com]
  subgraph RG[Resource group ems-rg · Central India]
    subgraph VNET[VNet ems-vnet 10.10.0.0/16]
      subgraph SN[Subnet snet-app 10.10.1.0/24 · NSG ems-nsg]
        VM[Ubuntu 24.04 VM ems-vm<br/>Nginx + Let's Encrypt → Node.js app :3001]
      end
    end
    KV[(Key Vault<br/>mongo-uri, session-secret)]
  end
  PIP --> VM
  VM -- managed identity --> KV
  VM -- TLS 27017 --> DB[(MongoDB Atlas)]
```

| Resource | Purpose |
|---|---|
| Virtual network `ems-vnet`, subnet `snet-app` | Private network the VM lives in |
| Network security group `ems-nsg` | Firewall: allows 80/443 from anywhere, SSH (22) only from the admin's IP, denies everything else |
| Public IP `ems-pip` (static, Standard) | Fixed address with a DNS name, so the HTTPS certificate stays valid |
| Virtual machine `ems-vm` (B2ats_v2: 2 vCPU, 1 GB, Ubuntu 24.04) | Runs Nginx (reverse proxy + TLS) and the Node.js app as a locked-down systemd service |
| Key Vault `ems-kv-arnav08f8` | Holds the database URI and session secret. The VM reads them at startup with its **managed identity** (no passwords in code, config files or env files) |
| MongoDB Atlas | Database (sessions and uploaded files are stored here too) |

Everything is created by scripts in [`infra/`](infra):
- `infra/deploy.sh`: creates the network, firewall, public IP, Key Vault (with secrets) and VM. Safe to re-run.
- `infra/cloud-init.yaml`: first-boot setup of the VM: Node 22, Nginx, swap, the `ems` service user and systemd unit.
- `infra/release.sh`: ships the committed code to the VM, builds it, restarts the app and (first time) gets the HTTPS certificate.

```
SUFFIX=arnav08f8 MONGO_URI='mongodb+srv://…' ./infra/deploy.sh   # once
./infra/release.sh                                                 # every time you want to ship HEAD
```

## Deployment elsewhere

Any Node 22.9+ host (Render, Railway, a VPS, …): build command `npm run build`, start command `npm start`,
both from the repo root. Set `MONGO_URI` and `SESSION_SECRET` as environment variables; the host's `PORT`
is picked up automatically. Sessions and uploaded files are stored in MongoDB, so no persistent disk is needed.

`npm run reset` (in `server/`) wipes the database to just the admin + 4 departments — no demo data.

## Tests

`cd server && npm run smoke` — end-to-end API check against a throwaway database
(uses an in-memory MongoDB if `MONGO_URI` isn't set; never touches your real data).
