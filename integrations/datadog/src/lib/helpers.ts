import { DatadogClient } from './client';
import type { DatadogAuthConfig } from './types';

export let createClient = (
  auth: {
    token: string;
    apiKey?: string;
    appKey?: string;
    site?: string;
    authMethod: 'oauth' | 'apikey';
  },
  config: { site?: string }
): DatadogClient => {
  let authConfig: DatadogAuthConfig = {
    token: auth.token,
    apiKey: auth.apiKey,
    appKey: auth.appKey,
    authMethod: auth.authMethod,
    site: auth.site ?? config.site ?? 'datadoghq.com'
  };
  return new DatadogClient(authConfig);
};

// Tool responses must stay well below the runtime's response payload limit, so large
// result pages are trimmed to this serialized size.
export let MAX_OUTPUT_BYTES = 2_000_000;

export let jsonByteLength = (value: unknown): number => {
  if (value === undefined) return 0;
  try {
    return Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');
  } catch {
    return 0;
  }
};

export let truncateText = (
  value: string | null | undefined,
  maxChars: number
): { value: string | undefined; truncated: boolean } => {
  if (typeof value !== 'string') return { value: undefined, truncated: false };
  if (value.length <= maxChars) return { value, truncated: false };
  return {
    value: `${value.slice(0, maxChars)}... [truncated ${value.length - maxChars} characters]`,
    truncated: true
  };
};

export let takeWithinOutputBudget = <T>(
  items: T[],
  budgetBytes = MAX_OUTPUT_BYTES
): { items: T[]; truncated: boolean } => {
  let kept: T[] = [];
  let used = 0;
  for (let item of items) {
    let size = jsonByteLength(item) + 1;
    if (kept.length > 0 && used + size > budgetBytes) break;
    kept.push(item);
    used += size;
  }
  return { items: kept, truncated: kept.length < items.length };
};
