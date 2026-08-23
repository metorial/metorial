import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { circleCiValidationError } from '../lib/validation';
import { spec } from '../spec';

export let manageContexts = SlateTool.create(spec, {
  name: 'Manage Contexts',
  key: 'manage_contexts',
  description: `Create, list, get, or delete CircleCI contexts for an organization. Contexts provide a way to secure and share environment variables across projects.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('Action to perform'),
      ownerId: z
        .string()
        .optional()
        .describe('Organization or account UUID (use ownerId or ownerSlug for list/create)'),
      ownerSlug: z
        .string()
        .optional()
        .describe('Organization slug (use ownerId or ownerSlug for list/create; cloud only)'),
      ownerType: z
        .enum(['account', 'organization'])
        .optional()
        .describe('Owner type; defaults to organization'),
      contextId: z.string().optional().describe('Context UUID (required for get and delete)'),
      contextName: z
        .string()
        .optional()
        .describe('Name for the new context (required for create)'),
      pageToken: z.string().optional().describe('Pagination token for the list action')
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
      deleted: z.boolean().optional(),
      nextPageToken: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.pageToken && ctx.input.action !== 'list') {
      throw circleCiValidationError('pageToken is only supported for the list action.');
    }
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      if (
        (!ctx.input.ownerId && !ctx.input.ownerSlug) ||
        (ctx.input.ownerId && ctx.input.ownerSlug)
      ) {
        throw circleCiValidationError(
          'Provide exactly one of ownerId or ownerSlug for listing contexts.'
        );
      }
      let result = await client.listContexts({
        ownerId: ctx.input.ownerId,
        ownerSlug: ctx.input.ownerSlug,
        ownerType: ctx.input.ownerType,
        pageToken: ctx.input.pageToken
      });
      let contexts = (result.items || []).map((c: any) => ({
        contextId: c.id,
        name: c.name,
        createdAt: c.created_at
      }));
      return {
        output: { contexts, nextPageToken: result.next_page_token },
        message: `Found **${contexts.length}** context(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.contextId) {
        throw circleCiValidationError('contextId is required to get a context.');
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
      if (!ctx.input.contextName) {
        throw circleCiValidationError('contextName is required to create a context.');
      }
      if (
        (!ctx.input.ownerId && !ctx.input.ownerSlug) ||
        (ctx.input.ownerId && ctx.input.ownerSlug)
      ) {
        throw circleCiValidationError(
          'Provide exactly one of ownerId or ownerSlug to create a context.'
        );
      }
      if (ctx.input.ownerSlug && ctx.input.ownerType === 'account') {
        throw circleCiValidationError(
          'ownerSlug can only identify an organization context owner.'
        );
      }
      let owner = ctx.input.ownerId
        ? { id: ctx.input.ownerId, type: ctx.input.ownerType ?? 'organization' }
        : { slug: ctx.input.ownerSlug!, type: 'organization' as const };
      let context = await client.createContext(ctx.input.contextName, owner);
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
        throw circleCiValidationError('contextId is required to delete a context.');
      }
      await client.deleteContext(ctx.input.contextId);
      return {
        output: { deleted: true },
        message: `Context \`${ctx.input.contextId}\` deleted.`
      };
    }

    throw circleCiValidationError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
