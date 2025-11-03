import express, { Request, Response } from 'express';
import { GitHubMemoryDB } from './database.js';

export interface WebhookEvent {
  action?: string;
  pull_request?: any;
  commits?: any[];
  repository?: any;
  sender?: any;
}

export class WebhookHandler {
  private app: express.Application;
  private db: GitHubMemoryDB;
  private webhookSecret?: string;

  constructor(db: GitHubMemoryDB, webhookSecret?: string) {
    this.app = express();
    this.db = db;
    this.webhookSecret = webhookSecret;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', message: 'MCP GitHub Memory webhook server is running' });
    });

    // Webhook endpoint
    this.app.post('/webhook', (req: Request, res: Response) => {
      this.handleWebhook(req, res);
    });
  }

  private async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const event = req.headers['x-github-event'] as string;
      const payload: WebhookEvent = req.body;

      console.log(`Received webhook event: ${event}`);

      switch (event) {
        case 'pull_request':
          this.handlePullRequestEvent(payload);
          break;
        case 'push':
          this.handlePushEvent(payload);
          break;
        default:
          console.log(`Ignoring event type: ${event}`);
      }

      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private handlePullRequestEvent(payload: WebhookEvent): void {
    if (!payload.pull_request || !payload.repository) {
      console.log('Missing pull_request or repository data');
      return;
    }

    const pr = payload.pull_request;
    const repo = payload.repository;

    this.db.insertPullRequest({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      author: pr.user?.login || 'unknown',
      repository: repo.full_name,
      url: pr.html_url,
      created_at: pr.created_at,
      updated_at: pr.updated_at
    });

    console.log(`Indexed PR #${pr.number} from ${repo.full_name}`);
  }

  private handlePushEvent(payload: WebhookEvent): void {
    if (!payload.commits || !payload.repository) {
      console.log('Missing commits or repository data');
      return;
    }

    const repo = payload.repository;

    for (const commit of payload.commits) {
      this.db.insertCommit({
        id: commit.id,
        message: commit.message,
        author: commit.author?.username || commit.author?.name || 'unknown',
        repository: repo.full_name,
        url: commit.url,
        timestamp: commit.timestamp
      });

      console.log(`Indexed commit ${commit.id.substring(0, 7)} from ${repo.full_name}`);
    }
  }

  start(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`Webhook server listening on port ${port}`);
      console.log(`Webhook URL: http://localhost:${port}/webhook`);
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}
