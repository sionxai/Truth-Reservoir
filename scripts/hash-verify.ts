import { loadPropositions, listPropositionFiles } from "../lib/data.ts";
import { verifyPropositionHashes } from "../lib/verify.ts";

const files = await listPropositionFiles();
const propositions = await loadPropositions();
const failures: string[] = [];

for (const [index, proposition] of propositions.entries()) {
  try {
    const mismatches = await verifyPropositionHashes(proposition);

    for (const mismatch of mismatches) {
      failures.push(
        `${files[index]} ${mismatch.path}: expected ${mismatch.expected}, found ${mismatch.actual}`
      );
    }
  } catch (error) {
    failures.push(`${files[index]}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error(`Hash verification failed with ${failures.length} mismatch(es):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Hash verification passed for ${propositions.length} proposition(s): 0 mismatches.`);
