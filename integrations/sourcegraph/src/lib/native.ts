import { z } from 'zod';

const optionalText = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
const count = z.number().int().nonnegative();
export const pageInfo = z.object({ hasNextPage: z.boolean(), endCursor: optionalText });
export const connection = <T extends z.ZodType>(node: T) =>
  z.object({ nodes: z.array(node), totalCount: count, pageInfo });
const namespace = z.object({
  id: z.string().optional(),
  username: optionalText,
  name: optionalText
});
export const repository = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string(),
  description: optionalText,
  createdAt: optionalText,
  mirrorInfo: z
    .object({
      cloned: z.boolean(),
      cloneInProgress: z.boolean().optional(),
      lastError: optionalText
    })
    .optional(),
  externalRepository: z.object({ serviceType: z.string() }).optional(),
  defaultBranch: z.object({ name: z.string() }).nullish(),
  branches: connection(
    z.object({ name: z.string(), target: z.object({ oid: z.string() }) })
  ).optional(),
  tags: connection(
    z.object({ name: z.string(), target: z.object({ oid: z.string() }) })
  ).optional()
});
export const changesetStats = z.object({
  total: count,
  merged: count,
  open: count,
  closed: count,
  unpublished: count,
  draft: count
});
export const batch = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: optionalText,
  state: z.string(),
  url: optionalText,
  namespace: namespace.optional(),
  creator: z.object({ username: z.string() }).optional(),
  createdAt: optionalText,
  updatedAt: optionalText,
  closedAt: optionalText,
  changesetsStats: changesetStats.optional(),
  changesets: connection(
    z.object({
      id: z.string().min(1),
      state: z.string(),
      externalID: optionalText,
      title: optionalText,
      body: optionalText,
      reviewState: optionalText,
      checkState: optionalText,
      repository: z.object({ name: z.string() }).optional(),
      externalURL: z.object({ url: z.string() }).nullish(),
      createdAt: optionalText,
      updatedAt: optionalText
    })
  ).optional()
});
export const insight = z.object({
  id: z.string().min(1),
  presentation: z.object({ title: z.string() }),
  defaultFilters: z
    .object({ includeRepoRegex: optionalText, excludeRepoRegex: optionalText })
    .optional(),
  dataSeries: z.array(
    z.object({
      label: z.string(),
      points: z
        .array(z.object({ dateTime: z.string(), value: z.number().finite() }))
        .optional(),
      status: z
        .object({
          totalPoints: count.optional(),
          pendingJobs: count.optional(),
          completedJobs: count.optional(),
          failedJobs: count.optional()
        })
        .optional()
    })
  )
});
export const monitor = z.object({
  id: z.string().min(1),
  description: z.string(),
  enabled: z.boolean(),
  owner: namespace.optional(),
  trigger: z.object({ query: z.string() }),
  createdAt: optionalText,
  actions: connection(
    z.object({
      __typename: z.enum(['MonitorEmail', 'MonitorSlackWebhook', 'MonitorWebhook']),
      id: z.string(),
      enabled: z.boolean(),
      includeResults: z.boolean(),
      url: optionalText,
      priority: optionalText,
      header: optionalText,
      recipients: connection(z.object({ id: z.string() })).optional()
    })
  ).optional()
});
export const user = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: optionalText,
  primaryEmail: z.object({ email: z.string() }).nullish(),
  avatarURL: optionalText,
  siteAdmin: z.boolean(),
  organizations: z.object({
    nodes: z.array(z.object({ id: z.string(), name: z.string(), displayName: optionalText })),
    totalCount: count
  })
});
export const blob = z.object({
  path: z.string(),
  content: z.string(),
  binary: z.boolean(),
  byteSize: count
});
export const tree = z.object({
  path: z.string(),
  entries: z.array(z.object({ name: z.string(), path: z.string(), isDirectory: z.boolean() }))
});
export const match = z.object({
  type: z.string(),
  repository: z.union([z.string(), z.object({ name: z.string() })]).optional(),
  path: z.string().optional(),
  url: z.string().optional(),
  lineMatches: z
    .array(
      z.object({
        lineNumber: count.optional(),
        line: z.string().optional(),
        preview: z.string().optional(),
        content: z.string().optional()
      })
    )
    .optional(),
  chunkMatches: z
    .array(
      z.object({ contentStart: z.object({ line: count }).optional(), content: z.string() })
    )
    .optional(),
  message: z.string().optional(),
  authorName: z.string().optional()
});
export type NativeMatch = z.infer<typeof match>;
