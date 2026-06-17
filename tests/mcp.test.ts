import { describe, expect, it } from "vitest";
import {
  buildFactRequestIssueUrl,
  createTruthReservoirServer,
  handleToolCall,
  toolNames
} from "../mcp/src/server.ts";

describe("MCP request lane", () => {
  it("exposes request-lane tools and instantiates the server", () => {
    expect(toolNames).toContain("request_fact");
    expect(toolNames).toContain("list_open_requests");
    expect(() => createTruthReservoirServer()).not.toThrow();
  });

  it("builds a prefilled fact-request issue URL", async () => {
    const result = await handleToolCall("request_fact", {
      topic: "A missing public document publication date",
      why: "Needed to compare against existing verified records.",
      claimNatureGuess: "document_content",
      candidateSources: ["https://example.org/source"]
    });

    expect(result).toMatchObject({
      labels: ["fact-request"],
      template: "fact-request.yml",
      guidance: expect.stringContaining("DEMAND")
    });

    const url = new URL((result as { url: string }).url);
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://github.com/sionxai/Truth-Reservoir/issues/new"
    );
    expect(url.searchParams.get("template")).toBe("fact-request.yml");
    expect(url.searchParams.get("labels")).toBe("fact-request");
    expect(url.searchParams.get("title")).toContain("[Fact request]");
    expect(url.searchParams.get("body")).toContain("### Requested fact/topic");
    expect(url.searchParams.get("body")).toContain("document_content");
    expect(url.searchParams.get("body")).toContain("https://example.org/source");
  });

  it("keeps the URL helper deterministic", () => {
    const url = new URL(
      buildFactRequestIssueUrl({
        topic: "Missing measurement method",
        claimNatureGuess: "measurement"
      })
    );

    expect(url.searchParams.get("body")).toContain("Missing measurement method");
    expect(url.searchParams.get("body")).toContain("measurement");
  });
});
