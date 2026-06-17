const defaultSiteUrl = "https://truth-reservoir.vercel.app";
const defaultRepoSlug = "sionxai/Truth-Reservoir";
const defaultRepoUrl = `https://github.com/${defaultRepoSlug}`;

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl).replace(/\/+$/, "");
}

export function absoluteSiteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${getSiteUrl()}${normalizedPath}`;
}

export function getRepoUrl(): string {
  return (process.env.NEXT_PUBLIC_REPO_URL ?? defaultRepoUrl).replace(/\/+$/, "");
}

export function githubRepoSlugFromUrl(repoUrl: string): string | null {
  try {
    const url = new URL(repoUrl);
    const [owner, repo] = url.pathname
      .replace(/^\/+|\/+$/g, "")
      .replace(/\.git$/i, "")
      .split("/");

    if (url.hostname === "github.com" && owner && repo) {
      return `${owner}/${repo}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function getRepoSlug(): string {
  const slug = githubRepoSlugFromUrl(getRepoUrl());

  if (!slug) {
    throw new Error("NEXT_PUBLIC_REPO_URL must be a GitHub repository URL");
  }

  return slug;
}
