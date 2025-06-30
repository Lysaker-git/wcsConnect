# Project Outline: West Coast Swing Event App

## Vision
A platform for registering, discovering, and managing West Coast Swing events, ranging from local classes to large international conventions. The app will support event creation, user engagement, communication, and payment, with a focus on usability and scalability.

---

## Core Features & Milestones

### 1. Event Registration & Management
- [ ] **Rational:** Enable organizers to create and manage events with essential details.
  - [ ] Task: Implement event creation form (title, description, time, location, banner option).
  - [ ] Task: Support two event types: large-scale (weekend/conventions) and small-scale (local classes).
  - [ ] Task: Add event approval workflow for new event submissions.
  - [ ] Task: Allow editing and deletion of events by organizers/admins.
  - [ ] Task: Add event capacity and registration limits for large events.

### 2. Event Listing & Filtering
- [ ] **Rational:** Allow users to easily find relevant events.
  - [ ] Task: Build event list view with filters for event type (local/international).
  - [ ] Task: Add region-based filtering (e.g., Oslo, Bergen, Trondheim).
  - [ ] Task: Implement search functionality for events.
  - [ ] Task: Add sorting options (date, popularity, region).
  - [ ] Task: Display event banners and key info in list view.

### 3. User Management & Roles
- [ ] **Rational:** Ensure only approved users can create events and all users can interact with events.
  - [ ] Task: Integrate Supabase authentication for user accounts.
  - [ ] Task: Implement user roles (organizer, attendee, admin).
  - [ ] Task: Build approval system for event organizers.
  - [ ] Task: User profile pages with event history and RSVPs.
  - [ ] Task: Password reset and email verification flows.

### 4. Event Participation & Engagement
- [ ] **Rational:** Allow users to express interest and communicate about events.
  - [ ] Task: Add RSVP options (attending, maybe, not attending) for events.
  - [ ] Task: Create event message board/thread for communication.
  - [ ] Task: Enable notifications for event updates and messages.
  - [ ] Task: Allow users to comment and reply in threads.
  - [ ] Task: Display attendee lists (with privacy options).

### 5. Payments & Monetization
- [ ] **Rational:** Support event payments and multiple payment options.
  - [ ] Task: Integrate Stripe for online payments.
  - [ ] Task: Add support for bank transfer and credit card options.
  - [ ] Task: Allow organizers to set payment requirements per event.
  - [ ] Task: Track payment status per user/event.
  - [ ] Task: Send payment confirmation emails/receipts.

### 6. UI/UX & Frontend
- [ ] **Rational:** Deliver a modern, responsive, and user-friendly interface.
  - [ ] Task: Set up SvelteKit project with Tailwind CSS.
  - [ ] Task: Design event cards, forms, and navigation.
  - [ ] Task: Ensure mobile responsiveness and accessibility.
  - [ ] Task: Add loading states and error handling.
  - [ ] Task: Implement dark mode support.

### 7. Backend & Data Management
- [ ] **Rational:** Store and manage event, user, and message data securely.
  - [ ] Task: Set up Supabase database schema for events, users, messages, payments, RSVPs, and regions.
  - [ ] Task: Implement API endpoints for CRUD operations.
  - [ ] Task: Secure endpoints and data access based on user roles.
  - [ ] Task: Add rate limiting and logging for sensitive actions.

### 8. Admin & Moderation Tools
- [ ] **Rational:** Maintain quality and safety of event listings and user interactions.
  - [ ] Task: Build admin dashboard for approving events and users.
  - [ ] Task: Add moderation tools for message boards (delete, ban, report).
  - [ ] Task: View and manage payment disputes/refunds.

### 9. Testing & Quality Assurance
- [ ] **Rational:** Ensure reliability and usability of the application.
  - [ ] Task: Write unit and integration tests for core features.
  - [ ] Task: Conduct user testing and gather feedback.
  - [ ] Task: Set up automated CI/CD for tests and deployment.

### 10. Deployment & Documentation
- [ ] **Rational:** Make the app available to users and maintain clear documentation.
  - [ ] Task: Set up deployment pipeline (e.g., Vercel, Netlify).
  - [ ] Task: Write user and developer documentation.
  - [ ] Task: Add onboarding guides for organizers and admins.

---

## Supabase Database Structure
- **Tables Needed:**
  - `users`: User profiles, roles, approval status
    - **Relations:**
      - One-to-many with `events` (a user can organize many events)
      - One-to-many with `rsvps` (a user can RSVP to many events)
      - One-to-many with `messages` (a user can post many messages)
      - One-to-many with `payments` (a user can make many payments)
      - One-to-many with `organizer_applications` (a user can apply to be an organizer)
  - `events`: Event details (title, description, type, location, time, banner, capacity, organizer_id, approval status)
    - **Relations:**
      - Many-to-one with `users` (organizer_id references users.id)
      - Many-to-one with `regions` (region_id references regions.id)
      - One-to-many with `rsvps` (an event can have many RSVPs)
      - One-to-many with `messages` (an event can have many messages)
      - One-to-many with `payments` (an event can have many payments)
      - Many-to-one with `event_types` (event_type_id references event_types.id)
  - `regions`: List of regions/cities for filtering
    - **Relations:**
      - One-to-many with `events` (a region can have many events)
  - `rsvps`: User RSVPs for events (user_id, event_id, status)
    - **Relations:**
      - Many-to-one with `users` (user_id references users.id)
      - Many-to-one with `events` (event_id references events.id)
  - `messages`: Event message board threads (event_id, user_id, content, timestamp, parent_id for replies)
    - **Relations:**
      - Many-to-one with `users` (user_id references users.id)
      - Many-to-one with `events` (event_id references events.id)
      - Self-referencing for threads (parent_id references messages.id)
  - `payments`: Payment records (user_id, event_id, amount, method, status, timestamp)
    - **Relations:**
      - Many-to-one with `users` (user_id references users.id)
      - Many-to-one with `events` (event_id references events.id)
  - `event_types`: (optional) For extensibility of event categories
    - **Relations:**
      - One-to-many with `events` (an event type can have many events)
  - `organizer_applications`: For tracking organizer approval workflow
    - **Relations:**
      - Many-to-one with `users` (user_id references users.id)

- **Recommended:** Use Supabase Row Level Security (RLS) for data protection.

---

## Site Structure
- `/` — Home (event feed, filters)
- `/events` — All events (list, filters, search)
- `/events/[id]` — Event details (RSVP, message board, payment)
- `/create-event` — Event creation form (organizer only)
- `/profile` — User profile (event history, RSVPs)
- `/admin` — Admin dashboard (approvals, moderation)
- `/login` — Authentication
- `/regions/[region]` — Filtered events by region
- `/about` — About/project info

---

## Server-Side Helper Functions (API/Endpoints)
- Event CRUD (create, read, update, delete)
- User authentication and role management
- Organizer approval workflow
- RSVP management (add/update RSVP)
- Payment processing (initiate, verify, record)
- Message board CRUD (post, reply, delete)
- Admin moderation actions (approve, ban, delete)
- Region and event type management
- Email notifications (payment, approval, reminders)

---

## Client-Side Functionality
- Event browsing, filtering, and searching
- Event creation/editing (for organizers)
- RSVP selection and status updates
- Real-time message board updates (using Supabase subscriptions)
- Payment UI and status display
- User profile management
- Responsive UI interactions (modals, toasts, loading states)
- Client-side validation for forms
- Theme switching (dark/light mode)

---

## Future Enhancements
- [ ] Add calendar integration for events.
- [ ] Support for recurring events.
- [ ] Social sharing features.
- [ ] Analytics for organizers.
- [ ] Multi-language support.
- [ ] Push notifications (mobile/web).

---

## Branching Strategy & Versioning

### Branch Naming Conventions
- **main**: Stable, production-ready code.
- **dev**: Integration branch for features before merging to main.
- **feature/<feature-name>**: For new features (e.g., feature/event-creation, feature/payment-integration)
- **bugfix/<short-description>**: For bug fixes (e.g., bugfix/rsvp-status-update)
- **hotfix/<short-description>**: For urgent fixes to production (e.g., hotfix/payment-error)
- **docs/<short-description>**: For documentation updates (e.g., docs/update-readme)
- **test/<short-description>**: For testing-related changes (e.g., test/add-event-tests)

### Versioning Guidelines
- Use [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH)
  - **MAJOR**: Breaking changes or major new releases (e.g., 1.0.0 → 2.0.0)
  - **MINOR**: New features, backwards compatible (e.g., 1.1.0 → 1.2.0)
  - **PATCH**: Bug fixes, small improvements (e.g., 1.1.1 → 1.1.2)
- **Recommended:**
  - Bump MINOR version for each significant feature (e.g., event creation, payments, messaging)
  - Bump PATCH version for bug fixes or minor enhancements
  - Only bump MAJOR for breaking changes or major refactors
- Tag releases in main branch (e.g., v1.0.0, v1.1.0)

### Example Workflow
1. Create a new branch from dev: `git checkout -b feature/event-creation dev`
2. Work on the feature, commit changes.
3. Open a pull request to dev for review.
4. After testing, merge to dev.
5. When dev is stable and ready for release, merge to main and tag with the new version.

---

*This outline is a living document and should be updated as the project evolves.*
