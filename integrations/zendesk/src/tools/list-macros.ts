import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

let macroSchema = z.object({
  macroId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  active: z.boolean(),
  default: z.boolean(),
  position: z.number().nullable(),
  actions: z.array(z.any()),
  restriction: z.any().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable()
});

let mapMacro = (macro: any) => ({
  macroId: String(macro.id),
  title: macro.title,
  description: macro.description || null,
  active: macro.active ?? false,
  default: macro.default ?? false,
  position: macro.position ?? null,
  actions: macro.actions || [],
  restriction: macro.restriction || null,
  createdAt: macro.created_at || null,
  updatedAt: macro.updated_at || null
});

export let listMacros = SlateTool.create(spec, {
  name: 'List Macros',
  key: 'list_macros',
  description: `Lists shared and personal Zendesk macros available to the current user. Macros define reusable ticket actions agents can apply in Zendesk.`,
  constraints: ['Returns up to 100 macros per page'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      active: z.boolean().optional().describe('Filter by active or inactive macros'),
      access: z
        .enum(['personal', 'agents', 'shared', 'account'])
        .optional()
        .describe('Filter macros by access type'),
      categoryId: z.string().optional().describe('Filter macros by category ID'),
      groupId: z.string().optional().describe('Filter macros by group ID'),
      onlyViewable: z
        .boolean()
        .optional()
        .describe('Return only macros that can be applied to tickets'),
      page: z.number().optional().default(1).describe('Page number for offset pagination'),
      perPage: z.number().optional().default(25).describe('Results per page (max 100)'),
      sortBy: z
        .enum([
          'alphabetical',
          'created_at',
          'updated_at',
          'usage_1h',
          'usage_24h',
          'usage_7d',
          'usage_30d'
        ])
        .optional()
        .describe('Field to sort macros by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      macros: z.array(macroSchema),
      count: z.number(),
      nextPage: z.string().nullable(),
      previousPage: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let data = await client.listMacros({
      active: ctx.input.active,
      access: ctx.input.access,
      categoryId: ctx.input.categoryId,
      groupId: ctx.input.groupId,
      onlyViewable: ctx.input.onlyViewable,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder
    });

    let macros = (data.macros || []).map(mapMacro);

    return {
      output: {
        macros,
        count: data.count || macros.length,
        nextPage: data.next_page || null,
        previousPage: data.previous_page || null
      },
      message: `Found ${data.count || macros.length} macro(s), showing ${macros.length}.`
    };
  })
  .build();
