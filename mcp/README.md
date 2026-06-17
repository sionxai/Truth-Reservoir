# Truth Reservoir MCP

Public stdio MCP server for Truth Reservoir Cert v2.1 records.

Truth Reservoir stores facts and verification records, not verdicts. Agent responses should cite the evidence network, provenance, `quoteHash`, locator/archive status, and `reviewLog`; `assessment.factualGrade` is a secondary navigation signal.

It has two lanes:

- RETRIEVE: read verified proposition records and accountability metadata from `GET /api/v2/*` or the retrieve tools below.
- REQUEST: ask for missing fact-data through a public GitHub `fact-request` Issue or the `request_fact` tool. A request is a DEMAND, NOT a fact. It is never stored as a verified proposition (제2). Fulfillment goes through the normal verification pipeline and human sign-off (제11). Unverifiable requests are recorded honestly as declined or undetermined (제7). The request queue is public and append-only via GitHub (제8). Demand is one public, transparent input to selection (제14).

## Install

```sh
cd mcp
npm install
```

The server defaults to the live public API:

```text
https://truth-reservoir.vercel.app
```

Override it with `TRUTH_RESERVOIR_BASE_URL` when pointing at another static deployment.

## MCP Client Config

Use an absolute path to this checkout:

```json
{
  "mcpServers": {
    "truth-reservoir": {
      "command": "npx",
      "args": [
        "tsx",
        "/absolute/path/to/truthreservoir/mcp/src/server.ts"
      ],
      "env": {
        "TRUTH_RESERVOIR_BASE_URL": "https://truth-reservoir.vercel.app"
      }
    }
  }
}
```

After `npm install`, the package also exposes a local bin:

```json
{
  "mcpServers": {
    "truth-reservoir": {
      "command": "node",
      "args": [
        "/absolute/path/to/truthreservoir/mcp/bin/truth-reservoir-mcp.js"
      ],
      "env": {
        "TRUTH_RESERVOIR_BASE_URL": "https://truth-reservoir.vercel.app"
      }
    }
  }
}
```

## Tools

Retrieve lane:

- `search_propositions(query?, claimNature?, factualGrade?, status?, classification?, tag?, limit?)`: fetches `/api/v2/index.json`, text-matches `canonicalProposition`, `originalClaim`, and tags, applies filters, and returns compact summaries with `propositionId`, `canonicalProposition`, `claimNature`, `factualGrade`, `status`, `tags`, and API `path`.
- `get_proposition(propositionId)`: accepts `stmt:...` or `stmt-...`, fetches `/api/v2/propositions/{dash-id}.json`, and returns the full Cert v2.1 JSON.
- `verify_proposition(propositionId)`: fetches the Cert JSON and independently recomputes each `evidence[].quoteHash`, plus `propositionId`, `versionId`, and `certHash`, using the repository derivation helpers. The result reports per-field matches and the required notice that hash checks confirm stored-snapshot integrity, not live source-body identity.
- `list_tags()`: derives tag counts from the live index.
- `list_by_tag(tag)`: returns compact summaries for propositions carrying a tag.
- `get_institutional_metrics()`: fetches `/api/v2/institutional-metrics.json` and explains when correction latency is `null` because it is not yet measured from a real sample.

Request lane:

- `request_fact(topic, why?, claimNatureGuess?, candidateSources?)`: returns a prefilled GitHub Issue creation URL for the `fact-request` template. It requests verification; it does not inject or store a fact.
- `list_open_requests()`: fetches `/api/v2/requests.json` and returns open requests from the public queue.

## Smoke Check

Against the live public API:

```sh
npm run smoke
```

Against the local generated `public/` files over a temporary HTTP server:

```sh
npm run smoke:local
```
