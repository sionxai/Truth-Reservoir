import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Proposition } from "./types.ts";

const TOPIC_ARTICLES_DIR = path.join(process.cwd(), "data", "topic-articles");
export const TOPIC_SUMMARY_MAX_LENGTH = 500;
export const TOPIC_BODY_MAX_LENGTH = 2200;

// 주제 기사 사이드카 — AI가 쓴 요약(≤500자)과 본문(문단 배열, 합계 ≤2200자).
// cert 원본과 분리된 파생 레이어이며, memberVersionIds가 현행 구성(해당 태그
// 레코드들의 versionId 정렬 목록)과 정확히 일치할 때만 렌더링된다. 주제에
// 새 사실이 추가되거나 기존 기록이 정정되면 기사는 재생성 전까지 내려간다.
export const TopicArticleSchema = z
  .object({
    tag: z.string().min(1),
    memberVersionIds: z.array(z.string().regex(/^ver:[a-f0-9]{16}$/)).min(1),
    summary: z.string().min(1).max(TOPIC_SUMMARY_MAX_LENGTH),
    body: z.array(z.string().min(1)).min(1),
    style: z.literal("topic-article-v1"),
    generatedBy: z.literal("AI(독립된 검토자)"),
    generatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  })
  .superRefine((article, ctx) => {
    const bodyLength = article.body.join("").length;

    if (bodyLength > TOPIC_BODY_MAX_LENGTH) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: `body must be at most ${TOPIC_BODY_MAX_LENGTH} characters in total (got ${bodyLength})`
      });
    }
  });

export type TopicArticle = z.infer<typeof TopicArticleSchema>;

export async function loadTopicArticles(): Promise<Map<string, TopicArticle>> {
  const byTag = new Map<string, TopicArticle>();

  let files: string[];
  try {
    files = await readdir(TOPIC_ARTICLES_DIR);
  } catch {
    return byTag;
  }

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }

    const raw = await readFile(path.join(TOPIC_ARTICLES_DIR, file), "utf8");
    // 형식 위반 사이드카는 조용히 넘기지 않고 빌드를 실패시킨다.
    const article = TopicArticleSchema.parse(JSON.parse(raw));
    byTag.set(article.tag, article);
  }

  return byTag;
}

export function currentMemberVersionIds(tag: string, propositions: Proposition[]): string[] {
  return propositions
    .filter((proposition) => proposition.tags.includes(tag))
    .map((proposition) => proposition.versionId)
    .sort();
}

// 구성 레코드 집합이 조금이라도 달라졌으면 null — 낡은 기사를 침묵 노출하지 않는다.
export function topicArticleFor(
  articles: Map<string, TopicArticle>,
  tag: string,
  propositions: Proposition[]
): TopicArticle | null {
  const article = articles.get(tag);

  if (!article) {
    return null;
  }

  const current = currentMemberVersionIds(tag, propositions);
  const stored = [...article.memberVersionIds].sort();

  if (
    current.length !== stored.length ||
    current.some((versionId, index) => versionId !== stored[index])
  ) {
    return null;
  }

  return article;
}
