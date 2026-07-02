# Truth Reservoir / 진실저수지

사실데이터를 통해 진실을 추론하는 저수지 — a verified fact repository with a public JSON API.

**Live site: https://truth-reservoir.vercel.app**

판정하지 않는 사실 저장소입니다. 모든 FACTS 기사는 검증된 Cert v2.1 JSON 레코드에서 자동 생성되며(기자·편집자 없음), 모든 인용은 fetch 가능한 원문과 sha256 해시로 재현 가능합니다. 최상위 규범은 [CONSTITUTION.md](CONSTITUTION.md)입니다.

## For humans
- [사건 피드](https://truth-reservoir.vercel.app/) — 검증된 FACTS 기사 (육하원칙·정정이력·출처 인용)
- [원칙](https://truth-reservoir.vercel.app/about) · [API 문서](https://truth-reservoir.vercel.app/api-docs)

## For AI agents
1. Read https://truth-reservoir.vercel.app/llms.txt
2. Fetch https://truth-reservoir.vercel.app/api/v2/search-index.json (compact manifest)
3. Fetch `https://truth-reservoir.vercel.app/api/v2/propositions/{dash-id}.json` (full verified record)

Also: [llms-full.txt](https://truth-reservoir.vercel.app/llms-full.txt) (entire reservoir, one file) · [graph.json](https://truth-reservoir.vercel.app/api/v2/graph.json) (relation graph) · [OpenAPI](https://truth-reservoir.vercel.app/api/v2/openapi.json) · [MCP server](mcp/)

## Principles
- 사실과 해석의 분리 — 평결·프레이밍을 저장하지 않음 (제2조)
- 사건 단위 육하원칙 — "왜"는 당사자 귀속으로만 (제3조의2)
- 재현 가능성 — 모든 인용은 fetch 가능한 원문 + 해시 (제5조)
- 정정 공개 — 침묵 수정 금지, correctionHistory 공개 (제8조)
- 인간 책임 — 모든 민감 명제는 인간 검수 (제11조)
