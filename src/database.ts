import Database from 'better-sqlite3';
import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  author: string;
  repository: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface Commit {
  id: string;
  message: string;
  author: string;
  repository: string;
  url: string;
  timestamp: string;
}

export class GitHubMemoryDB {
  private db: Database.Database;

  constructor(dbPath: string = './github-memory.db') {
    // Ensure directory exists
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Create pull_requests table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pull_requests (
        id INTEGER PRIMARY KEY,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        state TEXT NOT NULL,
        author TEXT NOT NULL,
        repository TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(repository, number)
      )
    `);

    // Create commits table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS commits (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        author TEXT NOT NULL,
        repository TEXT NOT NULL,
        url TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);

    // Create indexes for faster searches
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pr_repository ON pull_requests(repository);
      CREATE INDEX IF NOT EXISTS idx_pr_author ON pull_requests(author);
      CREATE INDEX IF NOT EXISTS idx_pr_state ON pull_requests(state);
      CREATE INDEX IF NOT EXISTS idx_commit_repository ON commits(repository);
      CREATE INDEX IF NOT EXISTS idx_commit_author ON commits(author);
    `);
  }

  // Pull Request operations
  insertPullRequest(pr: PullRequest): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pull_requests 
      (id, number, title, body, state, author, repository, url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(pr.id, pr.number, pr.title, pr.body, pr.state, pr.author, pr.repository, pr.url, pr.created_at, pr.updated_at);
  }

  searchPullRequests(query: string, repository?: string, author?: string, state?: string): PullRequest[] {
    let sql = 'SELECT * FROM pull_requests WHERE 1=1';
    const params: (string | number)[] = [];

    if (query) {
      sql += ' AND (title LIKE ? OR body LIKE ?)';
      params.push(`%${query}%`, `%${query}%`);
    }

    if (repository) {
      sql += ' AND repository = ?';
      params.push(repository);
    }

    if (author) {
      sql += ' AND author = ?';
      params.push(author);
    }

    if (state) {
      sql += ' AND state = ?';
      params.push(state);
    }

    sql += ' ORDER BY updated_at DESC LIMIT 50';

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as PullRequest[];
  }

  getPullRequest(repository: string, number: number): PullRequest | undefined {
    const stmt = this.db.prepare('SELECT * FROM pull_requests WHERE repository = ? AND number = ?');
    return stmt.get(repository, number) as PullRequest | undefined;
  }

  // Commit operations
  insertCommit(commit: Commit): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO commits 
      (id, message, author, repository, url, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(commit.id, commit.message, commit.author, commit.repository, commit.url, commit.timestamp);
  }

  searchCommits(query: string, repository?: string, author?: string): Commit[] {
    let sql = 'SELECT * FROM commits WHERE 1=1';
    const params: (string | number)[] = [];

    if (query) {
      sql += ' AND message LIKE ?';
      params.push(`%${query}%`);
    }

    if (repository) {
      sql += ' AND repository = ?';
      params.push(repository);
    }

    if (author) {
      sql += ' AND author = ?';
      params.push(author);
    }

    sql += ' ORDER BY timestamp DESC LIMIT 50';

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as Commit[];
  }

  getCommit(id: string): Commit | undefined {
    const stmt = this.db.prepare('SELECT * FROM commits WHERE id = ?');
    return stmt.get(id) as Commit | undefined;
  }

  close(): void {
    this.db.close();
  }
}
