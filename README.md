# 🧠 MCP GitHub Memory

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/spec)

> **Give your AI assistants perfect recall of your GitHub repository history.**  
> Run a local **Model Context Protocol (MCP)** server that indexes your pull requests and commits,  
> making them searchable by **GitHub Copilot**, **Claude**, or any MCP-compatible AI assistant.

**Version:** 0.1.0 (Alpha)  
**Compatible with:** MCP 0.1 Spec · GitHub Copilot Labs (Preview) · Claude Desktop 2024.10+

---

## 🎯 Why This Exists

AI coding assistants are powerful — but forgetful.  
They don’t remember *why* you merged a PR or *how* you solved a bug.

This tool bridges that gap by:

- 📚 **Indexing** closed PRs and commits automatically via GitHub webhooks  
- 🔍 **Exposing** searchable project history through the MCP interface  
- 🚀 **Enabling** AI assistants to reference past decisions and implementations  
- 🛡️ **Maintaining** security with webhook verification and token authentication  

---

## 🏗️ Architecture

```mermaid
graph LR
    A[GitHub] -->|Webhook Events| B[MCP Server]
    B -->|Index| C[(SQLite DB)]
    D[Copilot / Claude] -->|MCP Query| B
    B -->|Context Data| D
````

---

## ⚡ Quick Start

### Prerequisites

* 🐳 Docker & Docker Compose
* 🔐 Admin access to your GitHub repository
* 🌐 A public HTTPS endpoint (or `ngrok` for testing)

---

### 1. Clone and Configure

```bash
git clone https://github.com/AmedeoPelliccia/mcp-github-memory
cd mcp-github-memory

# Copy environment variables template
cp .env.example .env

# Edit .env with your secrets
# - GITHUB_SECRET: your webhook secret
# - MCP_TOKEN:     the bearer token for AI clients
```

---

### 2. Start the Server

```bash
docker-compose up -d
```

Data will be stored in `./data/prs.db` (auto-created on first webhook).

---

### 3. Configure GitHub Webhook

1. Go to **Repo → Settings → Webhooks → Add webhook**
2. **Payload URL:** `https://your-domain.com/webhook`
3. **Content type:** `application/json`
4. **Secret:** your `GITHUB_SECRET`
5. **Events:** select “Pull requests” and “Push”

---

### 4. Register with Your AI Assistant

#### 🧩 GitHub Copilot (Labs / MCP)

1. Open **VS Code → Settings → Extensions → GitHub Copilot Labs**
2. Under **MCP Servers**, click **Add Server**
3. **URL:** `https://your-domain.com/manifest`
4. **Auth Type:** Bearer
5. **Token:** your `MCP_TOKEN`

#### 🤖 Claude Desktop Example

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "github-memory": {
      "url": "https://your-domain.com/manifest",
      "auth": {
        "type": "bearer",
        "token": "your-mcp-token"
      }
    }
  }
}
```

---

## 🔧 Configuration

| Variable        | Description                      | Default                 |
| --------------- | -------------------------------- | ----------------------- |
| `GITHUB_SECRET` | Webhook signature secret (HMAC)  | **Required**            |
| `MCP_TOKEN`     | Bearer token for MCP client auth | **Required**            |
| `DATABASE_URL`  | DB connection string             | `sqlite:///data/prs.db` |
| `PORT`          | Server port                      | `8000`                  |

---

## 📡 API Endpoints

### MCP Endpoints

| Method | Path                 | Description             |
| ------ | -------------------- | ----------------------- |
| `GET`  | `/manifest`          | Returns MCP manifest    |
| `GET`  | `/search_prs?q=term` | Search indexed PRs      |
| `GET`  | `/get_diff?pr=123`   | Get PR diff *(planned)* |

### GitHub Integration

| Method | Path       | Description             |
| ------ | ---------- | ----------------------- |
| `POST` | `/webhook` | GitHub webhook receiver |

---

## 🧪 Local Development

### Test MCP manually

```bash
curl -H "Authorization: Bearer $MCP_TOKEN" http://localhost:8000/manifest
```

### Run with ngrok

```bash
# Terminal 1: start server
docker-compose up

# Terminal 2: expose via ngrok
ngrok http 8000

# Use the ngrok HTTPS URL for GitHub webhook
```

### Direct Python Development

```bash
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 🚀 Production Deployment

### Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  mcp-server:
    image: ghcr.io/amedeopelliccia/mcp-github-memory:latest
    restart: always
    env_file: .env
    volumes:
      - ./data:/app/data
    ports:
      - "8000:8000"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mcp.rule=Host(`mcp.yourdomain.com`)"
      - "traefik.http.routers.mcp.tls.certresolver=letsencrypt"
```

### Kubernetes Deployment

See [`k8s/deployment.yaml`](k8s/deployment.yaml) for manifests.

---

## 📊 How It Works

1. **GitHub** sends webhook when a PR is closed or merged
2. **Server** validates HMAC signature for authenticity
3. **PR metadata** (title, author, description) is stored in SQLite
4. **AI assistant** queries via MCP protocol
5. **Server** returns matching PRs with summaries

---

## 🔒 Security

* ✅ HMAC-SHA256 verification for GitHub webhooks
* ✅ Bearer token authentication for MCP endpoints
* ✅ SQL injection prevention via parameterized queries
* ✅ No secrets in source — all via `.env`
* ⚠️ **Use HTTPS** in production environments

---

## 🎯 Use Cases

### For Developers

* 🔍 “How did we fix the login bug?” → AI finds PR #154
* 📝 “Show similar PRs to this refactor” → AI suggests relevant ones
* 🧠 “What pattern do we use for auth?” → AI recalls past implementations

### For Teams

* 📚 Onboarding: instant project memory for new members
* 🔄 Consistency: reuse proven solutions
* 📈 Insight: trace how architectural decisions evolved

---

## 🗺️ Roadmap

* [x] Basic PR indexing via webhooks
* [x] MCP manifest and search endpoint
* [x] Docker containerization
* [ ] GitHub API integration for diffs
* [ ] Commit message indexing
* [ ] Issue tracking integration
* [ ] Vector search for semantic queries
* [ ] PostgreSQL production backend
* [ ] Admin dashboard
* [ ] Prometheus metrics

---

## 🤝 Contributing

Contributions are welcome!
See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding style, and PR guide.

### Quick Ideas

* Add issue indexing
* Implement semantic search (OpenAI / Sentence Transformers)
* Create admin dashboard
* Add support for GitLab / Bitbucket
* Improve PR summarization

---

## 📝 License

MIT License — see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

* [Model Context Protocol Specification](https://modelcontextprotocol.io/spec) by Anthropic
* [FastAPI](https://fastapi.tiangolo.com/) — web framework
* [GitHub Webhooks](https://docs.github.com/webhooks) docs
* The open-source AI developer community ❤️

---

<p align="center">
Built with ❤️ for the AI-assisted development community  
</p>

<p align="center">
⭐ Star this repo if you find it useful!
</p>
```


  or
* 📄 **Generate the PR body Markdown** referencing this README (for publishing as a GitHub template PR)?
