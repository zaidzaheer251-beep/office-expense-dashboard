# Project Tasks: Global Web App Migration

## 1. User Tasks (To Do First)
- [x] Create a free account at [Supabase](https://supabase.com/).
- [x] Spin up a new PostgreSQL database project (e.g. `Approx Expense`).
- [x] Retrieve your `Project URL` and `anon public API key` from Project Settings -> API.
- [x] Share these keys or place them in a local `.env` file (we will create a template for this).

## 2. Code Implementation Checklist
- [ ] **Database Setup**: Execute database table initialization schema.
- [x] **Dependencies**: Install `@supabase/supabase-js` using npm/yarn.
- [x] **Environment**: Create a `.env` template file.
- [x] **Login Screen UI**: Insert a login and registration card overlay in the HTML.
- [x] **Refactor app.js**:
  - [x] Replace local state actions with Supabase CRUD calls.
  - [x] Implement secure login/logout handlers.
  - [x] Configure Real-time WebSockets subscription for live group chats.
- [x] **Verification**: Run development build checks and manual sync tests.
