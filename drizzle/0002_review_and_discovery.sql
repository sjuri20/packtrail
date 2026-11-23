CREATE TABLE live_sources (id TEXT PRIMARY KEY NOT NULL, market TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', published_date TEXT NOT NULL DEFAULT '', first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, UNIQUE(market,url));
--> statement-breakpoint
CREATE TABLE source_reviews (source_key TEXT PRIMARY KEY NOT NULL, source_type TEXT NOT NULL, source_id TEXT NOT NULL, market TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '', source_kind TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, version INTEGER NOT NULL, reviewed_at TEXT NOT NULL, note TEXT NOT NULL DEFAULT '');
--> statement-breakpoint
CREATE TABLE source_review_events (id TEXT PRIMARY KEY NOT NULL, source_key TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '', source_kind TEXT NOT NULL DEFAULT '', reviewed_at TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', UNIQUE(source_key,version));
--> statement-breakpoint
CREATE INDEX source_reviews_search ON source_reviews(market,status);
