CREATE TABLE scheduled_queries (id TEXT PRIMARY KEY NOT NULL, market TEXT NOT NULL, query TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE scheduled_runs (id TEXT PRIMARY KEY NOT NULL, query_id TEXT NOT NULL, started_at TEXT NOT NULL, status TEXT NOT NULL, result_count INTEGER NOT NULL DEFAULT 0, error_message TEXT, FOREIGN KEY(query_id) REFERENCES scheduled_queries(id) ON DELETE CASCADE);
--> statement-breakpoint
CREATE TABLE scheduled_results (id TEXT PRIMARY KEY NOT NULL, query_id TEXT NOT NULL, market TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', published_date TEXT NOT NULL DEFAULT '', first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, FOREIGN KEY(query_id) REFERENCES scheduled_queries(id) ON DELETE CASCADE, UNIQUE(query_id,url));
--> statement-breakpoint
CREATE INDEX scheduled_results_last_seen ON scheduled_results(last_seen_at);
