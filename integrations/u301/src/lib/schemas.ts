import { z } from 'zod';

export let workspaceIdSchema = z
  .string()
  .describe('Workspace ID. Call list_workspaces to discover authorized workspace IDs.');

export let getLinkSchema = z
  .object({
    id: z.string(),
    domain: z.string(),
    domainName: z.string().optional(),
    slug: z.string(),
    isCustomSlug: z.boolean(),
    shortUrl: z.string(),
    originalUrl: z.string(),
    allowSearchEngineIndexing: z.boolean(),
    archived: z.boolean(),
    suspended: z.boolean(),
    statsClicks: z.number().optional(),
    expiresAt: z.string().nullish(),
    userId: z.string(),
    workspaceId: z.string(),
    comment: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().nullish()
  })
  .passthrough();

// List responses use domainName; do not replace it with the get endpoint's domain field.
export let listLinkSchema = getLinkSchema.omit({ domain: true }).extend({
  domain: z.string().optional(),
  domainName: z.string()
});

export let listLinksSchema = z
  .object({
    links: z.array(listLinkSchema),
    metadata: z
      .object({ total: z.number(), perPage: z.number(), page: z.number() })
      .passthrough()
  })
  .passthrough();

export let clicksSchema = z
  .object({
    start: z.string(),
    end: z.string(),
    data: z.array(z.object({ date: z.string(), click: z.number() }).passthrough())
  })
  .passthrough();
