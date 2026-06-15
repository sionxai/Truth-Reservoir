const statementPrefix = "stmt";

export function encodePropositionId(propositionId: string): string {
  return propositionId.startsWith(`${statementPrefix}:`)
    ? propositionId.replace(`${statementPrefix}:`, `${statementPrefix}-`)
    : propositionId.replace(":", "-");
}

export function decodePropositionId(dashId: string): string {
  return dashId.startsWith(`${statementPrefix}-`)
    ? dashId.replace(`${statementPrefix}-`, `${statementPrefix}:`)
    : dashId;
}

