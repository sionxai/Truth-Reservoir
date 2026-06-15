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

const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Truth Reservoir Cert API",
    version: "2.0.0"
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
    }
  },
  components: {
    schemas: {
      CertV2: certJsonSchema,
      InstitutionalMetrics: metricsJsonSchema,
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
