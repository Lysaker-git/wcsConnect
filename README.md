# West Coast Swing Event App

A platform for registering, discovering, and managing West Coast Swing events, from local classes to large international conventions. Built with SvelteKit, Tailwind CSS, and Supabase.

## Vision
A modern, user-friendly app for event creation, engagement, and management, supporting both small and large events, with features for filtering, payments, and communication.

---

## Features
- Register and manage events (title, description, time, location, banner)
- Two event types: large-scale (weekend/conventions) and small-scale (local classes)
- Event approval workflow for new submissions
- Event listing with filters (type, region: Oslo, Bergen, Trondheim, etc.)
- User authentication and roles (organizer, attendee, admin)
- RSVP options (attending, maybe, not attending)
- Event message board/thread for communication
- Notifications for updates and messages
- Payments via Stripe, bank transfer, or credit card
- Admin dashboard for approvals and moderation
- Mobile responsive UI with Tailwind CSS

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Development server
```bash
npm run dev
# or to open automatically in your browser:
npm run dev -- --open
```

### 3. Building for production
```bash
npm run build
```
Preview the production build:
```bash
npm run preview
```

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

---

## Project Roadmap
- [ ] Event registration & management
- [ ] Event listing & filtering
- [ ] User management & roles
- [ ] Event participation & engagement
- [ ] Payments & monetization
- [ ] UI/UX & frontend
- [ ] Backend & data management
- [ ] Admin & moderation tools
- [ ] Testing & quality assurance
- [ ] Deployment & documentation

See [`src/lib/projectOutline.md`](src/lib/projectOutline.md) for a detailed breakdown of tasks and rationales.

---

## Tech Stack
- SvelteKit
- Tailwind CSS
- Supabase (backend, auth, database)

---

## Contributing
Contributions are welcome! Please see the project outline for current priorities and open tasks.

---

*This project is inspired by West Coast Swing conventions and aims to serve both local and international dance communities.*
