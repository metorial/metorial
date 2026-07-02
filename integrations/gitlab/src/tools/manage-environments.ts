import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, gitLabServiceError, resolveProjectId } from '../lib/helpers';
import { spec } from '../spec';

let environmentSchema = z.object({
  environmentId: z.number(),
  name: z.string(),
  slug: z.string().optional(),
  externalUrl: z.string().optional().nullable(),
  state: z.string().optional(),
  tier: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let manageEnvironments = SlateTool.create(spec, {
  name: 'Manage Environments',
  key: 'manage_environments',
  description: `List, create, update, stop, or delete deployment environments for a project. Environments represent targets like staging or production. Supports filtering by name, search term, and state.`,
  instructions: [
    'Use action "list" to view all environments.',
    'Use action "get" to fetch details of a specific environment.',
    'Use action "create" to create a new environment.',
    'Use action "update" to modify environment name, URL, or tier.',
    'Use action "stop" to stop an active environment.',
    'Use action "delete" to permanently remove a stopped environment.'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID or URL-encoded path. Falls back to config default.'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'stop', 'delete'])
        .describe('Action to perform'),
      environmentId: z
        .number()
        .optional()
        .describe('Environment ID (required for get, update, stop, delete)'),
      name: z
        .string()
        .optional()
        .describe('Environment name (required for create, optional filter for list)'),
      search: z.string().optional().describe('Search filter for list'),
      states: z
        .enum(['available', 'stopped', 'stopping'])
        .optional()
        .describe('Filter by state for list'),
      externalUrl: z.string().optional().describe('External URL for the environment'),
      tier: z
        .enum(['production', 'staging', 'testing', 'development', 'other'])
        .optional()
        .describe('Deployment tier')
    })
  )
  .output(
    z.object({
      environments: z.array(environmentSchema).optional(),
      environment: environmentSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);
    let { action, environmentId, name, search, states, externalUrl, tier } = ctx.input;

    if (action === 'list') {
      let result = (await client.listEnvironments(projectId, {
        name,
        search,
        states
      })) as any[];
      let environments = result.map((e: any) => ({
        environmentId: e.id,
        name: e.name,
        slug: e.slug,
        externalUrl: e.external_url,
        state: e.state,
        tier: e.tier,
        createdAt: e.created_at,
        updatedAt: e.updated_at
      }));
      return {
        output: { environments },
        message: `Found **${environments.length}** environment(s) in project **${projectId}**.`
      };
    }

    if (action === 'get') {
      if (!environmentId) throw gitLabServiceError('environmentId is required for get action');
      let e = (await client.getEnvironment(projectId, environmentId)) as any;
      return {
        output: {
          environment: {
            environmentId: e.id,
            name: e.name,
            slug: e.slug,
            externalUrl: e.external_url,
            state: e.state,
            tier: e.tier,
            createdAt: e.created_at,
            updatedAt: e.updated_at
          }
        },
        message: `Environment **${e.name}** is **${e.state}**.`
      };
    }

    if (action === 'create') {
      if (!name) throw gitLabServiceError('name is required for create action');
      let e = (await client.createEnvironment(projectId, {
        name,
        external_url: externalUrl,
        tier
      })) as any;
      return {
        output: {
          environment: {
            environmentId: e.id,
            name: e.name,
            slug: e.slug,
            externalUrl: e.external_url,
            state: e.state,
            tier: e.tier,
            createdAt: e.created_at,
            updatedAt: e.updated_at
          }
        },
        message: `Created environment **${e.name}**.`
      };
    }

    if (action === 'update') {
      if (!environmentId)
        throw gitLabServiceError('environmentId is required for update action');
      let data: any = {};
      if (name !== undefined) data.name = name;
      if (externalUrl !== undefined) data.external_url = externalUrl;
      if (tier !== undefined) data.tier = tier;
      let e = (await client.updateEnvironment(projectId, environmentId, data)) as any;
      return {
        output: {
          environment: {
            environmentId: e.id,
            name: e.name,
            slug: e.slug,
            externalUrl: e.external_url,
            state: e.state,
            tier: e.tier,
            createdAt: e.created_at,
            updatedAt: e.updated_at
          }
        },
        message: `Updated environment **${e.name}**.`
      };
    }

    if (action === 'stop') {
      if (!environmentId)
        throw gitLabServiceError('environmentId is required for stop action');
      let e = (await client.stopEnvironment(projectId, environmentId)) as any;
      return {
        output: {
          environment: {
            environmentId: e.id,
            name: e.name,
            slug: e.slug,
            externalUrl: e.external_url,
            state: e.state,
            tier: e.tier,
            createdAt: e.created_at,
            updatedAt: e.updated_at
          }
        },
        message: `Stopped environment **${e.name}**.`
      };
    }

    // delete
    if (!environmentId)
      throw gitLabServiceError('environmentId is required for delete action');
    await client.deleteEnvironment(projectId, environmentId);
    return {
      output: { deleted: true },
      message: `Deleted environment **#${environmentId}** from project **${projectId}**.`
    };
  })
  .build();
