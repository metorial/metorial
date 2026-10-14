import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let bulkUpdateContacts = SlateTool.create(spec, {
  name: 'Bulk Update Contacts',
  key: 'bulk_update_contacts',
  description: `Bulk update multiple contacts at once by adding or removing tags or deduplication IDs. Filter contacts by cell numbers or tags, then apply batch updates.`,
  instructions: ['Add operations and remove operations must be made in separate requests.'],
  constraints: ['This endpoint has a stricter rate limit than other contact endpoints.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      filterCells: z.array(z.string()).optional().describe('Filter contacts by cell numbers'),
      filterTagIdsIn: z
        .array(z.string())
        .optional()
        .describe('Filter contacts that have any of these tag IDs'),
      filterTagIdsAll: z
        .array(z.string())
        .optional()
        .describe('Filter contacts that have all of these tag IDs'),
      addTagIds: z
        .array(z.string())
        .optional()
        .describe('Tag IDs to add to matching contacts'),
      removeTagIds: z
        .array(z.string())
        .optional()
        .describe('Tag IDs to remove from matching contacts'),
      addDedupedCampaignIds: z
        .array(z.string())
        .optional()
        .describe('Deduplication campaign IDs to add to matching contacts')
    })
  )
  .output(
    z.object({
      matchedCount: z.number().describe('Number of contacts that matched the filter'),
      modifiedCount: z.number().describe('Number of contacts that were actually modified')
    })
  )
  .handleInvocation(async ctx => {
    let adding = !!(ctx.input.addTagIds?.length || ctx.input.addDedupedCampaignIds?.length);
    let removing = !!ctx.input.removeTagIds?.length;
    if (adding && removing) {
      throw createApiServiceError(
        'Adding and removing tags must be done in separate bulk updates.'
      );
    }
    if (!adding && !removing) {
      throw createApiServiceError('Provide tags or campaign IDs to add, or tags to remove.');
    }
    let client = new Client({ token: ctx.auth.token });

    let find: Record<string, any> = {};
    if (ctx.input.filterCells) find.cell = ctx.input.filterCells;
    if (ctx.input.filterTagIdsIn || ctx.input.filterTagIdsAll) {
      find.tag_ids = {};
      if (ctx.input.filterTagIdsIn) find.tag_ids.$in = ctx.input.filterTagIdsIn;
      if (ctx.input.filterTagIdsAll) find.tag_ids.$all = ctx.input.filterTagIdsAll;
    }

    let update: Record<string, any> = {};

    if (ctx.input.addTagIds?.length || ctx.input.addDedupedCampaignIds?.length) {
      update.$addToSet = {};
      if (ctx.input.addTagIds?.length) {
        update.$addToSet.tag_ids = { $each: ctx.input.addTagIds };
      }
      if (ctx.input.addDedupedCampaignIds?.length) {
        update.$addToSet.deduped_campaign_ids = { $each: ctx.input.addDedupedCampaignIds };
      }
    }

    if (ctx.input.removeTagIds?.length) {
      update.$pull = {
        tag_ids: { $in: ctx.input.removeTagIds }
      };
    }

    let result = await client.bulkUpdateContacts({ find, update });
    let matchedCount = result.data?.matchedCount ?? 0;
    let modifiedCount = result.data?.modifiedCount ?? 0;
    return {
      output: { matchedCount, modifiedCount },
      message: `Bulk update: **${matchedCount}** matched, **${modifiedCount}** modified.`
    };
  })
  .build();
