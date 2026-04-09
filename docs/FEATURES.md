# Feature Specifications

## F1: Authentication
- University email only (@uspf.edu.ph)
- Registration creates account with is_approved: false
- Admin must flip is_approved: true before user can log in
- Session management via Supabase Auth

## F2: Thesis Registration
- User uploads PDF + fills metadata form
- Fields: author name (pre-filled from user profile, editable), title, level (dropdown), category (dropdown), submission type (radio)
- If the user has existing draft registrations without a child revision, a "This is a revision of" dropdown appears — linking the new thesis as the next entry in a version chain (see F12)
- On submit:
  1. SHA-256 hash generated client-side via Web Crypto API — PDF never leaves the browser. Node crypto module is NOT used for registration.
  2. PDF deleted immediately after hashing — never persisted
  3. Duplicate check: query blockchain via isRegistered(hash)
  4. If duplicate → show error, stop
  5. If draft → proceed to blockchain registration regardless of other drafts
  6. Submit hash + metadata to smart contract → get tx_hash
  7. Save record to Supabase theses table (including title_normalized, previous_thesis_id if revision)
  8. Trigger title similarity check (F8) — non-blocking, runs after save
  9. Trigger certificate generation
  10. Show success state with tx link

## F3: Certificate Generation
- Generated on demand (not stored)
- Uses jsPDF + qrcode
- Contains: author name, title, level, category, submission type,
  sha256 hash, tx hash, timestamp, QR code linking to Sepolia Etherscan tx
- Certificate text frames the document as a REGISTRATION RECORD,
  not a proof of authorship
- If the thesis belongs to a version chain (>1 entry), the certificate includes a "Version History" table showing version number, type, SHA-256 hash, tx hash, and date for each chain entry
- Downloadable as PDF
- Regeneratable at any time from dashboard

## F4: Public Verification Interface (no login)
- Two modes: Search and Verify
- Search: keyword input + filters (level, category, date range) → returns
  thesis metadata only — never the PDF
- Search excludes pending-status theses (only accepted/flagged/rejected shown)
- Verify: upload PDF (hashed client-side) OR paste hash → checks blockchain
  → returns registration record or no match
- If the verified thesis belongs to a version chain (>1 entry), a version history timeline is displayed alongside the metadata

## F5: Dispute Flag System
- Any authenticated user can flag any thesis registration
- Flag form: thesis reference + reason text
- Saves to disputes table with status: open
- Does NOT alter blockchain record
- Admin receives notification (dashboard count badge for MVP)

## F6: Admin Dashboard
- Accessible only if is_admin: true
- Charts (Chart.js):
  - Pie/bar: thesis distribution by category
  - Bar: distribution by level
  - Line: registration volume over time (monthly)
  - Count display: open vs resolved disputes
  - Count display: title alerts sent (total, last 30 days)
- Dispute management table: view flags, mark as resolved
- Thesis registry table: view all theses, change status (pending → accepted/flagged/rejected)
- Title alert log table: view matched pairs, similarity scores, sent/failed status
- All admin tables are paginated (15 per page) with expand-to-modal for full details

## F7: User Dashboard
- List of own registered theses with pagination (15 per page)
- Each row: title, status, date, tx hash link, actions (certificate download, version history)
- Content is truncated to one line with ellipsis; an "Expand" button opens a full-detail modal overlay
- "History" button appears on theses that participate in a version chain — opens a modal with a timeline view
- Title Alerts page (sidebar nav item): table of similarity alerts scoped to the user, each with a dispute/flag action
- Alert count displayed as a stat card on the main dashboard
- Stat cards: registered theses count, active disputes, title alerts, recent activity

## F8: Title-Based Alert System
- Triggers automatically after every successful registration (step 8 of F2)
- Runs as a non-blocking background process — does not delay the
  registration response to the user
- Process:
  1. Normalize the incoming title (lowercase, strip punctuation,
     collapse whitespace) — store as title_normalized
  2. Fetch all existing title_normalized values from the theses table
  3. Query Supabase using pg_trgm similarity() function against 
   title_normalized column — threshold set via TITLE_ALERT_THRESHOLD env variable
  4. Collect all matches above the configured threshold (suggested default: 0.75)
  5. For each match, retrieve the author (user_id) of the matched thesis
  6. Send alert email via Resend to the matched author's registered email
  7. Log each alert to the title_alerts table (new_thesis_id, matched_thesis_id,
     notified_user_id, similarity_score, status: sent/failed)
- Alert email contains:
  - Subject: "A new thesis with a similar title has been registered on Alexandria"
  - Matched author's name
  - Their registered thesis title
  - Incoming thesis title
  - Incoming registration date and tx link
  - Link to public verification interface
- The alert is informational only — it does not alter any record or
  trigger any automated action
- Threshold is configurable via environment variable (TITLE_ALERT_THRESHOLD)
  to allow tuning without a code deploy
- A single incoming registration may trigger multiple alerts if it
  matches multiple existing entries
- Draft registrations also trigger the similarity check
- Same-author matches are skipped entirely — no alert created, no email sent (e.g., user registering a Final after their own Draft)

## F9: Thesis Status Workflow
- New registrations default to status: pending
- Admin can change status to: accepted, flagged, rejected
- Status changes are logged in activity_logs
- Status change to accepted/rejected triggers email notification to the thesis author via Resend
- Email contains: author name, thesis title, new status, and a link to the thesis
- Public verification page displays thesis status alongside metadata

## F10: User Management
- Admin can view all registered users
- Admin can deactivate a user (sets is_active: false)
- Admin can reactivate a user (sets is_active: true)
- Deactivated users are signed out on next request and cannot log in
- Admin can reject a user (sets is_approved: false — soft, reversible)
- Admin can re-approve a rejected user
- last_active_at is tracked for user activity monitoring

## F11: Activity Logging
- Key user actions are logged to the activity_logs table
- Actions include: thesis registration, dispute creation, status changes
- Admin can view recent activity in the admin dashboard
- Logs are append-only and never modified

## F12: Version Chain
- Theses can be linked in a linear version chain via `previous_thesis_id`
- Each thesis has at most one predecessor and one successor
- Only draft theses without an existing child revision are available as revision targets
- Chain is displayed as a vertical timeline with version numbering (v1, v2, …), submission type badges, and current-entry highlighting
- Version chain appears in: user dashboard (modal), public verification (inline timeline), and certificate PDF (table)
- Chain data is built in-memory from the user's theses — walks backward to find the root, then forward to produce chronological order
- Cycle-safe traversal via Set guards