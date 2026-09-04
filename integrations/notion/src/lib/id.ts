import { createApiServiceError } from 'slates';

let UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let COMPACT_UUID_PATTERN = /^[0-9a-f]{32}$/i;
let UUID_IN_TEXT_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
let COMPACT_UUID_IN_TEXT_PATTERN = /[0-9a-f]{32}/i;

let formatCompactUuid = (value: string) => {
  let normalized = value.toLowerCase();
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20)}`;
};

let extractUuidCandidate = (value: string): string | null => {
  let formattedMatch = value.match(UUID_IN_TEXT_PATTERN)?.[0];
  if (formattedMatch) return formattedMatch.toLowerCase();

  let compactMatch = value.match(COMPACT_UUID_IN_TEXT_PATTERN)?.[0];
  return compactMatch ? formatCompactUuid(compactMatch) : null;
};

export let extractNotionPageId = (value: string): string | null => {
  let trimmed = value.trim();
  if (UUID_PATTERN.test(trimmed)) return trimmed.toLowerCase();
  if (COMPACT_UUID_PATTERN.test(trimmed)) return formatCompactUuid(trimmed);

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  let pathId = extractUuidCandidate(url.pathname);
  if (pathId) return pathId;

  for (let key of ['p', 'page_id']) {
    let queryId = url.searchParams.get(key);
    if (!queryId) continue;

    let extracted = extractUuidCandidate(queryId);
    if (extracted) return extracted;
  }

  return null;
};

export let requireNotionPageId = (value: string): string => {
  let pageId = extractNotionPageId(value);
  if (pageId) return pageId;

  throw createApiServiceError(
    'Invalid Notion page ID or URL. Provide a page UUID, a 32-character page ID, or a Notion page URL. If you only know the page title, use Search with filterType "page" and pass the matching result\'s id.'
  );
};
