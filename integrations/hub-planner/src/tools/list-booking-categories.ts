import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBookingCategories = SlateTool.create(spec, {
  name: 'List Booking Categories',
  key: 'list_booking_categories',
  description: `List all booking categories and category groups in Hub Planner. Booking categories are used to classify different types of bookings.
Optionally retrieve a specific category by ID.`,
  constraints: ['Custom category groups require the Booking Category Groups extension.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      categoryId: z
        .string()
        .optional()
        .describe('Specific category ID to retrieve. If omitted, lists all categories.'),
      includeGroups: z.boolean().optional().describe('Also return category groups')
    })
  )
  .output(
    z.object({
      categories: z
        .array(
          z.object({
            categoryId: z.string().describe('Category ID'),
            name: z.string().optional().describe('Category name'),
            gridColor: z.string().optional().describe('Grid color'),
            type: z.string().optional().describe('Category type'),
            categoryGroupId: z.string().optional().describe('Category group ID'),
            categoryGroupName: z.string().optional().describe('Category group name')
          })
        )
        .describe('Booking categories'),
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            name: z.string().optional().describe('Group name')
          })
        )
        .optional()
        .describe('Category groups (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.categoryId) {
      let cat = await client.getBookingCategory(ctx.input.categoryId);
      let groups = ctx.input.includeGroups ? await client.getCategoryGroups() : undefined;
      return {
        output: {
          categories: [
            {
              categoryId: cat._id,
              name: cat.name ?? undefined,
              gridColor: cat.gridColor ?? undefined,
              type: cat.type ?? undefined,
              categoryGroupId: cat.categoryGroupId ?? undefined,
              categoryGroupName: cat.categoryGroupName ?? undefined
            }
          ],
          groups: groups?.map((g: any) => ({ groupId: g._id, name: g.name ?? undefined }))
        },
        message: `Retrieved booking category **${cat.name}**.`
      };
    }

    let categories = await client.getBookingCategories();
    let groups: any[] | undefined;
    if (ctx.input.includeGroups) {
      groups = await client.getCategoryGroups();
    }

    return {
      output: {
        categories: categories.map((c: any) => ({
          categoryId: c._id,
          name: c.name ?? undefined,
          gridColor: c.gridColor ?? undefined,
          type: c.type ?? undefined,
          categoryGroupId: c.categoryGroupId ?? undefined,
          categoryGroupName: c.categoryGroupName ?? undefined
        })),
        groups: groups?.map((g: any) => ({
          groupId: g._id,
          name: g.name ?? undefined
        }))
      },
      message: `Retrieved **${categories.length}** booking categories${groups ? ` and **${groups.length}** category groups` : ''}.`
    };
  })
  .build();
