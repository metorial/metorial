import { createAxios } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from './client';
import { jiraApiError, jiraServiceError } from './errors';

export interface JiraSite {
  cloudId: string;
  url: string;
  name: string;
}

export interface JiraAuthState {
  token: string;
  cloudId: string;
  refreshToken?: string;
  siteUrl?: string;
  siteName?: string;
  sites?: JiraSite[];
}

export let jiraSiteSchema = z.object({
  cloudId: z.string().describe('Atlassian Cloud ID of the Jira site.'),
  url: z.string().describe('Site URL, e.g. https://mycompany.atlassian.net.'),
  name: z.string().describe('Site name.')
});

export let siteInputSchema = z
  .string()
  .optional()
  .describe(
    'Jira site to use for this call when the account can access several Atlassian sites: a site URL (e.g. "https://mycompany.atlassian.net"), host, subdomain ("mycompany"), site name, or Cloud ID. Defaults to the site chosen when the account was connected. Call list_sites to see the available sites.'
  );

let CLOUD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let isOauthAuth = (auth: JiraAuthState) => Boolean(auth.refreshToken);

let hostFromUrl = (value: string) => {
  try {
    return new URL(value).hostname.toLowerCase() || undefined;
  } catch {
    return undefined;
  }
};

// Accepts a URL, a bare host, or an Atlassian subdomain and returns the host.
let hostFromSiteRef = (ref: string) => {
  let trimmed = ref.trim();
  if (!trimmed || CLOUD_ID_PATTERN.test(trimmed) || /\s/.test(trimmed)) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return hostFromUrl(trimmed);
  if (trimmed.includes('.')) return hostFromUrl(`https://${trimmed}`);
  if (/^[a-z0-9-]+$/i.test(trimmed)) return `${trimmed.toLowerCase()}.atlassian.net`;
  return undefined;
};

let ATLASSIAN_SITE_HOST_PATTERN = /^[a-z0-9-]+\.(atlassian\.net|jira\.com|jira-dev\.com)$/;

let describeCandidates = (sites: JiraSite[]) =>
  sites.map(site => `${describeJiraSite(site)} [Cloud ID ${site.cloudId}]`).join(', ');

// Matches by Cloud ID, then site URL/host/subdomain, then site name. Several
// sites matching at the same tier is treated as ambiguous rather than guessed.
export let findJiraSite = (sites: JiraSite[], ref: string) => {
  let trimmed = ref.trim();
  if (!trimmed) return undefined;

  let lower = trimmed.toLowerCase();
  let host = hostFromSiteRef(trimmed);

  let tiers = [
    sites.filter(site => site.cloudId.toLowerCase() === lower),
    host ? sites.filter(site => hostFromUrl(site.url) === host) : [],
    sites.filter(site => site.name.toLowerCase() === lower)
  ];

  for (let matches of tiers) {
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      throw jiraServiceError(
        `The Jira site "${trimmed}" matches several sites: ${describeCandidates(matches)}. Use the site URL or Cloud ID instead.`
      );
    }
  }

  return undefined;
};

export let normalizeAccessibleResources = (resources: unknown): JiraSite[] => {
  if (!Array.isArray(resources)) return [];

  let sites: JiraSite[] = [];
  for (let resource of resources) {
    if (!resource || typeof resource !== 'object') continue;
    let { id, url, name } = resource as Record<string, unknown>;
    if (typeof id !== 'string' || !id) continue;
    if (sites.some(site => site.cloudId === id)) continue;

    sites.push({
      cloudId: id,
      url: typeof url === 'string' ? url : '',
      name: typeof name === 'string' ? name : ''
    });
  }

  return sites;
};

export let fetchAccessibleJiraSites = async (accessToken: string) => {
  try {
    let response = await createAxios().get(
      'https://api.atlassian.com/oauth/token/accessible-resources',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return normalizeAccessibleResources(response.data);
  } catch (error) {
    throw jiraApiError(error, 'accessible sites lookup');
  }
};

let lookupTenantCloudId = async (host: string) => {
  let cloudId: unknown;
  try {
    let response = await createAxios().get(`https://${host}/_edge/tenant_info`);
    cloudId = (response.data as { cloudId?: unknown })?.cloudId;
  } catch (error) {
    throw jiraApiError(error, `site lookup for ${host}`);
  }

  if (cloudId === undefined || cloudId === null || cloudId === '') return undefined;

  // The Cloud ID is placed in API paths, so only a well-formed UUID is accepted.
  if (typeof cloudId !== 'string' || !CLOUD_ID_PATTERN.test(cloudId.trim())) {
    throw jiraServiceError(
      `The Jira site ${host} returned an invalid Cloud ID. Verify the site URL, or provide the site's Cloud ID.`
    );
  }

  return cloudId.trim();
};

export let describeJiraSite = (site: Partial<JiraSite> & { cloudId: string }) => {
  if (site.name && site.url) return `${site.name} (${site.url})`;
  return site.url || site.name || site.cloudId;
};

let describeSiteList = (sites: JiraSite[]) =>
  sites.length > 0 ? sites.map(site => describeJiraSite(site)).join(', ') : 'none';

// Picks the site for a new OAuth connection. Without a requested site the first
// accessible site is kept as the default, matching earlier connections.
export let selectOauthJiraSite = (sites: JiraSite[], requested?: string) => {
  if (sites.length === 0) {
    throw jiraServiceError('Jira OAuth did not return an accessible Cloud site.');
  }

  if (!requested?.trim()) return sites[0]!;

  let site = findJiraSite(sites, requested);
  if (!site) {
    throw jiraServiceError(
      `The Jira site "${requested.trim()}" is not accessible with this authorization. Accessible sites: ${describeSiteList(sites)}. Reconnect and grant access to the site, or choose one of the accessible sites.`
    );
  }

  return site;
};

export let activeJiraSite = (auth: JiraAuthState): JiraSite => {
  let stored = auth.sites?.find(site => site.cloudId === auth.cloudId);
  return {
    cloudId: auth.cloudId,
    url: auth.siteUrl || stored?.url || '',
    name: auth.siteName || stored?.name || ''
  };
};

let resolveTargetSite = async (auth: JiraAuthState, ref?: string): Promise<JiraSite> => {
  let active = activeJiraSite(auth);
  if (!ref?.trim()) return active;

  let known = [active, ...(auth.sites ?? []).filter(site => site.cloudId !== active.cloudId)];
  let match = findJiraSite(known, ref);
  if (match) return match;

  let trimmed = ref.trim();

  if (isOauthAuth(auth)) {
    let accessible = await fetchAccessibleJiraSites(auth.token);
    let liveMatch = findJiraSite(accessible, trimmed);
    if (liveMatch) return liveMatch;

    throw jiraServiceError(
      `The Jira site "${trimmed}" is not accessible with this connection. Accessible sites: ${describeSiteList(accessible)}. Call list_sites and pass one of those sites, or reconnect and grant access to the site.`
    );
  }

  if (CLOUD_ID_PATTERN.test(trimmed)) {
    return { cloudId: trimmed, url: '', name: '' };
  }

  let host = hostFromSiteRef(trimmed);
  if (!host || !ATLASSIAN_SITE_HOST_PATTERN.test(host)) {
    throw jiraServiceError(
      `Could not find the Jira site "${trimmed}". Provide the Atlassian site URL (e.g. "https://mycompany.atlassian.net"), its subdomain, or its Cloud ID.`
    );
  }

  let cloudId = await lookupTenantCloudId(host);
  if (!cloudId) {
    throw jiraServiceError(
      `Could not resolve the Cloud ID for the Jira site "${trimmed}". Verify the site URL, or provide its Cloud ID.`
    );
  }

  return { cloudId, url: `https://${host}`, name: '' };
};

let notFoundHintFor = (auth: JiraAuthState, target: JiraSite) => {
  let others = (auth.sites ?? []).filter(site => site.cloudId !== target.cloudId);
  let otherText =
    others.length > 0 ? ` This connection can also access: ${describeSiteList(others)}.` : '';

  return ` (request was sent to the Jira site ${describeJiraSite(target)}.${otherText} If the item lives on another Atlassian site, pass that site in the site input; list_sites shows the available sites.)`;
};

export let createJiraClient = async (auth: JiraAuthState, siteRef?: string) => {
  let target = await resolveTargetSite(auth, siteRef);

  return new JiraClient({
    token: auth.token,
    cloudId: target.cloudId,
    refreshToken: auth.refreshToken,
    notFoundHint: notFoundHintFor(auth, target)
  });
};
