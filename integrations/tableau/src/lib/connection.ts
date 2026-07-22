import { tableauServiceError } from './errors';

export let DEFAULT_API_VERSION = '3.28';

export let SERVER_URL_DESCRIPTION =
  'Tableau Server or Tableau Cloud base URL, e.g. https://dub01.online.tableau.com — without any /#/site/... path';

export let SITE_CONTENT_URL_DESCRIPTION =
  'Site name as it appears after /site/ in your Tableau browser URL (e.g. "mysite" for .../#/site/mysite). Required on Tableau Cloud; leave empty only for the Tableau Server default site.';

export let API_VERSION_DESCRIPTION = `Tableau REST API version (e.g. "${DEFAULT_API_VERSION}")`;

let hasUrlScheme = (value: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);

export let normalizeServerUrl = (raw: string) => {
  let trimmed = raw.trim();
  if (!trimmed) {
    throw tableauServiceError(
      'The Tableau server URL is required. Use the base URL of your Tableau Server or Tableau Cloud pod, e.g. https://dub01.online.tableau.com.'
    );
  }

  let candidate = hasUrlScheme(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw tableauServiceError(
      `The Tableau server URL "${raw}" is not a valid URL. Use the base URL of your Tableau Server or Tableau Cloud pod, e.g. https://dub01.online.tableau.com.`
    );
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw tableauServiceError(
      `The Tableau server URL "${raw}" must use http or https, e.g. https://dub01.online.tableau.com.`
    );
  }

  return parsed.origin;
};

export let normalizeSiteContentUrl = (raw: string | undefined) => {
  let trimmed = (raw ?? '').trim();
  if (!trimmed) return '';

  // Users often paste a full Tableau URL — browser URLs (.../#/site/<name>/...) or
  // share/embed links (.../t/<name>/...); extract the site name.
  let siteSegment = trimmed.match(/(?:^|[/#])(?:site|t)\/([^/?#]+)/i);
  if (siteSegment) return siteSegment[1];

  let cleaned = trimmed.replace(/^[#/]+|\/+$/g, '');
  if (!cleaned) return '';

  if (!/^[A-Za-z0-9_-]+$/.test(cleaned)) {
    throw tableauServiceError(
      `The site content URL "${raw}" is not a Tableau site name. Enter only the segment after /site/ in your Tableau browser URL, e.g. "mysite" for .../#/site/mysite. Leave it empty for the Tableau Server default site.`
    );
  }

  return cleaned;
};

export let normalizeApiVersion = (raw: string | undefined) => {
  let trimmed = (raw ?? '').trim().replace(/^v/i, '');
  if (!trimmed) return DEFAULT_API_VERSION;

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw tableauServiceError(
      `The Tableau API version "${raw}" is invalid. Use the REST API version number, e.g. "${DEFAULT_API_VERSION}".`
    );
  }

  return trimmed;
};

export let isTableauCloud = (serverUrl: string) =>
  /\.online\.tableau\.com$/i.test(new URL(serverUrl).hostname);

export let normalizeConnection = (input: {
  serverUrl: string;
  siteContentUrl?: string;
  apiVersion?: string;
}) => {
  let serverUrl = normalizeServerUrl(input.serverUrl);
  let siteContentUrl = normalizeSiteContentUrl(input.siteContentUrl);
  let apiVersion = normalizeApiVersion(input.apiVersion);

  if (!siteContentUrl && isTableauCloud(serverUrl)) {
    throw tableauServiceError(
      'Tableau Cloud requires a site content URL because it has no default site. Enter the site name that appears after /site/ in your Tableau browser URL, e.g. "mysite" for .../#/site/mysite.'
    );
  }

  return { serverUrl, siteContentUrl, apiVersion };
};
