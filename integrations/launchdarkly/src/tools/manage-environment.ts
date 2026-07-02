import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let manageEnvironment = SlateTool.create(spec, {
  name: 'Manage Environment',
  key: 'manage_environment',
  description: `Create, update, or delete an environment within a LaunchDarkly project. Environments hold separate flag configurations, SDK keys, and context data.`,
  instructions: [
    'To create, provide action "create" with environmentKey, name, and color.',
    'To update, provide action "update" with fields to change.',
    'To delete, provide action "delete" with the environmentKey.',
    'Color must be a 6-character hex code without the # prefix (e.g., "417505").'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      projectKey: z.string().optional().describe('Project key. Falls back to config default.'),
      environmentKey: z.string().describe('Environment key'),
      name: z.string().optional().describe('Environment name (required for create)'),
      color: z
        .string()
        .optional()
        .describe('Environment color hex code, e.g. "417505" (required for create)'),
      tags: z.array(z.string()).optional().describe('Environment tags'),
      requireComments: z.boolean().optional().describe('Require comments for flag changes'),
      confirmChanges: z.boolean().optional().describe('Require confirmation for flag changes'),
      secureMode: z.boolean().optional().describe('Enable secure mode for this environment'),
      defaultTrackEvents: z.boolean().optional().describe('Track events by default')
    })
  )
  .output(
    z.object({
      environmentKey: z.string().describe('Environment key'),
      name: z.string().optional().describe('Environment name'),
      color: z.string().optional().describe('Environment color'),
      deleted: z.boolean().optional().describe('Whether the environment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = ctx.input.projectKey ?? ctx.config.projectKey;
    if (!projectKey) {
      throw new Error(
        'projectKey is required. Provide it in the input or set a default in config.'
      );
    }

    let client = new LaunchDarklyClient(ctx.auth.token);
    let { action, environmentKey } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.color) {
        throw new Error('name and color are required when creating an environment.');
      }
      let env = await client.createEnvironment(projectKey, {
        key: environmentKey,
        name: ctx.input.name,
        color: ctx.input.color,
        tags: ctx.input.tags,
        secureMode: ctx.input.secureMode,
        defaultTrackEvents: ctx.input.defaultTrackEvents,
        requireComments: ctx.input.requireComments,
        confirmChanges: ctx.input.confirmChanges
      });

      return {
        output: {
          environmentKey: env.key,
          name: env.name,
          color: env.color
        },
        message: `Created environment **${env.name}** (\`${env.key}\`) in project \`${projectKey}\`.`
      };
    }

    if (action === 'update') {
      let patches: Array<{ op: string; path: string; value: any }> = [];
      if (ctx.input.name !== undefined)
        patches.push({ op: 'replace', path: '/name', value: ctx.input.name });
      if (ctx.input.color !== undefined)
        patches.push({ op: 'replace', path: '/color', value: ctx.input.color });
      if (ctx.input.requireComments !== undefined)
        patches.push({
          op: 'replace',
          path: '/requireComments',
          value: ctx.input.requireComments
        });
      if (ctx.input.confirmChanges !== undefined)
        patches.push({
          op: 'replace',
          path: '/confirmChanges',
          value: ctx.input.confirmChanges
        });
      if (ctx.input.secureMode !== undefined)
        patches.push({ op: 'replace', path: '/secureMode', value: ctx.input.secureMode });
      if (ctx.input.defaultTrackEvents !== undefined)
        patches.push({
          op: 'replace',
          path: '/defaultTrackEvents',
          value: ctx.input.defaultTrackEvents
        });
      if (ctx.input.tags !== undefined)
        patches.push({ op: 'replace', path: '/tags', value: ctx.input.tags });

      if (patches.length === 0) {
        throw new Error('No fields to update.');
      }

      let env = await client.updateEnvironment(projectKey, environmentKey, patches);

      return {
        output: {
          environmentKey: env.key,
          name: env.name,
          color: env.color
        },
        message: `Updated environment **${env.name}** (\`${env.key}\`) in project \`${projectKey}\`.`
      };
    }

    // delete
    await client.deleteEnvironment(projectKey, environmentKey);
    return {
      output: {
        environmentKey,
        deleted: true
      },
      message: `Deleted environment \`${environmentKey}\` from project \`${projectKey}\`.`
    };
  })
  .build();
