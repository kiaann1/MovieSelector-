CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "pin_hash" text NOT NULL,
  "avatar_data_url" text,
  "favorite_genres" jsonb DEFAULT '[]'::jsonb,
  "favorite_movies" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_pin_hash_idx" ON "users" ("pin_hash");

-- Scope personal tables to users (safe to re-run where columns already exist)
DO $$ BEGIN
  ALTER TABLE "watchlist_items" ADD COLUMN "user_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "watched_entries" ADD COLUMN "user_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "episode_progress" ADD COLUMN "user_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "watched_entries" ADD CONSTRAINT "watched_entries_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "episode_progress" ADD CONSTRAINT "episode_progress_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP INDEX IF EXISTS "watchlist_media_idx";
DROP INDEX IF EXISTS "watched_media_idx";
DROP INDEX IF EXISTS "episode_unique_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_user_media_idx" ON "watchlist_items" ("user_id","media_id");
CREATE UNIQUE INDEX IF NOT EXISTS "watched_user_media_idx" ON "watched_entries" ("user_id","media_id");
CREATE UNIQUE INDEX IF NOT EXISTS "episode_user_unique_idx" ON "episode_progress" ("user_id","media_id","season","episode");
