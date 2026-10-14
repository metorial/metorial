import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLeadsFromList = SlateTool.create(spec, {
  name: 'Delete Leads from List',
  key: 'delete_leads_from_list',
  description:
    'Remove leads from a HeyReach list by their LinkedIn profile URLs. Returns usernames that were not found in the list.',
  tags: { destructive: true }
})
  .input(
    z.object({
      listId: z.number().int().positive().describe('Lead list ID from list_lead_lists'),
      profileUrls: z
        .array(z.string().min(1))
        .min(1)
        .describe('LinkedIn profile URLs to remove from the list')
    })
  )
  .output(
    z.object({
      listId: z.number(),
      notFoundInList: z
        .array(z.string())
        .describe(
          'Lead usernames that were not found in the list, without the full profile URL'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteLeadsFromList(ctx.input.listId, ctx.input.profileUrls);
    if (!Array.isArray(result?.notFoundInList)) {
      throw createApiServiceError('HeyReach returned an unexpected lead removal response.', {
        reason: 'invalid_delete_leads_response'
      });
    }
    return {
      output: { listId: ctx.input.listId, notFoundInList: result.notFoundInList },
      message: `Processed lead removal from list **${ctx.input.listId}**; **${result.notFoundInList.length}** lead(s) were not found.`
    };
  })
  .build();
