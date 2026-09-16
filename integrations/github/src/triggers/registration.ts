import { randomBytes } from 'node:crypto';
import { isServiceError } from '@lowerdeck/error';
import { createApiServiceError, type SlateWebhookTarget } from 'slates';
import { z } from 'zod';
import { GITHUB_RATE_LIMITED_CODE, GitHubClient } from '../lib/client';
import { githubEventNames } from './event-schemas';

const repositoryNameSchema = z
  .string()
  .trim()
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9_.-]+$/,
    'Use a repository name in owner/repo form.'
  )
  .refine(
    value => !['.', '..'].includes(value.split('/')[1] ?? ''),
    'Use a repository name in owner/repo form.'
  );

export const githubTargetSchema = z.object({
  instanceUrl: z.url(),
  repositoryId: z.number().int().positive(),
  owner: z.string().min(1),
  repo: z.string().min(1)
});
export const githubRegistrationSchema = githubTargetSchema.extend({
  hookId: z.number().int().positive(),
  signingSecret: z.string().min(1)
});
export type GitHubTarget = z.infer<typeof githubTargetSchema>;
type Auth = { token: string; instanceUrl: string };
type Log = { warn: (message: object) => void };

// The runtime rediscovers targets for every connection every 15 minutes and passes a null
// page token each cycle, so conditional requests cannot help; the cost is bounded instead.
// Worst case per cycle: MAX_DISCOVERY_PAGES list calls plus MAX_ACCESS_PROBES hook checks.
export const TARGET_PAGE_SIZE = 100; // GitHub's maximum per_page
export const MAX_DISCOVERY_PAGES = 10; // at most 1,000 repositories scanned per cycle
export const MAX_ACCESS_PROBES = 50; // non-admin repositories checked for webhook access per cycle

export const discoveryPageTokenSchema = z.object({
  page: z.number().int().min(1).max(MAX_DISCOVERY_PAGES),
  probes: z.number().int().min(0).max(MAX_ACCESS_PROBES)
});
export type GitHubDiscoveryPageToken = z.infer<typeof discoveryPageTokenSchema>;

const repositoryIdentitySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  full_name: repositoryNameSchema,
  owner: z.object({ login: z.string().min(1) })
});
const discoveredRepositorySchema = repositoryIdentitySchema.extend({
  archived: z.boolean().optional(),
  permissions: z.looseObject({ admin: z.boolean().optional() }).optional()
});
const isRepositoryPermissionDenial = (error: unknown) =>
  isServiceError(error) &&
  [403, 404].includes(Number(error.data.upstreamStatus)) &&
  error.data.upstreamCode !== GITHUB_RATE_LIMITED_CODE;
export const normalizeGitHubInstance = (instanceUrl: string) => {
  const parsed = z.url().safeParse(instanceUrl);
  if (!parsed.success) throw createApiServiceError('The GitHub instance URL is invalid.');
  return new URL(parsed.data).href.replace(/\/+$/, '');
};
export const githubTargetIdentifier = (
  target: Pick<GitHubTarget, 'instanceUrl' | 'repositoryId'>
) => JSON.stringify([normalizeGitHubInstance(target.instanceUrl), target.repositoryId]);

const repositoryPath = (target: Pick<GitHubTarget, 'owner' | 'repo'>) =>
  `/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`;
const resolveRepository = async (client: GitHubClient, instanceUrl: string, name: string) => {
  const [owner, repo] = name.split('/') as [string, string];
  const response = await client.requestRest<unknown>({
    method: 'GET',
    path: repositoryPath({ owner, repo }),
    operation: `resolve webhook repository ${name}`,
    reason: 'github_webhook_repository_unavailable'
  });
  const parsed = repositoryIdentitySchema.safeParse(response);
  if (!parsed.success)
    throw createApiServiceError('GitHub returned an invalid repository identity.');
  return {
    instanceUrl,
    repositoryId: parsed.data.id,
    owner: parsed.data.owner.login,
    repo: parsed.data.name
  };
};

const hasNextLink = (linkHeader: string | undefined) =>
  linkHeader?.split(',').some(link => /;\s*rel="next"/.test(link)) ?? false;

export const listGitHubWebhookTargets = async (auth: Auth, pageToken: unknown, log: Log) => {
  const token =
    pageToken == null
      ? { success: true as const, data: { page: 1, probes: 0 } }
      : discoveryPageTokenSchema.safeParse(pageToken);
  if (!token.success) {
    throw createApiServiceError('The GitHub webhook target page token is invalid.');
  }
  const { page } = token.data;
  let { probes } = token.data;
  const instanceUrl = normalizeGitHubInstance(auth.instanceUrl);
  const client = new GitHubClient(auth);
  const response = await client.requestRestWithMetadata<unknown>({
    method: 'GET',
    path: '/user/repos',
    query: { per_page: TARGET_PAGE_SIZE, page, sort: 'full_name', direction: 'asc' },
    operation: 'discover repositories for automatic webhooks',
    reason: 'github_webhook_discovery_failed'
  });
  const repositories = z.array(discoveredRepositorySchema).safeParse(response.data);
  if (!repositories.success)
    throw createApiServiceError(
      'GitHub returned invalid repositories during webhook discovery.'
    );

  const targets: SlateWebhookTarget[] = [];
  const seen = new Set<number>();
  let unprobed = 0;
  for (const repository of repositories.data) {
    if (seen.has(repository.id)) continue;
    seen.add(repository.id);
    // Archived repositories are read-only; GitHub rejects webhook creation on them.
    if (repository.archived) continue;
    const target = {
      instanceUrl,
      repositoryId: repository.id,
      owner: repository.owner.login,
      repo: repository.name
    };
    // Admins can always manage hooks, so only non-admin repositories need an access probe:
    // custom roles may grant webhook management without admin. GitHub does not expose
    // fine-grained token write grants either way; hook creation is the authoritative check.
    if (!repository.permissions?.admin) {
      if (probes >= MAX_ACCESS_PROBES) {
        unprobed++;
        continue;
      }
      probes++;
      try {
        await client.requestRest({
          method: 'GET',
          path: `${repositoryPath(target)}/hooks`,
          query: { per_page: 1 },
          operation: `check webhook access for ${repository.full_name}`,
          reason: 'github_webhook_access_failed'
        });
      } catch (error) {
        if (isRepositoryPermissionDenial(error)) continue;
        throw error;
      }
    }
    targets.push({
      webhookTargetIdentifier: githubTargetIdentifier(target),
      name: repository.full_name,
      metadata: target,
      webhookTargetPayload: target,
      targetOwnership: 'multi_user'
    });
  }
  if (unprobed > 0) {
    log.warn({
      message: 'Skipped non-admin repositories after reaching the webhook access probe limit.',
      reason: 'github_webhook_probe_limit',
      skipped: unprobed,
      limit: MAX_ACCESS_PROBES,
      page
    });
  }
  // Keep paging even if this page contained no eligible repositories, up to the page limit.
  const hasNext = hasNextLink(response.linkHeader);
  if (hasNext && page >= MAX_DISCOVERY_PAGES) {
    log.warn({
      message:
        'Stopped repository discovery at the page limit; later repositories were not scanned.',
      reason: 'github_webhook_page_limit',
      limit: MAX_DISCOVERY_PAGES * TARGET_PAGE_SIZE,
      page
    });
  }
  return {
    targets,
    nextPageToken: hasNext && page < MAX_DISCOVERY_PAGES ? { page: page + 1, probes } : null,
    isPartial: unprobed > 0 || (hasNext && page >= MAX_DISCOVERY_PAGES)
  };
};

const deleteHook = async (client: GitHubClient, target: GitHubTarget, hookId: number) => {
  try {
    await client.requestRest({
      method: 'DELETE',
      path: `${repositoryPath(target)}/hooks/${hookId}`,
      operation: 'delete repository webhook',
      reason: 'github_webhook_delete_failed'
    });
  } catch (error) {
    if (!isServiceError(error) || Number(error.data.upstreamStatus) !== 404) throw error;
    // GitHub also uses 404 for inaccessible private resources. Only an authorized
    // list can establish that this hook is gone; otherwise cleanup must retry.
    let page = 1;
    let hasNext: boolean;
    do {
      const response = await client.requestRestWithMetadata<unknown>({
        method: 'GET',
        path: `${repositoryPath(target)}/hooks`,
        query: { per_page: 100, page },
        operation: 'verify deleted repository webhook',
        reason: 'github_webhook_delete_verification_failed'
      });
      const hooks = z
        .array(z.object({ id: z.number().int().positive() }))
        .safeParse(response.data);
      if (!hooks.success)
        throw createApiServiceError('GitHub returned an invalid webhook list during cleanup.');
      if (hooks.data.some(hook => hook.id === hookId)) throw error;
      hasNext = hasNextLink(response.linkHeader);
      page++;
    } while (hasNext);
  }
};

export const registerGitHubWebhook = async (
  auth: Auth,
  input: {
    webhookTargetIdentifier: string;
    webhookTargetPayload: unknown;
    webhookUrl: string;
  }
) => {
  const supplied = githubTargetSchema.safeParse(input.webhookTargetPayload);
  const instanceUrl = normalizeGitHubInstance(auth.instanceUrl);
  if (
    !supplied.success ||
    supplied.data.instanceUrl !== instanceUrl ||
    githubTargetIdentifier(supplied.data) !== input.webhookTargetIdentifier
  ) {
    throw createApiServiceError('The selected GitHub webhook target is invalid.');
  }
  const client = new GitHubClient(auth);
  const target = await resolveRepository(
    client,
    instanceUrl,
    `${supplied.data.owner}/${supplied.data.repo}`
  );
  if (target.repositoryId !== supplied.data.repositoryId) {
    throw createApiServiceError(
      'The repository identity changed; rediscover webhook targets before registering.'
    );
  }
  const webhookUrl = z.url().safeParse(input.webhookUrl);
  if (!webhookUrl.success || new URL(webhookUrl.data).protocol !== 'https:') {
    throw createApiServiceError('GitHub webhooks require an HTTPS receive URL.');
  }
  const signingSecret = randomBytes(32).toString('hex');
  const response = await client.requestRest<unknown>({
    method: 'POST',
    path: `${repositoryPath(target)}/hooks`,
    operation: 'create repository webhook (requires repository webhook write permission)',
    reason: 'github_webhook_create_failed',
    body: {
      name: 'web',
      active: true,
      events: githubEventNames,
      config: {
        url: webhookUrl.data,
        content_type: 'json',
        insecure_ssl: '0',
        secret: signingSecret
      }
    }
  });
  const hookSchema = z.object({
    id: z.number().int().positive(),
    active: z.literal(true),
    events: z.array(z.string()),
    config: z.object({
      url: z.literal(webhookUrl.data),
      content_type: z.literal('json'),
      insecure_ssl: z.union([z.literal('0'), z.literal(0)])
    })
  });
  const hook = hookSchema.safeParse(response);
  if (
    !hook.success ||
    hook.data.events.length !== githubEventNames.length ||
    !githubEventNames.every(event => hook.data.events.includes(event))
  ) {
    const created = z.object({ id: z.number().int().positive() }).safeParse(response);
    if (created.success) await deleteHook(client, target, created.data.id);
    throw createApiServiceError('GitHub returned an unexpected webhook configuration.');
  }
  return {
    webhookRegistrationIdentifier: String(hook.data.id),
    webhookRegistrationPayload: { ...target, hookId: hook.data.id, signingSecret }
  };
};

export const unregisterGitHubWebhook = async (auth: Auth, registration: unknown) => {
  const parsed = githubRegistrationSchema.safeParse(registration);
  if (!parsed.success)
    throw createApiServiceError('The saved GitHub webhook registration is invalid.');
  const saved = parsed.data;
  if (normalizeGitHubInstance(auth.instanceUrl) !== saved.instanceUrl) {
    throw createApiServiceError(
      'The current GitHub instance does not match the saved webhook.'
    );
  }
  const client = new GitHubClient(auth);
  const target = await resolveRepository(
    client,
    saved.instanceUrl,
    `${saved.owner}/${saved.repo}`
  );
  if (target.repositoryId !== saved.repositoryId) {
    throw createApiServiceError(
      'The repository identity changed; the webhook was not deleted.'
    );
  }
  await deleteHook(client, target, saved.hookId);
};
