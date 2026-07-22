import { createApiServiceError } from 'slates';

let LOOKER_API_PATH = '/api/4.0';

let requiredInstanceUrlError = () =>
  createApiServiceError(
    'Provide the Looker instance URL in the integration configuration or legacy authentication input.',
    { reason: 'looker_instance_url_required' }
  );

let invalidInstanceUrlError = (message: string) =>
  createApiServiceError(message, { reason: 'looker_instance_url_invalid' });

let reauthenticationRequiredError = () =>
  createApiServiceError(
    'The Looker instance configuration changed after authentication. Reconnect the integration before making requests.',
    { reason: 'looker_reauthentication_required' }
  );

export let normalizeLookerInstanceUrl = (value: unknown) => {
  if (value === undefined || value === null) {
    throw requiredInstanceUrlError();
  }

  if (typeof value !== 'string') {
    throw invalidInstanceUrlError('Looker instance URL must be a valid absolute HTTPS URL.');
  }

  let input = value.trim();
  if (input === '') {
    throw requiredInstanceUrlError();
  }

  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(input)) {
    throw invalidInstanceUrlError('Looker instance URL must be a valid absolute HTTPS URL.');
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw invalidInstanceUrlError('Looker instance URL must be a valid absolute HTTPS URL.');
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

  if (input.includes('?')) {
    throw invalidInstanceUrlError('Looker instance URL must not include query parameters.');
  }

  if (input.includes('#')) {
    throw invalidInstanceUrlError('Looker instance URL must not include a fragment.');
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

  return `https://${host}${path}`;
};

export let buildLookerApiBaseUrl = (value: unknown) =>
  `${normalizeLookerInstanceUrl(value)}${LOOKER_API_PATH}`;

export let assertLookerAuthenticatedInstanceUrl = ({
  currentInstanceUrl,
  authenticatedInstanceUrl
}: {
  currentInstanceUrl: unknown;
  authenticatedInstanceUrl?: unknown;
}) => {
  let currentUrl = normalizeLookerInstanceUrl(currentInstanceUrl);
  if (authenticatedInstanceUrl === undefined) {
    return currentUrl;
  }

  let authenticatedUrl: string;
  try {
    authenticatedUrl = normalizeLookerInstanceUrl(authenticatedInstanceUrl);
  } catch {
    throw reauthenticationRequiredError();
  }

  if (currentUrl !== authenticatedUrl) {
    throw reauthenticationRequiredError();
  }

  return currentUrl;
};

export let resolveLookerInstanceUrl = ({
  configInstanceUrl,
  legacyAuthInstanceUrl
}: {
  configInstanceUrl?: unknown;
  legacyAuthInstanceUrl?: unknown;
}) => {
  let hasConfigInstanceUrl = configInstanceUrl !== undefined && configInstanceUrl !== null;
  let hasLegacyAuthInstanceUrl =
    legacyAuthInstanceUrl !== undefined && legacyAuthInstanceUrl !== null;

  if (!hasConfigInstanceUrl && !hasLegacyAuthInstanceUrl) {
    throw requiredInstanceUrlError();
  }

  let configUrl = hasConfigInstanceUrl
    ? normalizeLookerInstanceUrl(configInstanceUrl)
    : undefined;
  let legacyUrl = hasLegacyAuthInstanceUrl
    ? normalizeLookerInstanceUrl(legacyAuthInstanceUrl)
    : undefined;

  if (configUrl !== undefined && legacyUrl !== undefined && configUrl !== legacyUrl) {
    throw createApiServiceError(
      'The configured Looker instance URL does not match the legacy authentication input. Update them to the same instance before reconnecting.',
      { reason: 'looker_instance_url_mismatch' }
    );
  }

  return configUrl ?? legacyUrl ?? normalizeLookerInstanceUrl(undefined);
};
