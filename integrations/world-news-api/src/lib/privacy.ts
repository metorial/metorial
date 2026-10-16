import { createApiServiceError } from 'slates';

let decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value.replace(/%([0-9a-f]{2})/gi, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    );
  }
};

let variants = function* (value: string) {
  let current = value;
  // Each percent-decoding change shortens the string, so the original input
  // length bounds the complete traversal without classifying an arbitrary cutoff.
  while (true) {
    yield current;
    let next = decode(current);
    if (next === current) return;
    if (next.length >= current.length) {
      throw createApiServiceError('Unable to safely inspect the provider response encoding.');
    }
    current = next;
  }
};

let credentialName = (name: string) =>
  /^(?:x[-_]?api[-_]?key|api[-_]?key|authorization|access[-_]?token|client[-_]?secret|password)$/i.test(
    name
  );

export let containsCredential = (value: string, secret: string): boolean => {
  let secrets = [...variants(secret)].filter(Boolean);
  for (let candidate of variants(value)) {
    // URL parsing ignores these characters even when embedded in a path or host.
    let normalizedText = candidate.replace(/[\t\n\r]/g, '');
    if (secrets.some(key => candidate.includes(key) || normalizedText.includes(key))) {
      return true;
    }
    let urls = [candidate, ...(normalizedText.match(/https?:\/\/[^\s<>"'`]+/gi) ?? [])];
    for (let target of urls) {
      try {
        let url = new URL(target);
        let normalized = [url.href, url.hostname, url.username, url.password];
        if (
          normalized.some(part => secrets.some(key => part.includes(key))) ||
          secrets.some(key => url.hostname.includes(key.toLowerCase()))
        ) {
          return true;
        }
        if (url.username || url.password) return true;
        for (let [key] of url.searchParams) {
          if ([...variants(key)].some(credentialName)) return true;
        }
      } catch {
        // Free-text fields and error messages are not necessarily URLs.
      }
    }
    if (
      /[?&#](?:x[-_]?api[-_]?key|api[-_]?key|authorization|access[-_]?token|client[-_]?secret|password)\s*[:=]/i.test(
        candidate
      )
    ) {
      return true;
    }
  }
  return false;
};

export let redactPublicData = (value: unknown, secret: string): unknown => {
  if (typeof value === 'string') {
    if (!containsCredential(value, secret)) return value;
    // Preserve actionable prose while removing the unsafe URL or encoded token.
    // Keep URL-ignored whitespace inside each fragment so it is inspected together.
    let redacted = value.replace(/[^ <>"'`]+/g, fragment =>
      containsCredential(fragment, secret) ? '[redacted]' : fragment
    );
    return containsCredential(redacted, secret) ? '[redacted]' : redacted;
  }
  if (Array.isArray(value)) return value.map(item => redactPublicData(item, secret));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        containsCredential(key, secret) ? '[redacted]' : key,
        [...variants(key)].some(credentialName) ? '[redacted]' : redactPublicData(item, secret)
      ])
    );
  }
  return value;
};

export let assertPublicData = (value: unknown, secret: string): void => {
  if (typeof value === 'string' && containsCredential(value, secret)) {
    throw createApiServiceError(
      'World News API returned credential-bearing data that cannot be safely displayed.',
      { reason: 'unsafe_provider_response' }
    );
  }
  if (Array.isArray(value)) {
    for (let item of value) assertPublicData(item, secret);
  } else if (value && typeof value === 'object') {
    for (let [key, item] of Object.entries(value)) {
      if ([...variants(key)].some(credentialName)) continue;
      assertPublicData(key, secret);
      assertPublicData(item, secret);
    }
  }
};

export let validateWebsiteUrl = (value: string, secret: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Provide a valid HTTP or HTTPS website URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || containsCredential(value, secret)) {
    throw createApiServiceError(
      'Provide an HTTP or HTTPS website URL without credentials or API keys.'
    );
  }
  return value;
};
