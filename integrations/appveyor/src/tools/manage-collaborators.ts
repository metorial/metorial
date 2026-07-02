import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let manageCollaborators = SlateTool.create(spec, {
  name: 'Manage Collaborators',
  key: 'manage_collaborators',
  description: `List, get, add, update, or remove collaborators on the AppVeyor account. Collaborators are existing AppVeyor users from other accounts who are granted a role in your account.`,
  instructions: [
    'For **list**: no additional parameters needed.',
    'For **get**: provide userId.',
    'For **add**: provide email and roleId.',
    'For **update**: provide userId and roleId.',
    'For **remove**: provide userId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'add', 'update', 'remove'])
        .describe('Operation to perform'),
      userId: z
        .number()
        .optional()
        .describe('Collaborator user ID (required for get, update, remove)'),
      email: z.string().optional().describe('Collaborator email (required for add)'),
      roleId: z.number().optional().describe('Role ID to assign (required for add, update)')
    })
  )
  .output(
    z.object({
      collaborators: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of collaborators'),
      collaborator: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Collaborator details'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    switch (ctx.input.action) {
      case 'list': {
        let collaborators = await client.listCollaborators();
        return {
          output: { collaborators, success: true },
          message: `Found **${collaborators.length}** collaborator(s).`
        };
      }

      case 'get': {
        if (ctx.input.userId === undefined) {
          throw new Error('userId is required for get');
        }
        let collaborator = await client.getCollaborator(ctx.input.userId);
        return {
          output: { collaborator, success: true },
          message: `Retrieved collaborator **${ctx.input.userId}**.`
        };
      }

      case 'add': {
        if (!ctx.input.email || ctx.input.roleId === undefined) {
          throw new Error('email and roleId are required for add');
        }
        await client.addCollaborator({
          email: ctx.input.email,
          roleId: ctx.input.roleId
        });
        return {
          output: { success: true },
          message: `Added collaborator **${ctx.input.email}**.`
        };
      }

      case 'update': {
        if (ctx.input.userId === undefined || ctx.input.roleId === undefined) {
          throw new Error('userId and roleId are required for update');
        }
        await client.updateCollaborator({
          userId: ctx.input.userId,
          roleId: ctx.input.roleId
        });
        return {
          output: { success: true },
          message: `Updated collaborator **${ctx.input.userId}** role.`
        };
      }

      case 'remove': {
        if (ctx.input.userId === undefined) {
          throw new Error('userId is required for remove');
        }
        await client.deleteCollaborator(ctx.input.userId);
        return {
          output: { success: true },
          message: `Removed collaborator **${ctx.input.userId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
