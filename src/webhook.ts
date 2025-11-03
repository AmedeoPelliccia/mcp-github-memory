import express, { Request, Response } from 'express';
import { createHmac } from 'crypto';
import { GitHubMemoryDB } from './database.js';

export interface PullRequestPayload {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  user?: {
    login: string;
  };
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface CommitPayload {
  id: string;
  message: string;
  author?: {
    username?: string;
    name?: string;
  };
  url: string;
  timestamp: string;
}

export interface RepositoryPayload {
  full_name: string;
}

export interface SenderPayload {
  login: string;
  id: number;
}

export interface WebhookEvent {
  action?: string;
  pull_request?: PullRequestPayload;
  commits?: CommitPayload[];
  repository?: RepositoryPayload;
  sender?: SenderPayload;
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
    // Store raw body for signature verification
    if (this.webhookSecret) {
      this.app.use('/webhook', express.json({
        verify: (req: any, res, buf) => {
          req.rawBody = buf.toString('utf8');
        }
      }));
      
      // Verify webhook signature
      this.app.use('/webhook', (req: Request, res: Response, next) => {
        const signature = req.headers['x-hub-signature-256'] as string;
        if (!signature) {
          res.status(401).json({ error: 'No signature provided' });
          return;
        }

        const rawBody = (req as any).rawBody;
        const hmac = createHmac('sha256', this.webhookSecret!);
        const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

        if (signature !== digest) {
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }

        next();
      });
    } else {
      this.app.use(express.json());
    }
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
          await this.handlePullRequestEvent(payload);
          break;
        case 'push':
          await this.handlePushEvent(payload);
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

  private async handlePullRequestEvent(payload: WebhookEvent): Promise<void> {
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

  private async handlePushEvent(payload: WebhookEvent): Promise<void> {
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
