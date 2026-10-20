import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type FavoriteMovie = {
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  year?: string;
};

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    pinHash: text("pin_hash").notNull(),
    avatarDataUrl: text("avatar_data_url"),
    favoriteGenres: jsonb("favorite_genres").$type<string[]>().default([]),
    favoriteMovies: jsonb("favorite_movies").$type<FavoriteMovie[]>().default([]),
    theme: text("theme").default("violet").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_pin_hash_idx").on(t.pinHash)],
);

export const media = pgTable(
  "media",
  {
    id: serial("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type").notNull(), // movie | tv
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    overview: text("overview"),
    year: text("year"),
    imdbId: text("imdb_id"),
    castJson: jsonb("cast_json").$type<Array<{ name: string; character?: string }>>().default([]),
    metaJson: jsonb("meta_json").$type<Record<string, unknown>>().default({}),
    imdbRating: text("imdb_rating"),
    rtRating: text("rt_rating"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("media_tmdb_type_idx").on(t.tmdbId, t.mediaType)],
);

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaId: integer("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("watchlist_user_media_idx").on(t.userId, t.mediaId)],
);

export const watchedEntries = pgTable(
  "watched_entries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaId: integer("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    myRating: numeric("my_rating", { precision: 3, scale: 1 }).notNull(),
    feelings: jsonb("feelings").$type<string[]>().default([]),
    comments: text("comments").default(""),
    watchedOn: text("watched_on").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("watched_user_media_idx").on(t.userId, t.mediaId)],
);

export const episodeProgress = pgTable(
  "episode_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaId: integer("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    season: integer("season").notNull(),
    episode: integer("episode").notNull(),
    watched: boolean("watched").default(false).notNull(),
    myRating: numeric("my_rating", { precision: 3, scale: 1 }),
    watchedOn: text("watched_on"),
  },
  (t) => [uniqueIndex("episode_user_unique_idx").on(t.userId, t.mediaId, t.season, t.episode)],
);

export type User = typeof users.$inferSelect;
export type Media = typeof media.$inferSelect;
export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type WatchedEntry = typeof watchedEntries.$inferSelect;
export type EpisodeProgress = typeof episodeProgress.$inferSelect;
