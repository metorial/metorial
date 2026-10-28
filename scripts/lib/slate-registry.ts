// Imported by CI jobs that install nothing: use only node:* and bun built-ins here and in callers.

export type RegistryTarget = {
  url: string;
  token: string;
};

export type VersionLookupStatus =
  | 'published'
  | 'not_published'
  | 'scope_not_found'
  | 'scope_forbidden'
  | 'slate_deleted';

export type VersionLookupResult = {
  identifier: string;
  version: string;
  status: VersionLookupStatus;
  checksum: string | null;
};

const LOOKUP_BATCH_SIZE = 500;
const RETRY_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 2_000;
const LOOPBACK_HOSTNAME = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;

export function classifyLookup(
  status: VersionLookupStatus
):
  | { kind: 'published' }
  | { kind: 'missing' }
  | { kind: 'skip'; reason: string }
  | { kind: 'blocked'; reason: string } {
  switch (status) {
    case 'published':
      return { kind: 'published' };
    case 'not_published':
      return { kind: 'missing' };
    case 'slate_deleted':
      return { kind: 'skip', reason: 'the slate was deleted in this registry' };
    case 'scope_not_found':
      return {
        kind: 'blocked',
        reason:
          'its scope does not exist in this registry; create it through the registry admin API first'
      };
    case 'scope_forbidden':
      return { kind: 'blocked', reason: 'its scope belongs to another tenant' };
    default:
      return { kind: 'blocked', reason: `unexpected lookup status "${status}"` };
  }
}

export function getRegistryTarget(
  env: Record<string, string | undefined> = process.env
): RegistryTarget {
  const url = env.SLATES_REGISTRY_URL;
  const token = env.SLATES_REGISTRY_TOKEN;
  if (!url || !token) {
    throw new Error('SLATES_REGISTRY_URL and SLATES_REGISTRY_TOKEN must be set.');
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`SLATES_REGISTRY_URL is not a valid URL: ${url}`);
  }
  if (
    !(
      parsed.protocol === 'https:' ||
      (parsed.protocol === 'http:' && LOOPBACK_HOSTNAME.test(parsed.hostname))
    )
  ) {
    throw new Error('SLATES_REGISTRY_URL must be https (http only for localhost).');
  }

  return { url: url.replace(/\/+$/, ''), token };
}

export async function lookupVersions(
  target: RegistryTarget,
  items: { identifier: string; version: string }[]
): Promise<VersionLookupResult[]> {
  const results: VersionLookupResult[] = [];

  for (let index = 0; index < items.length; index += LOOKUP_BATCH_SIZE) {
    const batch = items.slice(index, index + LOOKUP_BATCH_SIZE);
    const response = await requestWithRetries(target, '/slates/version-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: batch })
    });
    const body = (await response.json()) as { items?: VersionLookupResult[] };

    const batchResults = body.items ?? [];
    if (
      batchResults.length !== batch.length ||
      batchResults.some((result, i) => result.identifier !== batch[i]?.identifier)
    ) {
      throw new Error(
        `Registry returned ${batchResults.length} lookup results for ${batch.length} items.`
      );
    }
    results.push(...batchResults);
  }

  return results;
}

export async function uploadVersion(
  target: RegistryTarget,
  d: {
    slateName: string;
    version: string;
    zip: Uint8Array;
    defaultAccess?: 'public' | 'private';
  }
) {
  const [scope, slate] = d.slateName.replace(/^@/, '').split('/');
  if (!scope || !slate) {
    throw new Error(`Slate name "${d.slateName}" must be in the format @scope/slate.`);
  }

  const query = d.defaultAccess ? `?default_access=${d.defaultAccess}` : '';
  const pathname = `/slates/${encodeURIComponent(scope)}/${encodeURIComponent(slate)}/versions/${encodeURIComponent(d.version)}${query}`;
  const response = await requestWithRetries(target, pathname, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/zip' },
    body: d.zip
  });

  return (await response.json()) as { id: string; version: string };
}

async function requestWithRetries(
  target: RegistryTarget,
  pathname: string,
  init: RequestInit
) {
  const url = `${target.url}${pathname}`;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    let response: Response | null = null;
    let networkError: unknown = null;

    try {
      response = await fetch(url, {
        ...init,
        redirect: 'error',
        headers: { ...init.headers, Authorization: `Bearer ${target.token}` }
      });
    } catch (error) {
      networkError = error;
    }

    if (response?.ok) {
      return response;
    }

    const retryable = !response || response.status === 429 || response.status >= 500;
    const reason = response
      ? `HTTP ${response.status}: ${await readErrorMessage(response)}`
      : `network error: ${networkError instanceof Error ? networkError.message : String(networkError)}`;

    if (!retryable || attempt === RETRY_ATTEMPTS) {
      throw new Error(
        `${init.method ?? 'GET'} registry ${pathname.split('?')[0]} failed with ${reason}`
      );
    }

    const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
    console.error(
      `Registry request failed with ${reason}. Retrying in ${delayMs}ms (${attempt}/${RETRY_ATTEMPTS})...`
    );
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error(`Retry loop exited unexpectedly for ${url}.`);
}

async function readErrorMessage(response: Response) {
  const text = await response.text().catch(() => '');

  try {
    const body = JSON.parse(text) as {
      message?: string;
      hint?: string;
      errors?: { message?: string; path?: string[] }[];
    };
    const details = (body.errors ?? []).map(error =>
      [error.path?.join('.'), error.message].filter(Boolean).join(': ')
    );
    return [body.message, body.hint, ...details].filter(Boolean).join(' ') || text;
  } catch {
    return text || response.statusText;
  }
}
