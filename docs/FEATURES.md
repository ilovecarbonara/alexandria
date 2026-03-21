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
  7. Save record to Supabase theses table
  8. Trigger certificate generation
  9. Show success state with tx link

## F3: Certificate Generation
- Generated on demand (not stored)
- Uses jsPDF + qrcode
- Contains: author name, title, level, category, submission type, 
  sha256 hash, tx hash, timestamp, QR code linking to Sepolia Etherscan tx
- Downloadable as PDF
- Regeneratable at any time from dashboard

## F4: Public Verification Interface (no login)
- Two modes: Search and Verify
- Search: keyword input + filters (level, category, date range) → returns thesis metadata
- Verify: upload PDF (hashed client-side) OR paste hash → checks blockchain → returns match or no match

## F5: Dispute Flag System
- Any authenticated user can flag any thesis
- Flag form: thesis reference + reason text
- Saves to disputes table with status: open
- Does NOT alter blockchain record
- Admin receives notification (can be a dashboard count badge, not email for MVP)

## F6: Admin Dashboard
- Accessible only if is_admin: true
- Charts (Chart.js):
  - Pie/bar: thesis distribution by category
  - Bar: distribution by level
  - Line: registration volume over time (monthly)
  - Count display: open vs resolved disputes
- Dispute management table: view flags, mark as resolved

## F7: User Dashboard
- List of own registered theses
- Each row: title, level, type, date, tx link, download certificate button
- Dispute flag button per thesis entry