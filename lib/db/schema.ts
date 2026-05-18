import {
  pgTable, text, timestamp, integer, jsonb, uuid, boolean, pgEnum, index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  isAdmin: boolean("is_admin").notNull().default(false),
  defaultChatMode: text("default_chat_mode", { enum: ["rookie", "veteran"] }).notNull().default("veteran"),
  emailBanned: boolean("email_banned").notNull().default(false),
  bannedEmail: text("banned_email"),
  preferredName: text("preferred_name"),
  teamNumber: integer("team_number"),
  onboardedAt: timestamp("onboarded_at"),
  tosAcceptedAt: timestamp("tos_accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("New project"),
  icon: text("icon").notNull().default("folder"),
  color: text("color").notNull().default("teal"),
  contextSummary: text("context_summary").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("projects_user_updated_idx").on(table.userId, table.updatedAt),
]);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  guestId: text("guest_id"),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull().default("New Chat"),
  seasonYear: integer("season_year").notNull().default(2026),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("conversations_project_id_idx").on(table.projectId),
  index("conversations_guest_id_idx").on(table.guestId),
]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  citations: jsonb("citations").$type<Citation[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  scope: text("scope", { enum: ["season", "general"] }).notNull().default("season"),
  seasonYear: integer("season_year"),
  minioKey: text("minio_key").notNull(),
  pageCount: integer("page_count").notNull().default(0),
  tags: text("tags").array().notNull().default([]),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploadedById: text("uploaded_by_id").references(() => users.id),
});

export const docChunks = pgTable("doc_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  pageNumber: integer("page_number").notNull(),
  content: text("content").notNull(),
  qdrantPointId: text("qdrant_point_id"),
});

export const bannedEmails = pgTable("banned_emails", {
  email: text("email").primaryKey(),
  reason: text("reason"),
  bannedAt: timestamp("banned_at").defaultNow().notNull(),
  bannedById: text("banned_by_id").references(() => users.id),
});

export const reportStatusEnum = pgEnum("report_status", ["pending", "reviewed", "dismissed"]);
export const reportSourceEnum = pgEnum("report_source", ["user_report", "auto_moderation"]);
export const supportRequestStatusEnum = pgEnum("support_request_status", ["open", "closed"]);
export const appLogLevelEnum = pgEnum("app_log_level", ["info", "warn", "error"]);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  reportedById: text("reported_by_id").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  source: reportSourceEnum("source").notNull().default("user_report"),
  matchedTerms: text("matched_terms").array().notNull().default([]),
  status: reportStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supportRequests = pgTable("support_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name"),
  email: text("email"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  pagePath: text("page_path"),
  userAgent: text("user_agent"),
  ip: text("ip"),
  status: supportRequestStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appLogs = pgTable("app_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  level: appLogLevelEnum("level").notNull().default("info"),
  source: text("source").notNull(),
  message: text("message").notNull(),
  path: text("path"),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  ip: text("ip"),
  details: jsonb("details").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").primaryKey(),
  scope: text("scope").notNull(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull().default(""),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Citation = {
  type: "doc" | "web";
  label: string;
  documentName?: string;
  url?: string;
  pageNumber?: number;
  minioKey?: string;
  quote?: string;
};

export type BlogPost = typeof blogPosts.$inferSelect;
export type ProjectRecord = typeof projects.$inferSelect;
export type DocumentScope = "season" | "general";
export type ReportStatus = "pending" | "reviewed" | "dismissed";
export type ReportSource = "user_report" | "auto_moderation";
export type SupportRequestStatus = "open" | "closed";
export type AppLogLevel = "info" | "warn" | "error";
