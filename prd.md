# PRD — Balcacorp Employee Management System (EMS)

**Version:** 1.0 (draft for review)
**Date:** 21 July 2026
**Scope:** Basic internal tool for one company. Intentionally simple — no external services, one server, one database file.

---

## 1. Overview

A web app where the **admin (HR/management)** manages employees, attendance, tasks, leaves, documents and announcements, and each **employee** gets a self-service dashboard limited strictly to their own data.

The guiding rule for every decision in this document: **the simplest version that works.** Anything clever is deferred to v2.

## 2. Goals

- Replace spreadsheets and manual registers with one internal tool.
- Admin manages everything; employees see only their own data.
- Runs on one machine with `npm install` + one command. Data lives in MongoDB (your Atlas cluster or a local install) — configured with a single connection string in `server/.env`.

## 3. Non-goals (deliberately out of scope for v1)

- Payroll or salary **calculation** — salary slips are just uploaded PDFs.
- Email / SMS / push notifications — everything is in-app only.
- Employee self check-in or biometric attendance — **admin marks attendance**.
- A separate "manager" login role — manager is a label on a department; managers log in as normal employees.
- Multi-company, multi-branch, audit logs, real-time sync, mobile app.
- Password reset via email — admin resets passwords from the employee's profile.

## 4. Users & roles

Two roles only.

| Capability | Admin | Employee |
|---|---|---|
| Log in | ✔ | ✔ |
| Manage employees & departments | ✔ | — |
| Mark attendance | ✔ | view own only |
| Assign tasks / give feedback | ✔ | update own task status |
| Approve/reject leave | ✔ | apply, view own |
| Post announcements | ✔ | view |
| Upload documents | ✔ (any employee) | view/download own only |
| Rate performance | ✔ | view own rating |
| Reports dashboard | ✔ | — |
| Change own password | ✔ | ✔ |

**Hard rule:** every API endpoint checks role and ownership on the server. An employee requesting another employee's data by ID must get a 403 — never rely on hiding buttons in the UI.

## 5. Tech stack (simple by design)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite, React Router | Most common, well-documented simple setup |
| Styling | Plain CSS using tokens from `balcacorpdesign.md` | Existing Balcacorp design system; no CSS framework needed |
| Charts | Hand-rolled CSS bar chart | Only one chart is needed — not worth a library dependency |
| Backend | Node.js + Express | One language (JS) across the whole project |
| Database | MongoDB + Mongoose | Connection URI supplied via `server/.env` (Atlas or local); Mongoose keeps schemas and validation in one place |
| Auth | `express-session` cookie + `bcrypt` | Session login, hashed passwords, no JWT complexity |
| File uploads | `multer` → local `uploads/` folder | Photos and documents stored on disk |
| Excel export | `exceljs` | Generates real `.xlsx` files |

- **Development:** Vite dev server proxies API calls to Express — no CORS setup.
- **Production:** Express serves the built React files — one process to run.
- If you'd rather not use React, the same backend works with EJS templates — say so before Stage 1 and the plan adjusts.

## 6. Assumptions (defaults chosen to stay basic — correct any of these)

1. Admin creates all accounts; there is **no self-registration**. Admin sets the initial password; employees can change it later.
2. One admin account is seeded by a script (e.g. `admin@balcacorp.com`); more admins can be created.
3. **Leave quota: 24 paid days per calendar year** per employee (editable per employee). Balance = quota − approved paid-leave days this year.
4. Leave types: **Casual, Sick, Unpaid**. Unpaid leave does not reduce the balance. Leave days are counted as calendar days, inclusive of both ends (no weekend exclusion in v1).
5. Attendance is **one status per employee per day**: Present, Absent, Half-day, On Leave. Approving a leave auto-marks those dates as "On Leave".
6. **Attendance % = (Present + 0.5 × Half-day) ÷ (Present + Half-day + Absent) × 100** — leave days are excluded from the calculation.
7. **Delayed task** = completed after its deadline. **Overdue task** = past deadline and still not completed.
8. Employee IDs are auto-generated: `BAL-001`, `BAL-002`, …
9. Uploads: photos JPG/PNG, documents PDF/JPG/PNG, max 5 MB per file.
10. Dates stored as `YYYY-MM-DD`, displayed as `DD MMM YYYY`.
11. UI follows `balcacorpdesign.md`: navy `#002451` primary, white surfaces, red `#d22b2b` reserved for primary actions, light theme only.

## 7. Functional requirements

### 7.1 Role-based login
- Login with email + password → session cookie.
- Admin lands on the admin dashboard; employee lands on the employee dashboard.
- Deactivated employees cannot log in (clear message shown).
- Logout from anywhere.

**Accept when:** an employee opening any admin URL is redirected with a "not authorized" message; a request for another employee's record returns 403; a deactivated account cannot log in.

### 7.2 Employee profiles
- Fields: name, employee ID (auto), email, phone, department, job role/title, joining date, profile photo, status (active/inactive).
- Admin can **add, update, or deactivate** employees (deactivate — never delete, so history is preserved).
- Employee can view their own profile and edit only phone and photo, and change their password.

**Accept when:** a newly added employee can log in; a deactivated one cannot; the photo appears on the profile and dashboard; an employee cannot edit their own department or joining date.

### 7.3 Attendance management
- Admin picks a date and sees all active employees in one list with quick status buttons: Present / Absent / Half-day / On Leave. Statuses can be corrected later.
- Employees see their own attendance history (calendar or list) with monthly summary.
- Admin can filter attendance by **date range, employee, or department**.
- **Export to Excel**: downloads an `.xlsx` of exactly the filtered rows — columns: Employee ID, Name, Department, Date, Status.

**Accept when:** marking all statuses for today takes under a minute for 20 employees; the exported file opens in Excel and matches the on-screen filter; an employee sees only their own history.

### 7.4 Task management
- Admin assigns a task: title, description, priority (Low/Medium/High), deadline, assigned employee.
- Employee updates status: **To Do → In Progress → Completed**.
- Admin reviews completed tasks and adds a feedback comment.
- Both sides see overdue tasks flagged (past deadline, not completed).

**Accept when:** the employee's status change is visible to the admin on refresh; feedback added by admin is visible to the employee; an overdue task is visually flagged for both.

### 7.5 Leave management
- Employee applies: type (Casual/Sick/Unpaid), from date, to date, reason. The form shows their current remaining balance.
- Overlapping requests with pending/approved leave are rejected at submission.
- Admin sees a pending-requests queue and approves or rejects (optional note on rejection).
- Approval deducts the balance (paid types only) and auto-marks attendance as "On Leave" for those dates.

**Accept when:** approving a 2-day casual leave reduces the balance by 2 and both dates show "On Leave" in attendance; a rejected request does not change balance or attendance; a duplicate-dates application is blocked with a clear message.

### 7.6 Announcements
- Admin posts: title, body, category (General / Holiday / Urgent).
- Employees see the latest announcements on their dashboard (newest first, latest 5, with a "view all" page).
- Admin can edit or delete an announcement.

**Accept when:** a new announcement appears on the employee dashboard immediately after posting; deleting removes it everywhere.

### 7.7 Performance tracking
- Per employee, per month, computed automatically: tasks completed, tasks delayed, attendance % (formula in §6.6).
- Admin can give a **monthly rating (1–5 stars) + feedback text** — one per employee per month, editable.
- Employee sees their own stats and ratings history.

**Accept when:** stats match the underlying attendance/task data for a seeded test employee; saving a rating for the same month updates rather than duplicates it.

### 7.8 Document management
- Admin uploads documents to any employee's profile: type (Offer Letter / ID Proof / Certificate / Salary Slip / Other) + file.
- Employee sees and downloads **only their own** documents.
- Admin can delete a wrongly uploaded document.

**Accept when:** employee A using employee B's document URL gets 403; uploads over 5 MB or of the wrong file type are rejected with a message.

### 7.9 Department and team management
- Admin creates/renames departments; seed data includes **Development, HR, Sales, Marketing**.
- Each employee belongs to exactly one department; each department can have one manager (an employee — label only, no extra permissions).
- A department with employees cannot be deleted — employees must be reassigned first.

**Accept when:** assigning a department is reflected on the employee's profile and in attendance filters; deleting a non-empty department is blocked with a message.

### 7.10 Reports dashboard (admin home)
- Stat cards: **total active employees · present today · pending leave requests · tasks completed this month · overdue tasks**.
- **Monthly attendance graph:** bar chart of employees present per day for a selected month.
- Each card links to the relevant page.

**Accept when:** every number matches a manual count from the database seed; the graph renders for the current month and updates when the month is changed.

## 8. Data model (MongoDB — 8 collections)

| Collection | Key fields |
|---|---|
| `employees` | empCode, name, email (unique), passwordHash, role (`admin`/`employee`), department (ref), jobTitle, phone, joiningDate, photo, leaveQuota (default 24), status (`active`/`inactive`) |
| `departments` | name (unique), manager (ref → employee) |
| `attendance` | employee (ref), date `YYYY-MM-DD`, status (`present`/`absent`/`half_day`/`leave`) — **unique index (employee, date)** |
| `tasks` | title, description, priority, deadline, status (`todo`/`in_progress`/`completed`), assignedTo (ref), completedAt, feedback |
| `leaves` | employee (ref), type, fromDate, toDate, days, reason, status (`pending`/`approved`/`rejected`), adminNote |
| `announcements` | title, body, category, createdAt |
| `documents` | employee (ref), type, title, file, uploadedAt |
| `ratings` | employee (ref), month (`YYYY-MM`), rating (1–5), feedback — **unique index (employee, month)** |

Day-granularity dates are stored as plain `YYYY-MM-DD` strings — they compare and filter correctly and avoid timezone bugs.

A seed script creates the admin, the four departments, and ~10 sample employees with a few weeks of attendance, tasks and leaves for testing.

## 9. Screens

**Shared:** Login.

**Admin:** Reports dashboard (home) · Employees list + add/edit + profile · Departments · Attendance (mark + filter + export) · Leave requests · Tasks (assign + review) · Announcements · Documents (per employee) · Performance (stats + rating).

**Employee:** Dashboard (announcements, today's status, quick stats) · My Profile · My Attendance · My Tasks · My Leaves (apply + balance) · My Documents.

## 10. Build plan

Each stage is independently runnable and verified before the next begins.

**Stage 1 — Foundation.** Scaffold `client/` (Vite + React) and `server/` (Express + Mongoose), models + seed script, Mongo URI read from `server/.env`, login/logout, role-based routing shells for both dashboards.
→ *Verify:* one command starts the app; admin login lands on the admin shell, employee on the employee shell; wrong password and deactivated accounts are rejected.

**Stage 2 — Employees & departments.** Employee CRUD with photo upload and deactivate; department management with manager assignment.
→ *Verify:* an employee created through the UI can log in; a deactivated one cannot; departments seed correctly and non-empty ones can't be deleted.

**Stage 3 — Attendance.** Daily marking screen, employee history view, filters (date/employee/department), Excel export.
→ *Verify:* exported `.xlsx` opens in Excel and matches the on-screen filtered rows exactly.

**Stage 4 — Leave.** Apply form with live balance, overlap validation, admin approve/reject queue, auto-marking of attendance.
→ *Verify:* approving a 2-day leave reduces balance by 2 and both dates show "On Leave"; overlap application is blocked.

**Stage 5 — Tasks & announcements.** Task assign / status flow / feedback / overdue flags; announcements CRUD + employee dashboard feed.
→ *Verify:* full task lifecycle works from both sides; a posted announcement shows on the employee dashboard.

**Stage 6 — Documents, performance & reports + polish.** Document upload/download with ownership checks; computed stats + monthly ratings; reports cards + attendance graph; apply `balcacorpdesign.md` styling across all screens.
→ *Verify:* cross-employee document access returns 403; report numbers match the seed data; graph renders; UI matches the design tokens.

## 11. Definition of done (v1)

From a fresh clone: install → seed → run, then this full flow works without errors: admin creates an employee → marks their attendance → assigns a task → employee logs in, updates the task, applies for leave → admin approves it, adds feedback and a monthly rating → admin exports attendance to Excel → all dashboard numbers are correct.
