import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let suppressionOutputSchema = z.object({
  suppressionUuid: z.string().describe('Unique identifier of the suppression'),
  email: z.string().describe('Suppressed email address'),
  reason: z.string().describe('Reason for suppression (hard_bounce, spam_complaint, manual)'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageSuppression = SlateTool.create(spec, {
  name: 'Manage Suppression',
  key: 'manage_suppression',
  description: `List, add, or remove email suppressions. Suppressed addresses are prevented from receiving any emails. Addresses are automatically suppressed on hard bounces or spam complaints, and can also be manually added.`,
  constraints: ['Spam complaint suppressions cannot be deleted on the hosted service.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('The operation to perform'),
      email: z
        .string()
        .optional()
        .describe('Email address (required for create; can be used for get/delete)'),
      suppressionUuid: z
        .string()
        .optional()
        .describe('UUID of the suppression (can be used for get/delete)'),
      reason: z
        .enum(['hard_bounce', 'spam_complaint', 'manual'])
        .optional()
        .describe(
          'Filter by reason (list only) or set reason (create only, defaults to "manual")'
        ),
      search: z.string().optional().describe('Search term to filter suppressions (list only)'),
      page: z.number().optional().describe('Page number for pagination (list only)')
    })
  )
  .output(
    z.object({
      suppression: suppressionOutputSchema
        .nullable()
        .describe('Single suppression (for get, create)'),
      suppressions: z
        .array(suppressionOutputSchema)
        .nullable()
        .describe('List of suppressions (for list action)'),
      totalCount: z.number().nullable().describe('Total count (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'list') {
      let result = await client.listSuppressions({
        search: ctx.input.search,
        reason: ctx.input.reason,
        page: ctx.input.page
      });
      let suppressions = (result.data || []).map(mapSuppression);
      return {
        output: {
          suppression: null,
          suppressions,
          totalCount: result.meta?.total ?? suppressions.length
        },
        message: `Found **${suppressions.length}** suppression(s).`
      };
    }

    if (ctx.input.action === 'get') {
      let identifier = ctx.input.suppressionUuid || ctx.input.email;
      if (!identifier) throw new Error('email or suppressionUuid is required for get');
      let result = await client.getSuppression(identifier);
      return {
        output: { suppression: mapSuppression(result), suppressions: null, totalCount: null },
        message: `Retrieved suppression for **${result.email}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let identifier = ctx.input.suppressionUuid || ctx.input.email;
      if (!identifier) throw new Error('email or suppressionUuid is required for delete');
      await client.deleteSuppression(identifier);
      return {
        output: { suppression: null, suppressions: null, totalCount: null },
        message: `Suppression **${identifier}** has been removed.`
      };
    }

    // create
    if (!ctx.input.email) throw new Error('email is required for create');
    let result = await client.createSuppression({
      email: ctx.input.email,
      reason: ctx.input.reason
    });

    return {
      output: { suppression: mapSuppression(result), suppressions: null, totalCount: null },
      message: `Email **${result.email}** has been suppressed.`
    };
  });

let mapSuppression = (s: any) => ({
  suppressionUuid: s.uuid,
  email: s.email,
  reason: s.reason ?? 'manual',
  createdAt: s.created_at,
  updatedAt: s.updated_at
});
