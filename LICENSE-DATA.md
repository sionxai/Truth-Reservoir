# 데이터·콘텐츠 라이선스 (Data & Content License)

이 저장소의 산출물은 종류별로 라이선스가 다릅니다. 아래 권리 매트릭스가 기준이며, 이 문서와 개별 파일 표기가 충돌하면 개별 파일 표기가 우선합니다.

## 권리 매트릭스

| 대상 | 범위 | 라이선스 |
|---|---|---|
| **코드** | `app/`, `lib/`, `scripts/`, `schema/`, `mcp/`, `tests/` 등 소프트웨어 전부 | [MIT](LICENSE) |
| **자체 작성 데이터** | `data/propositions/*.json` 중 진실저수지가 작성한 부분 — canonicalProposition, sixW 기술, limitations, gradeRationale, reviewLog, correctionHistory 등 — 및 여기서 파생된 공개 산출물(`public/api/v2/`의 JSON, `llms.txt`, `llms-full.txt`, FACTS 기사 텍스트) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ko) |
| **문서** | `CONSTITUTION.md`, `GOVERNANCE.md`, `README.md`, `RISK_TIERS.md` 등 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ko) |
| **제3자 인용문** | 각 레코드 `evidence[].shortQuote` 및 인용으로 표기된 모든 원문 발췌 | **CC BY 부여 대상이 아님** — 아래 참조 |

## 제3자 인용문에 대하여

증거 항목의 짧은 인용문(shortQuote)은 검증 재현을 위해 대한민국 저작권법 제28조(공표된 저작물의 인용) 등 인용 법리에 근거하여 출처를 명시하고 수록한 것입니다. 해당 인용문의 저작권은 각 원 출처 권리자에게 있으며, 진실저수지는 이에 대해 어떠한 라이선스도 부여하지 않습니다. 데이터를 재사용하는 경우 인용문 부분은 재사용자가 각자의 법적 근거(인용, 공정 이용 등)를 확인해야 합니다.

## 귀속(Attribution) 방법

CC BY 4.0 대상물을 재사용할 때는 다음과 같이 표기해 주세요.

> 출처: Truth Reservoir (진실저수지), https://truth-reservoir.vercel.app — CC BY 4.0

개별 명제를 인용할 때는 가능하면 `propositionId`와 `versionId`(또는 `certHash`)를 함께 표기해 주세요. 레코드는 버전 단위로 불변이므로, 버전 식별자를 남기면 인용 시점의 내용이 고정됩니다.

## AI·RAG 이용

AI 시스템의 학습·검색증강(RAG)·인용 목적 이용을 환영합니다. 조건은 위와 동일합니다: CC BY 대상물은 출처 표기, 제3자 인용문은 자체 판단. 기계용 진입점은 [llms.txt](https://truth-reservoir.vercel.app/llms.txt)를 참조하세요.
