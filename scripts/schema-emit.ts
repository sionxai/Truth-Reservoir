import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import {
  CertV2Schema,
  InstitutionalMetricsSchema
} from "../schema/cert-v2.ts";

const apiDir = "public/api/v2";
const schemaDir = `${apiDir}/schema`;

function withSchemaMetadata(schema: Record<string, unknown>, id: string): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: id,
    ...schema
  };
}

// zod-to-json-schema is installed per the stack contract, but its latest 3.x
// release only supports v3-shaped schemas when Zod v4 is the peer dependency.
// Zod v4's native emitter preserves the v4 schema as the source of truth.
const certJsonSchema = withSchemaMetadata(
  z.toJSONSchema(CertV2Schema) as Record<string, unknown>,
  "https://truthreservoir.example/api/v2/schema/cert-v2.schema.json"
);

const metricsJsonSchema = withSchemaMetadata(
  z.toJSONSchema(InstitutionalMetricsSchema) as Record<string, unknown>,
  "https://truthreservoir.example/api/v2/schema/institutional-metrics.schema.json"
);
const requestLaneDescription =
  "Each request is a DEMAND, NOT a fact; requests are public, append-only demands via GitHub, not stored facts (제2, 제8). Fulfillment requires normal verification and human sign-off (제11). Unverifiable requests are recorded honestly as declined or undetermined (제7). Demand is one public, transparent input to selection (제14).";

const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Truth Reservoir Cert API",
    version: "2.1.0"
  },
  paths: {
    "/api/v2/index.json": {
      get: {
        summary: "List published Cert v2 propositions",
        responses: {
          "200": {
            description: "Static proposition index: { data: CertV2[], meta }",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data", "meta"],
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/CertV2" }
                    },
                    meta: {
                      type: "object",
                      required: ["total", "dataVersion"],
                      properties: {
                        total: { type: "integer" },
                        dataVersion: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v2/search-index.json": {
      get: {
        summary: "Compact proposition manifest for client-side filtering",
        description:
          "Small static manifest for AI agents and other clients that need to find records before fetching full Cert v2 JSON documents.",
        responses: {
          "200": {
            description:
              "Compact manifest: { meta, records }. Fetch full records at /api/v2/propositions/{dashId}.json.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SearchIndex"
                }
              }
            }
          }
        }
      }
    },
    "/api/v2/propositions/{propositionId}.json": {
      get: {
        summary: "Fetch one Cert v2 proposition document",
        parameters: [
          {
            name: "propositionId",
            in: "path",
            required: true,
            description: "propositionId with ':' encoded as '-' (e.g. stmt-840aa7c3...).",
            schema: {
              type: "string",
              pattern: "^stmt-[a-f0-9]{24}$"
            }
          }
        ],
        responses: {
          "200": {
            description: "Cert v2 proposition",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CertV2"
                }
              }
            }
          },
          "404": {
            description: "Unknown proposition",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" }
              }
            }
          }
        }
      }
    },
    "/api/v2/graph.json": {
      get: {
        summary: "Fetch the deterministic proposition relation graph",
        description:
          "Derived from tag intersections at build time. Relations are not stored in Cert originals.",
        responses: {
          "200": {
            description: "Static derived relation graph",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RelationGraph"
                }
              }
            }
          }
        }
      }
    },
    "/api/v2/requests.json": {
      get: {
        summary: "List public fact-data requests",
        description: requestLaneDescription,
        responses: {
          "200": {
            description: "Static request queue mirror",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RequestsMirror"
                }
              }
            }
          }
        }
      }
    },
    "/api/v2/schema/cert-v2.schema.json": {
      get: {
        summary: "JSON Schema (2020-12) for a Cert v2 proposition",
        responses: { "200": { description: "JSON Schema document" } }
      }
    },
    "/api/v2/openapi.json": {
      get: {
        summary: "This OpenAPI 3.1 document",
        responses: { "200": { description: "OpenAPI document" } }
      }
    },
    "/llms-full.txt": {
      get: {
        summary: "Plain-text full reservoir for AI ingestion",
        description:
          "A build-time generated text file containing condensed orientation plus every proposition record in a compact readable block.",
        responses: {
          "200": {
            description: "Plain-text full reservoir export",
            content: {
              "text/plain": {
                schema: { type: "string" }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      CertV2: certJsonSchema,
      InstitutionalMetrics: metricsJsonSchema,
      SearchIndex: {
        type: "object",
        required: ["meta", "records"],
        properties: {
          meta: {
            type: "object",
            required: ["generatedAt", "total", "note"],
            properties: {
              generatedAt: { type: "string" },
              total: { type: "integer", minimum: 0 },
              note: { type: "string" }
            }
          },
          records: {
            type: "array",
            items: {
              type: "object",
              required: [
                "propositionId",
                "path",
                "canonical",
                "tags",
                "claimNature",
                "factualGrade",
                "status",
                "asOfDate",
                "updatedAt"
              ],
              properties: {
                propositionId: { type: "string", pattern: "^stmt:[a-f0-9]{24}$" },
                path: { type: "string" },
                canonical: { type: "string" },
                tags: {
                  type: "array",
                  items: { type: "string" }
                },
                claimNature: {
                  type: "string",
                  enum: ["event_occurrence", "document_content", "measurement"]
                },
                factualGrade: {
                  anyOf: [
                    {
                      type: "string",
                      enum: [
                        "fully_reliable",
                        "largely_reliable",
                        "mixed",
                        "largely_unreliable",
                        "not_reliable"
                      ]
                    },
                    { type: "null" }
                  ]
                },
                status: {
                  type: "string",
                  enum: ["active", "superseded", "retracted", "needs_review"]
                },
                asOfDate: { type: "string" },
                updatedAt: { type: "string" }
              }
            }
          }
        }
      },
      RequestsMirror: {
        type: "object",
        required: ["meta", "requests"],
        properties: {
          meta: {
            type: "object",
            required: ["generatedAt", "repo", "total", "note"],
            properties: {
              generatedAt: { type: "string", format: "date-time" },
              repo: { type: "string" },
              total: { type: "integer", minimum: 0 },
              note: { type: "string" }
            }
          },
          requests: {
            type: "array",
            items: {
              type: "object",
              required: [
                "id",
                "title",
                "topic",
                "why",
                "claimNatureGuess",
                "candidateSources",
                "state",
                "fulfilledPropositionId",
                "url",
                "createdAt",
                "updatedAt"
              ],
              properties: {
                id: { type: "integer" },
                title: { type: "string" },
                topic: { type: "string" },
                why: { type: "string" },
                claimNatureGuess: {
                  type: "string",
                  enum: ["event_occurrence", "document_content", "measurement", "unknown"]
                },
                candidateSources: {
                  type: "array",
                  items: { type: "string" }
                },
                state: { type: "string", enum: ["open", "closed"] },
                fulfilledPropositionId: {
                  anyOf: [{ type: "string" }, { type: "null" }]
                },
                url: { type: "string", format: "uri" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" }
              }
            }
          }
        }
      },
      RelationGraph: {
        type: "object",
        required: ["meta", "nodes", "edges"],
        properties: {
          meta: {
            type: "object",
            required: ["generatedAt", "total", "note"],
            properties: {
              generatedAt: { type: "string" },
              total: { type: "integer", minimum: 0 },
              note: { type: "string" }
            }
          },
          nodes: {
            type: "array",
            items: {
              type: "object",
              required: ["propositionId", "path", "tags"],
              properties: {
                propositionId: { type: "string", pattern: "^stmt:[a-f0-9]{24}$" },
                path: { type: "string" },
                tags: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              required: ["from", "to", "sharedTags"],
              properties: {
                from: { type: "string", pattern: "^stmt:[a-f0-9]{24}$" },
                to: { type: "string", pattern: "^stmt:[a-f0-9]{24}$" },
                sharedTags: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string" }
                }
              }
            }
          }
        }
      },
      ApiError: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", enum: ["NOT_FOUND", "VALIDATION_ERROR", "INTERNAL_ERROR"] },
              message: { type: "string" },
              fields: { type: "object" }
            }
          }
        }
      }
    }
  }
};

await mkdir(schemaDir, { recursive: true });
await writeFile(`${schemaDir}/cert-v2.schema.json`, `${JSON.stringify(certJsonSchema, null, 2)}\n`);
await writeFile(
  `${schemaDir}/institutional-metrics.schema.json`,
  `${JSON.stringify(metricsJsonSchema, null, 2)}\n`
);
// PRD §7 contract path is /api/v2/openapi.json (api root), not under /schema.
await writeFile(`${apiDir}/openapi.json`, `${JSON.stringify(openapi, null, 2)}\n`);

console.log(
  `Wrote ${schemaDir}/cert-v2.schema.json, ${schemaDir}/institutional-metrics.schema.json, and ${apiDir}/openapi.json`
);
