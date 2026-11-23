CREATE TABLE official_sources (id TEXT PRIMARY KEY NOT NULL, market TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, description TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '', source_kind TEXT NOT NULL, checked_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX official_sources_market ON official_sources(market);
