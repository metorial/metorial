import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageFlagSet = SlateTool.create(spec, {
  name: 'Manage Flag Set',
  key: 'manage_flag_set',
  description: `Create, list, get, or delete flag sets. Flag sets are logical groupings of feature flags within a workspace. Use action "create" to create a new flag set, "list" to list all flag sets, "get" to retrieve details, or "delete" to remove one.`,
  instructions: [
    'Flag set names must be 1-50 characters, start with a lowercase letter or digit, and only contain lowercase letters, digits, and underscores.'
  ]
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Falls back to the configured default.'),
      action: z.enum(['create', 'list', 'get', 'delete']).describe('Action to perform.'),
      flagSetName: z.string().optional().describe('Name of the flag set (for create).'),
      flagSetId: z.string().optional().describe('ID of the flag set (for get/delete).'),
      description: z
        .string()
        .optional()
        .describe('Description for the flag set (for create).'),
      limit: z
        .number()
        .optional()
        .describe('Max results to return (for list). Defaults to 50.'),
      after: z.string().optional().describe('Pagination cursor (for list).')
    })
  )
  .output(
    z.object({
      flagSets: z
        .array(
          z.object({
            flagSetId: z.string(),
            flagSetName: z.string(),
            description: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      flagSet: z
        .object({
          flagSetId: z.string(),
          flagSetName: z.string(),
          description: z.string().optional(),
          createdAt: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      nextMarker: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'create': {
        if (!wsId) throw new Error('workspaceId is required to create a flag set.');
        if (!ctx.input.flagSetName)
          throw new Error('flagSetName is required to create a flag set.');
        let fs = await client.createFlagSet({
          name: ctx.input.flagSetName,
          description: ctx.input.description,
          workspace: { id: wsId, type: 'WORKSPACE' }
        });
        return {
          output: {
            flagSet: {
              flagSetId: fs.id,
              flagSetName: fs.name,
              description: fs.description,
              createdAt: fs.createdAt
            }
          },
          message: `Created flag set **${fs.name}**.`
        };
      }

      case 'list': {
        if (!wsId) throw new Error('workspaceId is required to list flag sets.');
        let result = await client.listFlagSets(wsId, {
          limit: ctx.input.limit,
          after: ctx.input.after
        });
        let flagSets = result.data.map(fs => ({
          flagSetId: fs.id,
          flagSetName: fs.name,
          description: fs.description,
          createdAt: fs.createdAt
        }));
        return {
          output: { flagSets, nextMarker: result.nextMarker },
          message: `Found **${flagSets.length}** flag sets.`
        };
      }

      case 'get': {
        if (!ctx.input.flagSetId) throw new Error('flagSetId is required to get a flag set.');
        let fs = await client.getFlagSet(ctx.input.flagSetId);
        return {
          output: {
            flagSet: {
              flagSetId: fs.id,
              flagSetName: fs.name,
              description: fs.description,
              createdAt: fs.createdAt
            }
          },
          message: `Retrieved flag set **${fs.name}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.flagSetId)
          throw new Error('flagSetId is required to delete a flag set.');
        await client.deleteFlagSet(ctx.input.flagSetId);
        return {
          output: { deleted: true },
          message: `Deleted flag set **${ctx.input.flagSetId}**.`
        };
      }
    }
  })
  .build();
