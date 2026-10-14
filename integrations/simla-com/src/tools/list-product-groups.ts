import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProductGroups = SlateTool.create(spec, {
  name: 'List Product Groups',
  key: 'list_product_groups',
  description:
    'List product catalog groups and their internal and external IDs for filtering products.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      filter: z
        .object({
          ids: z.array(z.number()).optional().describe('Internal product group IDs'),
          name: z.string().optional().describe('Group name'),
          active: z.boolean().optional().describe('Group activity'),
          parentGroupId: z.number().optional().describe('Internal parent group ID'),
          sites: z.array(z.string()).optional().describe('Store symbolic codes')
        })
        .optional(),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1'),
      limit: z.literal([20, 50, 100]).optional().describe('Results per page: 20, 50, or 100')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.number().optional(),
          parentId: z.number().optional(),
          name: z.string().optional(),
          externalId: z.string().optional(),
          active: z.boolean().optional(),
          site: z.string().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });
    let result = await client.getProductGroups(
      ctx.input.filter,
      ctx.input.page,
      ctx.input.limit
    );
    return {
      output: {
        groups: result.productGroup.map(group => ({
          groupId: group.id,
          parentId: group.parentId,
          name: group.name,
          externalId: group.externalId,
          active: group.active,
          site: group.site
        })),
        totalCount: result.pagination.totalCount,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPageCount
      },
      message: `Found **${result.pagination.totalCount}** product groups.`
    };
  })
  .build();
