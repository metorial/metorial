import { z } from 'zod';

export const paginationInput = {
  cursor: z.string().optional().describe('Continuation cursor returned by the previous page.'),
  limit: z
    .number()
    .optional()
    .describe('Page size, from 1 to 100. Omit both cursor and limit to retrieve all pages.')
};
export const paginationOutput = {
  nextCursor: z.string().nullable().optional().describe('Cursor for the next page, if any.'),
  hasMore: z.boolean().optional().describe('Whether another page is available.')
};
export const workspaceIdInput = z
  .string()
  .optional()
  .describe(
    'Workspace ID. Call list_workspaces to discover authorized workspaces. Omit to use the token workspace.'
  );
export const projectIdInput = z
  .string()
  .describe('Project ID. Call list_projects to discover accessible projects.');
export const databaseIdInput = z
  .string()
  .describe('Database ID. Call list_databases to discover accessible databases.');

const endpoint = z.object({
  host: z.string().optional(),
  port: z.number().optional(),
  connectionString: z.string().optional()
});
const directConnection = z.object({
  host: z.string().optional(),
  port: z.number().optional(),
  user: z.string().optional(),
  pass: z.string().optional(),
  password: z.string().optional()
});
export const connectionResponse = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  createdAt: z.string().optional(),
  kind: z.string().optional(),
  connectionString: z.string().nullish(),
  endpoints: z
    .object({
      direct: endpoint.optional(),
      pooled: endpoint.optional(),
      accelerate: endpoint.optional()
    })
    .optional(),
  directConnection: directConnection.nullish(),
  ppgDirectConnection: directConnection.nullish(),
  host: z.string().nullish(),
  user: z.string().nullish(),
  pass: z.string().nullish(),
  database: z.object({ id: z.string(), name: z.string().optional() }).optional()
});
export const databaseResponse = z.object({
  id: z.string().min(1),
  name: z.string(),
  region: z.union([z.string(), z.object({ id: z.string(), name: z.string() })]).nullish(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
  isDefault: z.boolean().optional(),
  connectionString: z.string().nullish(),
  defaultConnectionId: z.string().nullish(),
  connections: z.array(connectionResponse).optional(),
  apiKeys: z.array(connectionResponse).optional(),
  directConnection: directConnection.nullish(),
  project: z.object({ id: z.string(), name: z.string().optional() }).optional()
});
export const projectResponse = z.object({
  id: z.string().min(1),
  name: z.string(),
  createdAt: z.string().optional(),
  defaultRegion: z.string().nullish(),
  workspace: z.object({ id: z.string(), name: z.string().optional() }).optional(),
  database: databaseResponse.nullish(),
  databases: z.array(databaseResponse).optional()
});
export const workspaceResponse = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  displayName: z.string().optional(),
  createdAt: z.string().optional(),
  slug: z.string().optional()
});
export const backupResponse = z.object({
  id: z.string().min(1),
  createdAt: z.string().optional(),
  status: z.string().optional(),
  size: z.number().optional(),
  backupType: z.string().optional()
});
export const usageResponse = z.object({
  period: z.object({ start: z.string(), end: z.string() }),
  metrics: z.object({
    operations: z.object({ used: z.number(), unit: z.literal('ops') }),
    storage: z.object({ used: z.number(), unit: z.literal('GiB') })
  }),
  generatedAt: z.string()
});
export const principalResponse = z.object({
  user: z
    .object({ id: z.string(), email: z.string(), name: z.string().nullable() })
    .nullable(),
  workspace: z.object({ id: z.string(), name: z.string() }).nullable(),
  credential: z.object({
    type: z.string(),
    id: z.string().nullable(),
    name: z.string().nullable()
  })
});
export const regionResponse = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string()
});
export const connectionOutputSchema = z.object({
  connectionId: z.string().describe('Connection identifier'),
  connectionName: z.string().optional(),
  connectionString: z
    .string()
    .optional()
    .describe(
      'Connection string when returned by the provider; credentials are usually available only when created.'
    ),
  directHost: z.string().optional(),
  directPort: z.number().optional(),
  directUser: z.string().optional(),
  directPassword: z.string().optional(),
  endpoints: z
    .object({
      direct: endpoint.optional(),
      pooled: endpoint.optional(),
      accelerate: endpoint.optional()
    })
    .optional()
});
