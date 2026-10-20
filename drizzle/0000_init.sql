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

CREATE TABLE IF NOT EXISTS "media" (
  "id" serial PRIMARY KEY NOT NULL,
  "tmdb_id" integer NOT NULL,
  "media_type" text NOT NULL,
  "title" text NOT NULL,
  "poster_path" text,
  "overview" text,
  "year" text,
  "imdb_id" text,
  "cast_json" jsonb DEFAULT '[]'::jsonb,
  "meta_json" jsonb DEFAULT '{}'::jsonb,
  "imdb_rating" text,
  "rt_rating" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "media_tmdb_type_idx" ON "media" ("tmdb_id","media_type");

CREATE TABLE IF NOT EXISTS "watchlist_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "media_id" integer NOT NULL,
  "added_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_user_media_idx" ON "watchlist_items" ("user_id","media_id");

CREATE TABLE IF NOT EXISTS "watched_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "media_id" integer NOT NULL,
  "my_rating" numeric(3, 1) NOT NULL,
  "feelings" jsonb DEFAULT '[]'::jsonb,
  "comments" text DEFAULT '',
  "watched_on" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "watched_user_media_idx" ON "watched_entries" ("user_id","media_id");

CREATE TABLE IF NOT EXISTS "episode_progress" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "media_id" integer NOT NULL,
  "season" integer NOT NULL,
  "episode" integer NOT NULL,
  "watched" boolean DEFAULT false NOT NULL,
  "my_rating" numeric(3, 1),
  "watched_on" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "episode_user_unique_idx" ON "episode_progress" ("user_id","media_id","season","episode");

DO $$ BEGIN
  ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_media_id_media_id_fk"
    FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "watched_entries" ADD CONSTRAINT "watched_entries_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "watched_entries" ADD CONSTRAINT "watched_entries_media_id_media_id_fk"
    FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "episode_progress" ADD CONSTRAINT "episode_progress_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "episode_progress" ADD CONSTRAINT "episode_progress_media_id_media_id_fk"
    FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
