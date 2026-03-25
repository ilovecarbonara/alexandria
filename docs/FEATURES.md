# Feature Specifications

## F1: Authentication
- University email only (@uspf.edu.ph)
- Registration creates account with is_approved: false
- Admin must flip is_approved: true before user can log in
- Session management via Supabase Auth

## F2: Thesis Registration
- User uploads PDF + fills metadata form
- Fields: author name, title, level (dropdown), category (dropdown), submission type (radio)
- On submit:
  1. SHA-256 hash generated client-side or server-side (Node crypto module)
  2. PDF deleted immediately after hashing — never persisted
  3. Duplicate check: query blockchain via isRegistered(hash)
  4. If duplicate → show error, stop
  5. If draft → proceed to blockchain registration regardless of other drafts
  6. Submit hash + metadata to smart contract → get tx_hash
  7. Save record to Supabase theses table (including title_normalized)
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
- Downloadable as PDF
- Regeneratable at any time from dashboard

## F4: Public Verification Interface (no login)
- Two modes: Search and Verify
- Search: keyword input + filters (level, category, date range) → returns
  thesis metadata only — never the PDF
- Verify: upload PDF (hashed client-side) OR paste hash → checks blockchain
  → returns registration record or no match

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
- Title alert log table: view matched pairs, similarity scores, sent/failed status

## F7: User Dashboard
- List of own registered theses
- Each row: title, level, type, date, tx link, download certificate button
- Dispute flag button per thesis entry
- Notification indicator for received title alerts (see F8)

## F8: Title-Based Alert System
- Triggers automatically after every successful registration (step 8 of F2)
- Runs as a non-blocking background process — does not delay the
  registration response to the user
- Process:
  1. Normalize the incoming title (lowercase, strip punctuation,
     collapse whitespace) — store as title_normalized
  2. Fetch all existing title_normalized values from the theses table
  3. Run Fuse.js similarity comparison between incoming title and all existing titles
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