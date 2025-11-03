import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GitHubMemoryDB } from '../src/database.js';
import { unlinkSync, existsSync } from 'fs';
import * as os from 'os';
import * as path from 'path';

const TEST_DB_PATH = path.join(os.tmpdir(), 'test-github-memory-' + Date.now() + '.db');

// Helper function to clean up test database
function cleanupTestDb(dbPath: string) {
  try {
    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

describe('GitHubMemoryDB', () => {
  it('should create database and initialize schema', () => {
    const testPath = TEST_DB_PATH + '-1';
    let db: GitHubMemoryDB | null = null;
    
    try {
      db = new GitHubMemoryDB(testPath);
      assert.ok(db);
    } finally {
      if (db) db.close();
      cleanupTestDb(testPath);
    }
  });

  it('should insert and retrieve pull requests', () => {
    const testPath = TEST_DB_PATH + '-2';
    let db: GitHubMemoryDB | null = null;
    
    try {
      db = new GitHubMemoryDB(testPath);
      
      const pr = {
        id: 1,
        number: 42,
        title: 'Add new feature',
        body: 'This PR adds a new feature',
        state: 'open',
        author: 'testuser',
        repository: 'test/repo',
        url: 'https://github.com/test/repo/pull/42',
        created_at: '2025-11-03T10:00:00Z',
        updated_at: '2025-11-03T10:00:00Z'
      };
      
      db.insertPullRequest(pr);
      const retrieved = db.getPullRequest('test/repo', 42);
      
      assert.strictEqual(retrieved?.id, pr.id);
      assert.strictEqual(retrieved?.number, pr.number);
      assert.strictEqual(retrieved?.title, pr.title);
    } finally {
      if (db) db.close();
      cleanupTestDb(testPath);
    }
  });

  it('should search pull requests by query', () => {
    const testPath = TEST_DB_PATH + '-3';
    let db: GitHubMemoryDB | null = null;
    
    try {
      db = new GitHubMemoryDB(testPath);
      
      db.insertPullRequest({
        id: 1,
        number: 42,
        title: 'Add authentication feature',
        body: 'Implements OAuth2',
        state: 'open',
        author: 'alice',
        repository: 'test/repo',
        url: 'https://github.com/test/repo/pull/42',
        created_at: '2025-11-03T10:00:00Z',
        updated_at: '2025-11-03T10:00:00Z'
      });
      
      db.insertPullRequest({
        id: 2,
        number: 43,
        title: 'Fix bug in payment',
        body: 'Fixes payment processing',
        state: 'closed',
        author: 'bob',
        repository: 'test/repo',
        url: 'https://github.com/test/repo/pull/43',
        created_at: '2025-11-03T11:00:00Z',
        updated_at: '2025-11-03T11:00:00Z'
      });
      
      const results = db.searchPullRequests('authentication');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].number, 42);
      
      const byAuthor = db.searchPullRequests('', 'test/repo', 'bob');
      assert.strictEqual(byAuthor.length, 1);
      assert.strictEqual(byAuthor[0].number, 43);
    } finally {
      if (db) db.close();
      cleanupTestDb(testPath);
    }
  });

  it('should insert and retrieve commits', () => {
    const testPath = TEST_DB_PATH + '-4';
    let db: GitHubMemoryDB | null = null;
    
    try {
      db = new GitHubMemoryDB(testPath);
      
      const commit = {
        id: 'abc123',
        message: 'Fix bug in authentication',
        author: 'testuser',
        repository: 'test/repo',
        url: 'https://github.com/test/repo/commit/abc123',
        timestamp: '2025-11-03T11:00:00Z'
      };
      
      db.insertCommit(commit);
      const retrieved = db.getCommit('abc123');
      
      assert.strictEqual(retrieved?.id, commit.id);
      assert.strictEqual(retrieved?.message, commit.message);
      assert.strictEqual(retrieved?.author, commit.author);
    } finally {
      if (db) db.close();
      cleanupTestDb(testPath);
    }
  });

  it('should search commits by query', () => {
    const testPath = TEST_DB_PATH + '-5';
    let db: GitHubMemoryDB | null = null;
    
    try {
      db = new GitHubMemoryDB(testPath);
      
      db.insertCommit({
        id: 'abc123',
        message: 'Fix authentication bug',
        author: 'alice',
        repository: 'test/repo',
        url: 'https://github.com/test/repo/commit/abc123',
        timestamp: '2025-11-03T11:00:00Z'
      });
      
      db.insertCommit({
        id: 'def456',
        message: 'Update payment processing',
        author: 'bob',
        repository: 'test/repo',
        url: 'https://github.com/test/repo/commit/def456',
        timestamp: '2025-11-03T12:00:00Z'
      });
      
      const results = db.searchCommits('authentication');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, 'abc123');
      
      const byAuthor = db.searchCommits('', 'test/repo', 'bob');
      assert.strictEqual(byAuthor.length, 1);
      assert.strictEqual(byAuthor[0].id, 'def456');
    } finally {
      if (db) db.close();
      cleanupTestDb(testPath);
    }
  });

  it('should handle upsert (insert or replace)', () => {
    const testPath = TEST_DB_PATH + '-6';
    let db: GitHubMemoryDB | null = null;
    
    try {
      db = new GitHubMemoryDB(testPath);
      
      const pr1 = {
        id: 1,
        number: 42,
        title: 'Initial title',
        body: 'Initial body',
        state: 'open',
        author: 'testuser',
        repository: 'test/repo',
        url: 'https://github.com/test/repo/pull/42',
        created_at: '2025-11-03T10:00:00Z',
        updated_at: '2025-11-03T10:00:00Z'
      };
      
      db.insertPullRequest(pr1);
      
      const pr2 = {
        ...pr1,
        title: 'Updated title',
        body: 'Updated body',
        updated_at: '2025-11-03T11:00:00Z'
      };
      
      db.insertPullRequest(pr2);
      
      const retrieved = db.getPullRequest('test/repo', 42);
      assert.strictEqual(retrieved?.title, 'Updated title');
      assert.strictEqual(retrieved?.body, 'Updated body');
    } finally {
      if (db) db.close();
      cleanupTestDb(testPath);
    }
  });
});
