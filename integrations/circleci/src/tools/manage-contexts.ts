import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContexts = SlateTool.create(spec, {
  name: 'Manage Contexts',
  key: 'manage_contexts',
  description: `Create, list, get, or delete CircleCI contexts for an organization. Contexts provide a way to secure and share environment variables across projects.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('Action to perform'),
      ownerId: z
        .string()
        .optional()
        .describe('Organization or account UUID (required for list and create)'),
      ownerType: z
        .enum(['account', 'organization'])
        .optional()
        .describe('Owner type (required for list and create)'),
      contextId: z.string().optional().describe('Context UUID (required for get and delete)'),
      contextName: z
        .string()
        .optional()
        .describe('Name for the new context (required for create)')
    })
  )
  .output(
    z.object({
      contexts: z
        .array(
          z.object({
            contextId: z.string(),
            name: z.string(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      context: z
        .object({
          contextId: z.string(),
          name: z.string(),
          createdAt: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      if (!ctx.input.ownerId || !ctx.input.ownerType) {
        throw new Error('ownerId and ownerType are required for listing contexts.');
      }
      let result = await client.listContexts(ctx.input.ownerId, ctx.input.ownerType);
      let contexts = (result.items || []).map((c: any) => ({
        contextId: c.id,
        name: c.name,
        createdAt: c.created_at
      }));
      return {
        output: { contexts },
        message: `Found **${contexts.length}** context(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.contextId) {
        throw new Error('contextId is required to get a context.');
      }
      let context = await client.getContext(ctx.input.contextId);
      return {
        output: {
          context: {
            contextId: context.id,
            name: context.name,
            createdAt: context.created_at
          }
        },
        message: `Context **${context.name}** (ID: ${context.id}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.contextName || !ctx.input.ownerId || !ctx.input.ownerType) {
        throw new Error(
          'contextName, ownerId, and ownerType are required to create a context.'
        );
      }
      let context = await client.createContext(ctx.input.contextName, {
        id: ctx.input.ownerId,
        type: ctx.input.ownerType
      });
      return {
        output: {
          context: {
            contextId: context.id,
            name: context.name,
            createdAt: context.created_at
          }
        },
        message: `Context **${context.name}** created successfully.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.contextId) {
        throw new Error('contextId is required to delete a context.');
      }
      await client.deleteContext(ctx.input.contextId);
      return {
        output: { deleted: true },
        message: `Context \`${ctx.input.contextId}\` deleted.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
