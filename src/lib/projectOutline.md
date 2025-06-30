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

### 2. Event Listing & Filtering
- [ ] **Rational:** Allow users to easily find relevant events.
  - [ ] Task: Build event list view with filters for event type (local/international).
  - [ ] Task: Add region-based filtering (e.g., Oslo, Bergen, Trondheim).
  - [ ] Task: Implement search functionality for events.

### 3. User Management & Roles
- [ ] **Rational:** Ensure only approved users can create events and all users can interact with events.
  - [ ] Task: Integrate Supabase authentication for user accounts.
  - [ ] Task: Implement user roles (organizer, attendee, admin).
  - [ ] Task: Build approval system for event organizers.

### 4. Event Participation & Engagement
- [ ] **Rational:** Allow users to express interest and communicate about events.
  - [ ] Task: Add RSVP options (attending, maybe, not attending) for events.
  - [ ] Task: Create event message board/thread for communication.
  - [ ] Task: Enable notifications for event updates and messages.

### 5. Payments & Monetization
- [ ] **Rational:** Support event payments and multiple payment options.
  - [ ] Task: Integrate Stripe for online payments.
  - [ ] Task: Add support for bank transfer and credit card options.
  - [ ] Task: Allow organizers to set payment requirements per event.

### 6. UI/UX & Frontend
- [ ] **Rational:** Deliver a modern, responsive, and user-friendly interface.
  - [ ] Task: Set up SvelteKit project with Tailwind CSS.
  - [ ] Task: Design event cards, forms, and navigation.
  - [ ] Task: Ensure mobile responsiveness and accessibility.

### 7. Backend & Data Management
- [ ] **Rational:** Store and manage event, user, and message data securely.
  - [ ] Task: Set up Supabase database schema for events, users, messages, and payments.
  - [ ] Task: Implement API endpoints for CRUD operations.
  - [ ] Task: Secure endpoints and data access based on user roles.

### 8. Admin & Moderation Tools
- [ ] **Rational:** Maintain quality and safety of event listings and user interactions.
  - [ ] Task: Build admin dashboard for approving events and users.
  - [ ] Task: Add moderation tools for message boards.

### 9. Testing & Quality Assurance
- [ ] **Rational:** Ensure reliability and usability of the application.
  - [ ] Task: Write unit and integration tests for core features.
  - [ ] Task: Conduct user testing and gather feedback.

### 10. Deployment & Documentation
- [ ] **Rational:** Make the app available to users and maintain clear documentation.
  - [ ] Task: Set up deployment pipeline (e.g., Vercel, Netlify).
  - [ ] Task: Write user and developer documentation.

---

## Future Enhancements
- [ ] Add calendar integration for events.
- [ ] Support for recurring events.
- [ ] Social sharing features.
- [ ] Analytics for organizers.

---

*This outline is a living document and should be updated as the project evolves.*
