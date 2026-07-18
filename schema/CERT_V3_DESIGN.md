# Cert v3 설계 문서 — 초안 v2 (2026-07-10)

> 지위: 설계 문서(구현 전). 헌법 v0.8과 [GOVERNANCE.md](../GOVERNANCE.md)의 2026-07-10 결정을 데이터 계약으로 옮긴다. 구현 전 개정될 수 있으며, 개정은 이 문서 하단 이력에 남긴다.

## 0. 배경 — 왜 v3인가

Cert v2.1의 `assessment.factualGrade`는 "신뢰~신뢰 어려움" 5단계 서열 척도로, 소비자에게 사실상 진실 점수로 기능하여 헌법 제2조·제5조와 긴장을 일으켰다(헌법 v0.8 개정 이력). 또한 v2.1은 검수자를 평문 문자열로만 기록하고, 헌법 적용 버전을 결박하지 않으며, 버전체인이 사실상 미가동이다.

v3가 해결하는 것: **① 절차 이력과 귀속된 증거 관계 분류의 분리(서열 등급 폐지 — 헌법 v0.8 제5조), ② 검수자 서명 책임, ③ 후방 참조 버전체인·헌법 결박.**

기존 v2.1 레코드는 **바이트 단위 불변 보존**한다. 마이그레이션 없음 — 신규 발행과 재인증만 v3.

## 1. `assessment` 폐지 → `verification` + 증거별 `relations`

### 1.1 제거되는 것 (후속 필드 없음)

- `assessment.factualGrade` — 어떤 형태의 서열 척도도 재도입하지 않는다. 이름을 바꾼 재도입("검증 수준 A~E"), 이진 판정으로 읽히는 명제 단위 요약, 지지/반박 집계 숫자(투표수형 점수)도 금지.
- `assessment.gradeRationale` — 명제 단위 산문 평결은 승계하지 않는다. 근거 산문은 증거별 분류의 `rationale`로 이동.

### 1.2 `verification` — 검증 절차 이력

```ts
verification: {
  mode: "human_reviewed" | "automated_unreviewed",
  procedureStatus: "completed" | "incomplete",   // 요구된 절차 기록의 완료 여부만 뜻한다.
                                                  // 명제의 진실성·신뢰성·증거 충분성을 뜻하지 않는다.
  checks: [{ id: string, artifactPointers: string[] }],  // 수행 절차 + 산출물 위치(JSON Pointer/경로)
  procedureRef: { version: string, digest: "sha256:…" }, // 검증 절차 문서의 버전·해시
  pipelineRef:  { version: string, digest: "sha256:…" }
}
```

- `checks[].id`는 `procedureRef`가 가리키는 **버전별 폐쇄형 레지스트리**에 있어야 하며, 레지스트리 밖 ID는 validator가 거부한다. 확장 체크는 namespace를 붙인 `extensionChecks`로 분리하고 core 충족으로 계산하지 않는다.
- validator는 대응 산출물의 존재·형식만 확인한다. 인간 검토가 충실했다고 자동 보증하지 않는다.

### 1.3 `judgmentWithheld` — 판단 유보 (제6조)

```ts
judgmentWithheld?: { items: string[], reason: string }
```

- v2.1 `assessment.status: "undetermined"` + `undeterminedItems`의 승계. 명제 단위 이진 판정(documented/undetermined)이 아니라 **유보 항목의 존재**로 기록한다. 절차가 완료되어도 유보 항목이 있을 수 있다.

### 1.4 `evidence[].relations[]` — 귀속된 증거 관계 분류 (신설)

```ts
evidence[].relations: [{
  target: string,                       // 대상 슬롯 JSON Pointer, 예: "/sixW/what"
  kind: "supports" | "contradicts" | "context" | "unclear",
  rationale: string,                    // 분류 근거
  assignment: {
    mode: "human" | "automated",
    reviewerId?: string,                // human이면 필수 — attestation의 reviewerId와 동일 체계
    procedureRef: { version: string, digest: "sha256:…" }
  }
}]
```

- 한 증거가 여러 슬롯에 서로 다른 관계를 가질 수 있다(what은 지지, when은 반박).
- 이 분류는 **검토자의 판단 기록**이며 객관적 사실이 아니다(헌법 v0.8 제5조). 분류에 강도·확률·가중치를 두지 않는다.
- 명제 단위 집계 숫자(지지 n·반박 n 등)는 cert 본문에도, 공식 파생 레이어에도 두지 않는다. 파생 레이어는 target별 **provenance 그룹 ID 목록**까지만 제공한다(그룹 ID가 다르다는 사실이 독립성을 입증하지 않으므로 "독립 그룹 수" 같은 명명 금지).

## 2. 검수자 서명 — attestation 로그 (결정 ⑤)

현행 certHash의 해시 범위에 그 certHash에 대한 서명을 포함하면 자기참조가 되므로, 서명은 해시 범위 밖 사이드카에 둔다. **서명 대상은 certHash가 아니라 전체 envelope다** — certHash만 서명하면 role·이해충돌·시각을 서명 유지한 채 바꿀 수 있다.

```ts
payload = {
  type: "truthreservoir.cert-review.v1",
  algorithm: "Ed25519",
  propositionId, versionId, certHash,
  reviewerId, keyFingerprint,
  statement: "publication_approved" | "audit_recorded" | "approval_revoked",
  role: "reviewer" | "auditor",
  conflictOfInterest: { declared: boolean, note: string },
  signedAt: ISO8601                      // 서명자의 주장 시각 — 로그의 integratedAt과 구분
}
signature = base64url(Ed25519.Sign(privateKey, UTF8(JCS(payload))))
```

로그 규약:

- attestation은 **content-addressed 불변 파일** 1건 1파일. 수정·삭제 금지, 취소는 새 `approval_revoked` 항목 추가로만.
- 각 항목에 `sequence`·`previousEntryHash`(해시 체인)·`integratedAt` 부여. 주기적으로 `treeSize`·`headHash`를 담은 **서명된 checkpoint**를 발행하고, checkpoint는 외부 보관처(GitHub Release 등)에 고정한다.
- 보장 수준은 "불변"이 아니라 **"알려진 checkpoint에 대해 변조 탐지 가능"**이다. 외부에 checkpoint가 보존되지 않으면 말단 절단은 탐지할 수 없다 — 이 한계를 문서화한다.
- 이해충돌 `declared: true`인 검수자 단독 `publication_approved` 불가([기본방침 §4.4](../POLICY.md)) — validator 규칙.
- 경로(정적 export, content-addressed):

```text
data/attestations/{propositionId}/{certHashHex}/{attestationId}.json
public/api/v3/attestations/{propositionId}/{certHashHex}/{attestationId}.json
public/api/v3/attestations/checkpoint.json
```

## 3. 버전체인 — 후방 참조만, 전방 링크는 파생 인덱스로

**해시 대상 본문에는 미래 버전 식별자를 넣지 않는다** (전방 참조는 자기참조·상호참조 순환을 만들어 구현 불가능하다). v2.1 `correctionHistory[].newVersionId`·`scoreChange` 구조는 승계하지 않는다.

```ts
previousVersion: null | {                // 필수 필드. 첫 버전만 null
  propositionId: string,
  versionId: string,
  certHash: "sha256:…",
  certVersion: string                    // "2.1" 참조 가능 (v2.1→v3 재인증)
},
changeFromPrevious?: {                   // previousVersion 있으면 필수
  type: "correction" | "recertification" | "retraction",
  reason: string,
  changedPointers: string[],
  evidenceRefs: string[]
},
constitutionRef: {
  version: string,                       // 예: "0.8"
  digest: "sha256:…",                    // 헌법 전문의 UTF-8/LF 바이트 해시
  appliedAt: ISO8601
}
```

- **successor·현재 head·superseded 상태·누적 정정 이력은 버전체인을 역참조해 생성한 서명된 파생 인덱스로 제공한다.** cert 본문을 나중에 다시 만지지 않는다.
- 버전 스냅샷 경로: `data/versions/{propositionId}/{versionId}.json`, 공개 불변 URL `/api/v3/versions/…`.
- **propositionId는 genesis 버전에서만 파생하고 후속 버전은 상속한다.** (현행처럼 canonical 문장에서 매번 파생하면 문구 정정 시 ID가 바뀌어 체인이 끊긴다.)
- **v2.1→v3 재인증은 v2.1 원본의 바이트·status·correctionHistory를 일절 변경하지 않는다.** 원본을 불변 버전 경로에 고정한 뒤, 새 v3가 `previousVersion`으로 v2.1의 versionId·certHash를 참조한다. 전방 링크·superseded 표시는 파생 인덱스가 담당한다.
- 정규화 규격: v3는 현행 `localeCompare` 정렬 canonicalize를 승계하지 않고 **UTF-8 + RFC 8785(JCS) + SHA-256**으로 고정하며, 공개 test vector를 둔다. 검증 순서는 본문에서 versionId·certHash를 재계산한 뒤 서명을 확인한다.

## 4. 유지되는 것 (v2.1 → v3 무변경 승계)

`canonicalProposition`, `claimNature` 3범주, `sixW`(why 귀속 강제), `measurement`, `evidence`의 독립성·아카이브·provenance 필드군, `sensitive`, `limitations`, `tags`. (`versionId`·`certHash` 파생 대상 규칙은 유지하되 §3의 정규화 규격 교체를 적용.)

## 5. conformance 보고서 (파생 레이어 — 표현은 Phase 5)

`/api/v3/conformance/{certHashHex}.json`: 규칙 ID·헌법 버전·입력 certHash·`pass | fail | notApplicable | requiresHuman`·JSON Pointer·validator 버전·`rulesetDigest`·validator artifact digest.

- 이 보고서는 **데이터 계약의 구조·절차 준수만** 기록하며 명제 내용의 참·거짓·신뢰성·증거 충분성을 판정하지 않는다.
- 규칙은 버전·digest로 고정된 폐쇄형 structural/procedural 레지스트리에서만 가져온다. **증거 수·지지 우세·출처 신뢰성의 임계값을 pass/fail 규칙으로 만들지 않는다.**
- 보고서에 overallStatus·통과/실패 개수·비율·coverage·"최고 통과 단계" 없음. 공식 UI·API·검색·추천에서 결과를 합산·임계값화·우열 신호화하지 않는다. `requiresHuman`은 자동 판정 불가 표지이며 pass/fail로 변환하지 않는다.
- 기계 자동 판정 가능 항목: 해시 재계산, 필수 필드, why.statedBy, relations의 reviewerId-attestation 대조, 버전체인 실존(경로·해시 일치), 헌법 digest 일치.

## 6. 하지 않는 것

- v2.1 레코드의 소급 수정·재해시 (바이트 불변)
- 서열 등급·이진 판정·집계 점수의 어떤 형태의 재도입 (§1.1)
- cert 본문 내 전방 버전 참조 (§3)
- 서명의 cert 본문 내장, certHash 단독 서명 (§2)
- conformance 결과의 합산·색상 배지·정렬 사용 (§5)

## 7. 전환 표시 (헌법 부칙 경과규정 연동)

- v2.1 factualGrade의 UI 사용(색상 배지·검색 가중·정렬)은 **헌법 v0.8 효력 배포와 같은 배포에서** 서열 신호 제거를 시작한다: 목록·검색·태그·엔티티에서 제거하고, 상세 페이지의 감사 영역에서만 무색으로 보존 — "구체계 기록(Cert v2.1·헌법 v0.7 기준): factualGrade=<원시값>. 현행 검증 기록 형식이 아니며 Cert v3로 승계되지 않음."
- 이 표시 작업은 Phase 5(표현 레이어)가 아니라 **헌법 v0.8 배포에 동반**해야 자기 위반이 없다.

## 8. 미결 질문 (구현 전 확정 필요)

1. 키 수명주기: 유효기간, 폐기·유출 공표, 구키·신키 교차서명 회전, registry(`data/reviewers.json`) 자체의 서명·checkpoint. (Ed25519 채택은 확정.)
2. checkpoint 외부 고정처 선정 (GitHub Release / 별도 미러).
3. API 네임스페이스: v3 산출물을 `/api/v3/`로 분리(현 설계 가정) vs `/api/v2/` 유지 + "API 버전 ≠ Cert 버전" 계약 명시.
4. 파생 successor 인덱스의 서명 주체·갱신 주기.

---

_개정 이력: v1 (2026-07-10) — 최초 작성. v2 (2026-07-10) — Codex 교차 검수 반영: 증거 관계를 "귀속된 판단 기록"으로 재정의(제2조 재충돌 해소), evidenceFindings 집계 숫자·gradeRationale 승계 삭제, 명제 단위 이진 outcome을 judgmentWithheld로 대체, 증거별 다중 target relations 도입, 전방 버전 참조 폐지(해시 순환)→후방 체인+파생 인덱스, propositionId genesis 상속, 서명 대상을 envelope로 확대+해시체인·checkpoint, JCS 정규화 고정, conformance 점수 우회 금지 강화, 경로 certHash 주소화, 전환 표시를 헌법 배포에 동반._
