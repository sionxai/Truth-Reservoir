# Truth Reservoir / 진실저수지

명제·증거·검수·정정의 provenance 원장과 사람용 리더 — a provenance ledger of propositions, evidence, review, and corrections, with a human-readable reader and a public JSON API.

**Live site: https://truth-reservoir.vercel.app**

판정하지 않는 사실 저장소입니다. 모든 FACTS 기사는 검증된 Cert v2.1 JSON 레코드에서 수기 서술 없이 자동 렌더링되며, 모든 인용은 fetch 가능한 원문과 sha256 해시로 재현 가능합니다. 무엇을 기록할지·출처 선택 같은 검수 판단은 reviewLog·정정이력으로 공개합니다. 최상위 규범은 [CONSTITUTION.md](CONSTITUTION.md), 운영 규범은 [GOVERNANCE.md](GOVERNANCE.md)입니다.

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

## Status

현행 레코드는 구체계 검증본(legacy)이며 위험도 순으로 재인증 예정입니다. 신규 명제 발행은 불변 버전체인·검수자 서명 체계 도입까지 동결 중입니다. 상세와 알려진 한계(아카이브율·선택 편향 등)는 [GOVERNANCE.md](GOVERNANCE.md)에 공개되어 있습니다.

## License

- 코드: [MIT](LICENSE)
- 자체 작성 데이터·문서: [CC BY 4.0](LICENSE-DATA.md) — 출처 표기 시 AI 학습·RAG·재배포 자유
- 제3자 인용문(evidence의 shortQuote): 라이선스 부여 대상 아님 — [LICENSE-DATA.md](LICENSE-DATA.md) 참조
