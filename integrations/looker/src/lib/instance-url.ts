import { createApiServiceError } from 'slates';

let LOOKER_API_PATH = '/api/4.0';

let requiredInstanceUrlError = () =>
  createApiServiceError(
    'The Looker instance URL is missing. Reconnect the Looker authentication with its instance URL.',
    { reason: 'looker_instance_url_required' }
  );

let invalidInstanceUrlError = (message: string) =>
  createApiServiceError(message, { reason: 'looker_instance_url_invalid' });

export let presentLookerInstanceUrl = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

export let normalizeLookerInstanceUrl = (value: unknown) => {
  if (value === undefined || value === null) {
    throw requiredInstanceUrlError();
  }

  if (typeof value !== 'string') {
    throw invalidInstanceUrlError('Looker instance URL must be a valid HTTPS URL.');
  }

  // Accept any pasted form: drop query/fragment noise and default a missing
  // scheme to HTTPS before validating.
  let input = (value.trim().split(/[?#]/, 1)[0] ?? '').trim();
  if (input === '') {
    throw requiredInstanceUrlError();
  }

  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(input)) {
    input = `https://${input.replace(/^\/+/, '')}`;
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw invalidInstanceUrlError('Looker instance URL must be a valid HTTPS URL.');
  }

  if (url.protocol !== 'https:') {
    throw invalidInstanceUrlError('Looker instance URL must use HTTPS.');
  }

  let authorityStart = input.indexOf('://') + 3;
  let authority = input.slice(authorityStart).split(/[/?#]/, 1)[0] ?? '';

  if (url.username !== '' || url.password !== '' || authority.includes('@')) {
    throw invalidInstanceUrlError(
      'Looker instance URL must not include a username or password.'
    );
  }

  if (url.hostname === '') {
    throw invalidInstanceUrlError('Looker instance URL must include a valid hostname.');
  }

  let explicitPort = authority.match(/:(\d+)$/)?.[1];
  let host = explicitPort ? `${url.hostname}:${explicitPort}` : url.host;
  let path = url.pathname.replace(/\/+$/, '');

  while (path.endsWith(LOOKER_API_PATH)) {
    path = path.slice(0, -LOOKER_API_PATH.length).replace(/\/+$/, '');
  }

  // Looker-hosted instances never sit behind a path prefix, so a pasted page
  // URL (e.g. .../dashboards/42) reduces to the instance root. Self-hosted
  // instances keep their proxy path prefixes.
  if (/\.cloud\.looker\.com$/i.test(url.hostname)) {
    path = '';
  }

  return `https://${host}${path}`;
};

export let buildLookerApiBaseUrl = (value: unknown) =>
  `${normalizeLookerInstanceUrl(value)}${LOOKER_API_PATH}`;

// The instance URL a token was issued for wins over any legacy config copy;
// blank and non-string values count as absent so stale placeholders never mask
// the authoritative binding.
export let resolveLookerInstanceUrl = ({
  authenticatedInstanceUrl,
  legacyConfigInstanceUrl
}: {
  authenticatedInstanceUrl?: unknown;
  legacyConfigInstanceUrl?: unknown;
}) =>
  normalizeLookerInstanceUrl(
    presentLookerInstanceUrl(authenticatedInstanceUrl) ??
      presentLookerInstanceUrl(legacyConfigInstanceUrl)
  );
