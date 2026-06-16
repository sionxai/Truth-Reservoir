# Truth Reservoir MCP

Public stdio MCP server for Truth Reservoir Cert v2.1 records.

Truth Reservoir stores facts and verification records, not verdicts. Agent responses should cite the evidence network, provenance, `quoteHash`, locator/archive status, and `reviewLog`; `assessment.factualGrade` is a secondary navigation signal.

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

- `search_propositions(query?, claimNature?, factualGrade?, status?, classification?, tag?, limit?)`: fetches `/api/v2/index.json`, text-matches `canonicalProposition`, `originalClaim`, and tags, applies filters, and returns compact summaries with `propositionId`, `canonicalProposition`, `claimNature`, `factualGrade`, `status`, `tags`, and API `path`.
- `get_proposition(propositionId)`: accepts `stmt:...` or `stmt-...`, fetches `/api/v2/propositions/{dash-id}.json`, and returns the full Cert v2.1 JSON.
- `verify_proposition(propositionId)`: fetches the Cert JSON and independently recomputes each `evidence[].quoteHash`, plus `propositionId`, `versionId`, and `certHash`, using the repository derivation helpers. The result reports per-field matches and the required notice that hash checks confirm stored-snapshot integrity, not live source-body identity.
- `list_tags()`: derives tag counts from the live index.
- `list_by_tag(tag)`: returns compact summaries for propositions carrying a tag.
- `get_institutional_metrics()`: fetches `/api/v2/institutional-metrics.json` and explains when correction latency is `null` because it is not yet measured from a real sample.

## Smoke Check

Against the live public API:

```sh
npm run smoke
```

Against the local generated `public/` files over a temporary HTTP server:

```sh
npm run smoke:local
```
