import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

let environmentSchema = z.object({
  environmentId: z.string().describe('Chameleon environment (URL group) ID'),
  name: z.string().optional().describe('Environment name'),
  description: z.string().optional().describe('Environment description'),
  shortName: z.string().optional().describe('Short name identifier'),
  archivedAt: z.string().nullable().optional().describe('Archive timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapEnvironment = (e: Record<string, unknown>) => ({
  environmentId: e.id as string,
  name: e.name as string | undefined,
  description: e.description as string | undefined,
  shortName: e.short_name as string | undefined,
  archivedAt: e.archived_at as string | null | undefined,
  createdAt: e.created_at as string | undefined,
  updatedAt: e.updated_at as string | undefined
});

export let manageEnvironments = SlateTool.create(spec, {
  name: 'Manage Environments',
  key: 'manage_environments',
  description: `List, create, or update Chameleon environments (URL groups).
Environments group domains and are used to control which experiences show in which environments (e.g., production, staging, development).`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('Action to perform'),
      // Create/Update params
      environmentId: z.string().optional().describe('Environment ID to update'),
      name: z.string().optional().describe('Environment name'),
      description: z.string().optional().describe('Environment description'),
      shortName: z.string().optional().describe('Short name identifier'),
      archivedAt: z
        .string()
        .nullable()
        .optional()
        .describe('Set to archive or null to unarchive'),
      // List params
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Number of environments to return'),
      before: z.string().optional().describe('Pagination cursor'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      environment: environmentSchema.optional().describe('Created or updated environment'),
      environments: z.array(environmentSchema).optional().describe('Array of environments'),
      cursor: z
        .object({
          limit: z.number().optional(),
          before: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    if (ctx.input.action === 'create') {
      let result = await client.createUrlGroup({
        name: ctx.input.name!,
        description: ctx.input.description,
        shortName: ctx.input.shortName
      });
      return {
        output: { environment: mapEnvironment(result) },
        message: `Environment **${ctx.input.name}** has been created.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateUrlGroup(ctx.input.environmentId!, {
        name: ctx.input.name,
        description: ctx.input.description,
        shortName: ctx.input.shortName,
        archivedAt: ctx.input.archivedAt
      });
      return {
        output: { environment: mapEnvironment(result) },
        message: `Environment **${result.name || result.id}** has been updated.`
      };
    }

    // list
    let result = await client.listUrlGroups({
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after
    });
    let environments = (result.url_groups || []).map(mapEnvironment);
    return {
      output: { environments, cursor: result.cursor },
      message: `Returned **${environments.length}** environments.`
    };
  })
  .build();
