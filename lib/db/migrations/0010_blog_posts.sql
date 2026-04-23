CREATE TABLE "blog_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "author_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "published" boolean DEFAULT false NOT NULL,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
