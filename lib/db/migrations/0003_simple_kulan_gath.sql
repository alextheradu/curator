ALTER TABLE "documents" ALTER COLUMN "season_year" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "scope" text DEFAULT 'season' NOT NULL;