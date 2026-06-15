"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  assessmentStatusLabels,
  claimNatureLabels,
  classificationLabels,
  gradeLabels,
  gradeOptions
} from "../../lib/display.ts";
import { encodePropositionId } from "../../lib/ids.ts";
import { searchPropositions, type PropositionSearchQuery } from "../../lib/search.ts";
import type { Assessment, ClaimNature, Classification, Grade, Proposition } from "../../lib/types.ts";
import { GradeBadge } from "./GradeBadge";

type FilterValue<T extends string> = T | "all";

interface SearchExplorerProps {
  propositions: Proposition[];
}

type SearchState =
  | { status: "loading"; results: Proposition[]; message?: string }
  | { status: "success"; results: Proposition[]; message?: string }
  | { status: "empty"; results: Proposition[]; message?: string }
  | { status: "error"; results: Proposition[]; message: string };

export function SearchExplorer({ propositions }: SearchExplorerProps) {
  const [text, setText] = useState("");
  const [classification, setClassification] = useState<FilterValue<Classification>>("all");
  const [factualGrade, setFactualGrade] = useState<FilterValue<Grade>>("all");
  const [truthfulGrade, setTruthfulGrade] = useState<FilterValue<Grade>>("all");
  const [assessmentStatus, setAssessmentStatus] =
    useState<FilterValue<Assessment["status"]>>("all");
  const [claimNature, setClaimNature] = useState<FilterValue<ClaimNature>>("all");
  const [retryToken, setRetryToken] = useState(0);
  const [state, setState] = useState<SearchState>({ status: "loading", results: [] });
  const queryTooLong = text.length > 100;

  const filters = useMemo<PropositionSearchQuery>(
    () => ({
      text,
      classification: classification === "all" ? undefined : classification,
      factualGrade: factualGrade === "all" ? undefined : factualGrade,
      truthfulGrade: truthfulGrade === "all" ? undefined : truthfulGrade,
      assessmentStatus: assessmentStatus === "all" ? undefined : assessmentStatus,
      claimNature: claimNature === "all" ? undefined : claimNature
    }),
    [assessmentStatus, claimNature, classification, factualGrade, text, truthfulGrade]
  );

  useEffect(() => {
    if (queryTooLong) {
      setState({ status: "error", results: [], message: "검색어는 100자 이내" });
      return;
    }

    setState((previous) => ({ status: "loading", results: previous.results }));

    const timer = window.setTimeout(() => {
      try {
        const results = searchPropositions(propositions, filters);
        setState({
          status: results.length ? "success" : "empty",
          results
        });
      } catch (error) {
        setState({
          status: "error",
          results: [],
          message: error instanceof Error ? error.message : "검색 처리 중 오류가 발생했습니다."
        });
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [filters, propositions, queryTooLong, retryToken]);

  return (
    <section className="search-panel" aria-labelledby="search-title">
      <div className="section-heading">
        <p className="eyebrow">검증 가능 데이터</p>
        <h2 id="search-title">증거 스냅샷 탐색</h2>
      </div>

      <div className="search-controls">
        <label className="field field--wide">
          <span>검색어</span>
          <input
            aria-describedby={queryTooLong ? "search-error" : undefined}
            aria-invalid={queryTooLong}
            placeholder="명제, 출처 제목, 태그 검색"
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          {queryTooLong ? (
            <span className="field-error" id="search-error">
              검색어는 100자 이내
            </span>
          ) : null}
        </label>

        <SelectField
          label="분류"
          value={classification}
          onChange={(value) => setClassification(value as FilterValue<Classification>)}
          options={[
            ["all", "전체"],
            ...Object.entries(classificationLabels)
          ]}
        />
        <SelectField
          label="기초 사실성"
          value={factualGrade}
          onChange={(value) => setFactualGrade(value as FilterValue<Grade>)}
          options={[
            ["all", "전체"],
            ...gradeOptions.map((grade) => [grade, gradeLabels[grade]] as const)
          ]}
        />
        <SelectField
          label="진술 충실성"
          value={truthfulGrade}
          onChange={(value) => setTruthfulGrade(value as FilterValue<Grade>)}
          options={[
            ["all", "전체"],
            ...gradeOptions.map((grade) => [grade, gradeLabels[grade]] as const)
          ]}
        />
        <SelectField
          label="판정 상태"
          value={assessmentStatus}
          onChange={(value) => setAssessmentStatus(value as FilterValue<Assessment["status"]>)}
          options={[
            ["all", "전체"],
            ...Object.entries(assessmentStatusLabels)
          ]}
        />
        <SelectField
          label="클레임 성격"
          value={claimNature}
          onChange={(value) => setClaimNature(value as FilterValue<ClaimNature>)}
          options={[
            ["all", "전체"],
            ...Object.entries(claimNatureLabels)
          ]}
        />
      </div>

      {state.status === "loading" ? <LoadingSkeleton /> : null}

      {state.status === "error" ? (
        <div className="state-panel state-panel--error" role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={() => setRetryToken((value) => value + 1)}>
            다시 시도
          </button>
        </div>
      ) : null}

      {state.status === "empty" ? (
        <div className="state-panel">
          <p>일치하는 검증 명제가 없습니다.</p>
        </div>
      ) : null}

      {state.status === "success" ? <PropositionList propositions={state.results} /> : null}
    </section>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function PropositionList({ propositions }: { propositions: Proposition[] }) {
  return (
    <div className="proposition-grid">
      {propositions.map((proposition) => {
        const dashId = encodePropositionId(proposition.propositionId);

        return (
          <article className="proposition-card" key={proposition.propositionId}>
            <div className="card-meta">
              <span>{classificationLabels[proposition.classification]}</span>
              <span>{claimNatureLabels[proposition.claimNature]}</span>
              <span>{assessmentStatusLabels[proposition.assessment.status]}</span>
            </div>
            <h3>
              <Link href={`/p/${dashId}`}>{proposition.canonicalProposition}</Link>
            </h3>
            <div className="compact-grades" aria-label="두 축 신뢰 라벨">
              <GradeBadge prefix="기초 사실성" grade={proposition.assessment.factualGrade} />
              <GradeBadge prefix="진술 충실성" grade={proposition.assessment.truthfulGrade} />
            </div>
            <p className="card-footnote">현 시점 기준 {proposition.asOfDate}</p>
          </article>
        );
      })}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="proposition-grid" aria-label="검색 결과 로딩 중">
      {[0, 1, 2].map((item) => (
        <div className="skeleton-card" key={item}>
          <span />
          <strong />
          <em />
        </div>
      ))}
    </div>
  );
}
