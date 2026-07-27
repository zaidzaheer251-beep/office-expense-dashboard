# Project Context: Local-to-Global Web App Migration

## 1. Project Background
The current project is a client-side **Office Expense Dashboard** called **Approx Expense** configured for logging daily pantry, meals, and other office transactions, tracking them against a monthly limit (10,000 PKR) and received funding (5,500 PKR).

## 2. Current Architecture
*   **Data Persistence**: Limited to browser-local storage via `localStorage.setItem` / `localStorage.getItem` inside `app.js`. Data is stored in individual browsers and is not shared or synced.
*   **Authentication**: Hardcoded layout showing profile widget `Aamir Computer`. No login or role protection exists.
*   **Chat System**: Static messages simulated from `INITIAL_CHAT` array, stored locally.

## 3. Transition Strategy
We are converting the project to a globally synced web app using:
*   **Frontend**: Vite + Vanilla JS (re-bundling [app.js](file:///f:/office%20expance/app.js) as an ES Module).
*   **Backend & DB**: **Supabase** (PostgreSQL cloud database + Built-in Auth + Real-time WebSockets).

## 4. Key Files Involved
*   [index.html](file:///f:/office%20expance/index.html) (Main UI, Tab layouts)
*   [app.js](file:///f:/office%20expance/app.js) (Application Logic, State management)
*   [style.css](file:///f:/office%20expance/style.css) (CSS variables, layout styling)
*   [package.json](file:///f:/office%20expance/package.json) (Vite bundler config)
