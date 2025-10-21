// This file defines the TypeScript interfaces for your Supabase database schema.
// It's a helpful reference for building your application's data models.

/**
 * Supabase's built-in user authentication table.
 * You should not modify this table directly.
 */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Public user profiles. This table has a one-to-one relationship with `auth.users`.
 * It holds public, non-sensitive user data.
 */
export interface Profile {
  id: string; // Foreign key to auth.users.id
  username: string;
  role: string; // e.g., 'admin', 'moderator', 'member'
  description: string;
  avatarUrl: string;
  provider: string; // e.g., 'email', 'google', 'facebook', etc.
  socialId: string | null; // Social provider user id
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The main events table. A competition is a type of event.
 */
export interface Event {
  id: string;
  createdAt: Date;
  startDate: Date;
  endDate: Date;
  title: string;
}

/**
 * Detailed information about an event. This table has a one-to-one relationship with `events`.
 */
export interface EventDetail {
  eventId: string; // Primary key and foreign key to events.id
  description: string;
  address: string;
  hotel: string;
  venue: string;
  maxParticipants: number;
}

/**
 * A join table to link users to events and define their roles (e.g., Event Director, Supporting Staff).
 */
export interface EventParticipant {
  id: string;
  eventId: string; // Foreign key to events.id
  userId: string; // Foreign key to auth.users.id
  eventRole: string;
}

/**
 * A table for competition-specific data, with a one-to-many relationship to `events`.
 */
export interface Competition {
  id: string; // Primary key and foreign key to events.id
  rules: string;
  competitionType: string;
}

/**
 * Divisions within a competition (e.g., Novice, Intermediate).
 */
export interface Division {
  id: string;
  competitionId: string; // Foreign key to competitions.id
  name: string;
  cost: number;
}

/**
 * A central payments table to track all transactions.
 */
export interface Payment {
  id: string;
  userId: string; // Foreign key to auth.users.id
  amount: number;
  bookedPrice: number;
  status: string; // e.g., 'approved', 'declined', 'pending'
  createdAt: Date;
  paymentType: string;
}

/**
 * Tracks a user's registration for an event.
 */
export interface EventRegistration {
  id: string;
  eventId: string; // Foreign key to events.id
  userId: string; // Foreign key to auth.users.id
  paymentId: string; // Foreign key to payments.id
  status: string; // e.g., 'waiting', 'approved', 'checkedIn'
  registeredAt: Date;
}

/**
 * A user's entry into a specific competition division.
 * This table replaces the `contestants` table and handles bib numbers and payment.
 */
export interface CompetitionEntry {
  id: string;
  userId: string; // Foreign key to auth.users.id
  divisionId: string; // Foreign key to divisions.id
  paymentId: string; // Foreign key to payments.id
  status: string; // e.g., 'approved', 'bibPickedUp'
  bib: number;
  registeredAt: Date;
}

/**
 * Defines a specific round or dance in a competition.
 */
export interface Heat {
  id: string;
  divisionId: string; // Foreign key to divisions.id
  roundNumber: number;
  startTime: Date;
}

/**
 * Tracks the status of contestants as they are checked in for each heat.
 */
export interface ContestantStatus {
  id: string;
  entryId: string; // Foreign key to competitionEntries.id
  heatId: string; // Foreign key to heats.id
  marshalledAt: Date;
}

/**
 * A join table to assign judges to competitions.
 */
export interface Judge {
  id: string;
  userId: string; // Foreign key to auth.users.id
  competitionId: string; // Foreign key to competitions.id
  role: string; // e.g., 'head judge', 'judge'
}

/**
 * Records the score for a contestant in a specific heat.
 */
export interface Score {
  id: string;
  heatId: string; // Foreign key to heats.id
  entryId: string; // Foreign key to competitionEntries.id
  judgeId: string; // Foreign key to judges.id
  score: number;
}

/**
 * Price tiers for event registration (e.g., Early Bird, Regular).
 */
export interface PriceTier {
  id: string;
  eventId: string; // Foreign key to events.id
  name: string; // e.g., 'Early Bird'
  price: number;
  startDate: Date;
  endDate: Date;
  ticketLimit: number | null; // null if unlimited
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Promo codes for discounts on event registration or products.
 */
export interface PromoCode {
  id: string;
  eventId: string; // Foreign key to events.id
  code: string;
  discountPercent: number;
  validFrom: Date;
  validTo: Date;
  usageLimit: number | null; // null if unlimited
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Products for sale (passes, merch, etc.).
 */
export interface Product {
  id: string;
  eventId: string; // Foreign key to events.id
  name: string;
  description: string;
  price: number;
  productType: string; // e.g., 'pass', 'merch'
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Orders for products (can include passes, merch, etc.).
 */
export interface Order {
  id: string;
  userId: string; // Foreign key to auth.users.id
  eventId: string; // Foreign key to events.id
  total: number;
  status: string; // e.g., 'pending', 'paid', 'cancelled'
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Join table for products in an order.
 */
export interface OrderItem {
  id: string;
  orderId: string; // Foreign key to orders.id
  productId: string; // Foreign key to products.id
  quantity: number;
  priceAtPurchase: number;
  promoCodeId: string | null; // Foreign key to promoCodes.id
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Education/Course table.
 */
export interface Course {
  id: string;
  name: string;
  description: string;
  teacherId: string; // Foreign key to auth.users.id
  level: string;
  duration: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Modules within a course.
 */
export interface CourseModule {
  id: string;
  courseId: string; // Foreign key to courses.id
  title: string;
  description: string;
  courseOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Join table for users enrolled in courses.
 */
export interface CourseEnrollment {
  id: string;
  courseId: string; // Foreign key to courses.id
  userId: string; // Foreign key to auth.users.id
  enrolledAt: Date;
  completedAt: Date | null;
}

/**
 * Event documents (info packets, schedules, etc.).
 */
export interface EventDocument {
  id: string;
  eventId: string; // Foreign key to events.id
  title: string;
  url: string;
  uploadedBy: string; // Foreign key to auth.users.id
  createdAt: Date;
  updatedAt: Date;
}

// --- Audit fields for all main tables ---
// Add createdAt, updatedAt, deletedAt (nullable) to all main tables above as shown.
