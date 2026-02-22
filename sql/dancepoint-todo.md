# Dancepoint.no — Platform TODO List
_Last updated: February 2026_

---

## ✅ DONE

- [x] Stripe Connect Express onboarding for Super Users
- [x] Organizer stripe_account_id saved in Supabase
- [x] Ticket checkout with multiple product tiers
- [x] 1% platform service fee + 3.5% optional Stripe handling fee
- [x] Fee model per event (on_top / included)
- [x] Webhook confirms payments server-side
- [x] payment_status flips to 'paid' on successful payment
- [x] Admin payments dashboard per event (revenue, pending, refund button)
- [x] Fee breakdown shown on registration and receipt pages
- [x] Domain dancepoint.no connected to Vercel
- [x] Stripe live mode configured
- [x] Email verification on signup (Supabase Auth)
- [x] Check your email page after signup
- [x] Auth confirm page sets cookie after verification
- [x] Password confirmation field on signup
- [x] Event create + edit (mostly in sync, see TODOs below)
- [x] User can register for event
- [x] User gets pending status until ED approves
- [x] User can pay with Stripe once approved
- [x] Receipt / registration detail page

---

## 🔴 CRITICAL — Must have before real users

### Authentication & Accounts
- [ ] **Owner-only dashboard** to upgrade a user's userRole to 'Super User' (Event Director)
  - Currently there is no UI to promote users — it has to be done manually in Supabase
  - Needs a simple admin page: list users → click to assign role
- [ ] **Block unverified users** from registering for events
  - Currently email_verified is not checked before allowing event registration
  - Add check in event registration load/action
- [ ] **Sign in page** should show friendly error if email not yet verified
- [ ] **Session expiry handling** — if sb_user cookie expires, user gets weird errors instead of being sent to login

### Event Director Flow
- [ ] **Event visibility toggle** — events need a `is_published` column on the events table
  - Published = visible to all users
  - Unpublished = only visible to ED and admins
  - Add to event create + edit forms
  - Filter unpublished events out of public /events page
- [ ] **Participant approval UI** — ED needs a page to see pending registrations and approve/reject them
  - Currently no dedicated UI for this (critical blocker for payment flow)
  - Suggested location: `/admin/events/[eventId]/participants`
- [ ] **Participant list view** — show all registered participants per event with status, products, payment status
- [ ] **Sync event create and event edit forms** — some fields exist in one but not the other (e.g. stripe_fee_model only in create)

### Payments
- [ ] **Refund endpoint** `/api/stripe/refund` — button exists on dashboard but endpoint not built yet
- [ ] **Handle refunds in Supabase** — when refund issued, flip payment_status back to 'refunded'

---

## 🟡 IMPORTANT — Should have soon

### Event Director Flow
- [ ] **Separate product management page** `/admin/events/[eventId]/product`
  - Currently products are managed on the main event page which gets cluttered
  - Needs full CRUD: create, edit, deactivate, set sale dates, set limits
  - Wire up all product fields: sale_start, sale_end, quantity_total, quantity_sold, is_active, role_options, leader_limit, follower_limit
- [ ] **Admin landing page** before entering `/admin/events`
  - Currently /admin goes straight to events list
  - Should be a proper dashboard with summary stats: total events, total revenue, total users
- [ ] **ED Stripe dashboard improvements**
  - Show payout history pulled from Stripe API (not just Supabase)
  - Show next payout date
  - Link to Stripe Express dashboard

### User Flow  
- [ ] **Hotel booking flow** `/profile/[registrationID]/accommodation`
  - Page exists but functionality not built
  - Needs to connect to accommodation products and handle booking logic
- [ ] **Email confirmation after payment** — send buyer a receipt email when payment_status flips to paid
- [ ] **Email to ED when new registration** — notify organizer when someone registers for their event
- [ ] **Email to user when approved** — notify user when ED approves their registration so they know to pay

### General
- [ ] **Public event page improvements** — events currently show even if unpublished (fix once visibility toggle added)
- [ ] **Error pages** — 404 and 500 pages need to be styled to match the site
- [ ] **Loading states** — several pages have no loading indicator while server fetches data

---

## 🟢 NICE TO HAVE — Future improvements

### User Features
- [ ] **User dashboard** — proper profile page showing all registrations, payment status, upcoming events in one view
- [ ] **QR code ticket** — generate QR code per participant after payment (svelte-qrcode is already imported but commented out)
- [ ] **Waitlist** — if event is full, allow users to join a waitlist
- [ ] **Couples registration** — logic exists (pending_couples_registration status) but UI flow needs work
- [ ] **WSDC ID validation** — verify WSDC IDs against the actual WSDC database if an API is available

### Event Director Features
- [ ] **Discount codes** — allow EDs to create promo codes for ticket discounts
- [ ] **Check-in system** — ED can scan QR codes at the door to mark attendees as checked in
- [ ] **Export participants** — download CSV of all registrations for an event
- [ ] **Event duplication** — clone an existing event as a starting point for a new one

### Platform / Admin
- [ ] **Super admin analytics** — platform-wide revenue, user growth, event count over time
- [ ] **Terms of service + privacy policy pages** — required for GDPR compliance (Norway)
- [ ] **Cookie consent banner** — required for GDPR
- [ ] **Rate limiting on signup** — prevent spam account creation
- [ ] **Password reset flow** — currently no way for users to reset a forgotten password

---

## 📋 SUGGESTED ORDER OF ATTACK

Based on what real users will need first:

1. Event visibility toggle (unpublished events showing publicly is a problem now)
2. Owner dashboard to promote users to Super User
3. Participant approval UI for ED
4. Refund endpoint (button already on dashboard, just missing the backend)
5. Sync create/edit event forms
6. Separate product management page
7. Email notifications (payment confirmed, registration approved)
8. Hotel booking flow
9. Password reset
10. GDPR pages (Terms, Privacy, Cookie consent)
