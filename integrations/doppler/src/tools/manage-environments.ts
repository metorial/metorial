import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

let environmentSchema = z.object({
  environmentId: z.string().optional().describe('Environment identifier (slug)'),
  name: z.string().optional().describe('Environment display name'),
  project: z.string().optional().describe('Project the environment belongs to'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  initialFetchAt: z.string().optional().describe('First fetch timestamp')
});

export let manageEnvironments = SlateTool.create(spec, {
  name: 'Manage Environments',
  key: 'manage_environments',
  description: `List, create, rename, or delete environments within a Doppler project. Environments represent stages like development, staging, and production. Each environment contains one or more configs that hold secret values.`,
  instructions: [
    'Use action "list" to see all environments in a project.',
    'Use action "get" to retrieve details of a specific environment.',
    'Use action "create" with a name and slug to add a new environment.',
    'Use action "rename" to update the name or slug of an existing environment.',
    'Use action "delete" to remove an environment and its associated configs.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      project: z.string().describe('Project slug'),
      action: z
        .enum(['list', 'get', 'create', 'rename', 'delete'])
        .describe('Action to perform'),
      environment: z
        .string()
        .optional()
        .describe('Environment slug (required for get, rename, delete)'),
      name: z.string().optional().describe('Environment display name (for create and rename)'),
      slug: z
        .string()
        .optional()
        .describe('Environment slug identifier (for create and rename)')
    })
  )
  .output(
    z.object({
      environments: z.array(environmentSchema).optional().describe('List of environments'),
      environment: environmentSchema.optional().describe('Single environment details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DopplerClient({ token: ctx.auth.token });

    let mapEnv = (e: any) => ({
      environmentId: e.id || e.slug,
      name: e.name,
      project: e.project,
      createdAt: e.created_at,
      initialFetchAt: e.initial_fetch_at
    });

    if (ctx.input.action === 'list') {
      let environments = await client.listEnvironments(ctx.input.project);

      return {
        output: { environments: environments.map(mapEnv) },
        message: `Found **${environments.length}** environments in project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.environment) throw new Error('environment is required for "get" action');

      let env = await client.getEnvironment(ctx.input.project, ctx.input.environment);

      return {
        output: { environment: mapEnv(env) },
        message: `Retrieved environment **${env.name}** from project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for "create" action');
      if (!ctx.input.slug) throw new Error('slug is required for "create" action');

      let env = await client.createEnvironment(
        ctx.input.project,
        ctx.input.name,
        ctx.input.slug
      );

      return {
        output: { environment: mapEnv(env) },
        message: `Created environment **${env.name}** in project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'rename') {
      if (!ctx.input.environment)
        throw new Error('environment is required for "rename" action');

      let env = await client.renameEnvironment(
        ctx.input.project,
        ctx.input.environment,
        ctx.input.name,
        ctx.input.slug
      );

      return {
        output: { environment: mapEnv(env) },
        message: `Renamed environment **${ctx.input.environment}** in project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.environment)
        throw new Error('environment is required for "delete" action');

      await client.deleteEnvironment(ctx.input.project, ctx.input.environment);

      return {
        output: {},
        message: `Deleted environment **${ctx.input.environment}** from project **${ctx.input.project}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
