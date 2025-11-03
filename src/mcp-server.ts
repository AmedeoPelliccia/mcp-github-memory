import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GitHubMemoryDB } from './database.js';

export class MCPServer {
  private server: Server;
  private db: GitHubMemoryDB;

  constructor(db: GitHubMemoryDB) {
    this.db = db;
    this.server = new Server(
      {
        name: 'mcp-github-memory',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_pull_requests',
          description: 'Search indexed pull requests by query, repository, author, or state',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query to match against PR title and body',
              },
              repository: {
                type: 'string',
                description: 'Filter by repository (e.g., "owner/repo")',
              },
              author: {
                type: 'string',
                description: 'Filter by author username',
              },
              state: {
                type: 'string',
                description: 'Filter by state (open, closed, merged)',
              },
            },
          },
        },
        {
          name: 'get_pull_request',
          description: 'Get details of a specific pull request by repository and number',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "owner/repo")',
              },
              number: {
                type: 'number',
                description: 'Pull request number',
              },
            },
            required: ['repository', 'number'],
          },
        },
        {
          name: 'search_commits',
          description: 'Search indexed commits by message, repository, or author',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query to match against commit messages',
              },
              repository: {
                type: 'string',
                description: 'Filter by repository (e.g., "owner/repo")',
              },
              author: {
                type: 'string',
                description: 'Filter by author username',
              },
            },
          },
        },
        {
          name: 'get_commit',
          description: 'Get details of a specific commit by its SHA',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Commit SHA',
              },
            },
            required: ['id'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_pull_requests': {
            const query = (args?.query as string) || '';
            const repository = args?.repository as string | undefined;
            const author = args?.author as string | undefined;
            const state = args?.state as string | undefined;
            const results = this.db.searchPullRequests(
              query,
              repository,
              author,
              state
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(results, null, 2),
                },
              ],
            };
          }

          case 'get_pull_request': {
            const repository = args?.repository as string;
            const number = args?.number as number;
            const pr = this.db.getPullRequest(repository, number);
            if (!pr) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Pull request not found',
                  },
                ],
                isError: true,
              };
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(pr, null, 2),
                },
              ],
            };
          }

          case 'search_commits': {
            const query = (args?.query as string) || '';
            const repository = args?.repository as string | undefined;
            const author = args?.author as string | undefined;
            const results = this.db.searchCommits(
              query,
              repository,
              author
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(results, null, 2),
                },
              ],
            };
          }

          case 'get_commit': {
            const id = args?.id as string;
            const commit = this.db.getCommit(id);
            if (!commit) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Commit not found',
                  },
                ],
                isError: true,
              };
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(commit, null, 2),
                },
              ],
            };
          }

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: `Unknown tool: ${name}`,
                },
              ],
              isError: true,
            };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('MCP GitHub Memory server running on stdio');
  }
}
