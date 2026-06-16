import { createServer, type Server as HttpServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createTruthReservoirServer,
  defaultBaseUrl,
  handleToolCall,
  searchPropositions,
  toolNames,
  verifyProposition
} from "./server.ts";

const contentTypes: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

async function startLocalPublicServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const publicRoot = resolve(fileURLToPath(new URL("../../public/", import.meta.url)));
  const server: HttpServer = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(url.pathname);
      const filePath = normalize(resolve(publicRoot, `.${pathname}`));

      if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}/`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }

      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        response.writeHead(404).end("Not found");
        return;
      }

      const body = await readFile(filePath);
      response.writeHead(200, {
        "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream"
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise<void>((resolveListen) => {
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not determine local smoke server address");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => (error ? rejectClose(error) : resolveClose()));
      })
  };
}

const localServer =
  process.env.TRUTH_RESERVOIR_SMOKE_LOCAL === "1" ? await startLocalPublicServer() : undefined;
const baseUrl = localServer?.baseUrl ?? process.env.TRUTH_RESERVOIR_BASE_URL ?? defaultBaseUrl;

try {
  createTruthReservoirServer();
  await handleToolCall("list_tags", {}, baseUrl);

  const search = await searchPropositions({ limit: 1 }, baseUrl);
  const [first] = search.data;

  if (!first) {
    throw new Error("Smoke check requires at least one proposition");
  }

  const verification = await verifyProposition({ propositionId: first.propositionId }, baseUrl);

  console.log(
    JSON.stringify(
      {
        tools: toolNames,
        serverInstantiated: true,
        baseUrl,
        verify: {
          propositionId: verification.propositionId,
          overallMatch: verification.overallMatch,
          mismatches: verification.fields
            .filter((field) => !field.match)
            .map((field) => field.path),
          overclaimNotice: verification.overclaimNotice
        }
      },
      null,
      2
    )
  );

  if (!verification.overallMatch) {
    process.exitCode = 1;
  }
} finally {
  await localServer?.close();
}
