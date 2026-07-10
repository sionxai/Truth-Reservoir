interface TopicThumbnailProps {
  tag: string;
  variant?: "large" | "small";
}

interface ThumbnailParts {
  hueA: number;
  hueB: number;
  motif: number;
  initial: string;
  rotation: number;
}

function hashTag(tag: string): number {
  let hash = 2166136261;

  for (const grapheme of Array.from(tag.normalize("NFC"))) {
    hash ^= grapheme.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function thumbnailParts(tag: string): ThumbnailParts {
  const hash = hashTag(tag);

  return {
    hueA: hash % 360,
    hueB: ((hash >>> 8) + 90) % 360,
    motif: hash % 3,
    initial: Array.from(tag.normalize("NFC"))[0] ?? "#",
    rotation: ((hash >>> 16) % 24) - 12
  };
}

export function TopicThumbnail({ tag, variant = "large" }: TopicThumbnailProps) {
  const parts = thumbnailParts(tag);
  const gradientId = `topic-thumb-${hashTag(tag).toString(16)}-${variant}`;
  const motifColor = `hsl(${parts.hueA} 32% 54%)`;
  const textSize = variant === "large" ? 38 : 32;

  return (
    <svg
      aria-label={tag}
      className={`topic-thumb topic-thumb--${variant}`}
      role="img"
      viewBox="0 0 120 90"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={`hsl(${parts.hueA} 42% 90%)`} />
          <stop offset="100%" stopColor={`hsl(${parts.hueB} 38% 84%)`} />
        </linearGradient>
      </defs>
      <rect fill={`url(#${gradientId})`} height="90" rx="8" width="120" />
      {parts.motif === 0 ? (
        <>
          <circle cx="24" cy="24" fill="none" opacity="0.3" r="34" stroke={motifColor} strokeWidth="9" />
          <circle cx="96" cy="66" fill="none" opacity="0.2" r="28" stroke={motifColor} strokeWidth="7" />
        </>
      ) : null}
      {parts.motif === 1 ? (
        <>
          <path
            d="M-8 72 C24 36 42 28 70 42 S104 56 128 18"
            fill="none"
            opacity="0.26"
            stroke={motifColor}
            strokeLinecap="round"
            strokeWidth="12"
          />
          <path
            d="M-4 22 C28 46 54 52 86 38 S112 20 126 30"
            fill="none"
            opacity="0.18"
            stroke={motifColor}
            strokeLinecap="round"
            strokeWidth="8"
          />
        </>
      ) : null}
      {parts.motif === 2 ? (
        <>
          <rect
            fill={motifColor}
            height="82"
            opacity="0.14"
            rx="5"
            transform={`rotate(${parts.rotation} 60 45)`}
            width="22"
            x="18"
            y="4"
          />
          <rect
            fill={motifColor}
            height="82"
            opacity="0.22"
            rx="5"
            transform={`rotate(${parts.rotation} 60 45)`}
            width="22"
            x="50"
            y="4"
          />
          <rect
            fill={motifColor}
            height="82"
            opacity="0.12"
            rx="5"
            transform={`rotate(${parts.rotation} 60 45)`}
            width="22"
            x="82"
            y="4"
          />
        </>
      ) : null}
      <text
        dominantBaseline="middle"
        fill="#333d4b"
        fontFamily="'Pretendard Variable', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize={textSize}
        fontWeight="800"
        opacity="0.96"
        textAnchor="middle"
        x="60"
        y="47"
      >
        {parts.initial}
      </text>
    </svg>
  );
}
