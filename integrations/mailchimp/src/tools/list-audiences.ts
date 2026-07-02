import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { spec } from '../spec';

export let listAudiencesTool = SlateTool.create(spec, {
  name: 'List Audiences',
  key: 'list_audiences',
  description: `Retrieve all audiences (lists) in the Mailchimp account. Returns audience names, IDs, member counts, and configuration details. Use this to discover available audiences before managing members or campaigns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      count: z
        .number()
        .optional()
        .describe('Number of audiences to return (default 100, max 1000)'),
      offset: z.number().optional().describe('Number of audiences to skip')
    })
  )
  .output(
    z.object({
      audiences: z.array(
        z.object({
          listId: z.string(),
          name: z.string(),
          memberCount: z.number(),
          unsubscribeCount: z.number(),
          cleanedCount: z.number(),
          campaignLastSent: z.string().optional(),
          dateCreated: z.string(),
          listRating: z.number().optional(),
          defaultFromName: z.string().optional(),
          defaultFromEmail: z.string().optional(),
          defaultSubject: z.string().optional()
        })
      ),
      totalItems: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let result = await client.getLists({ count: ctx.input.count, offset: ctx.input.offset });

    let audiences = (result.lists ?? []).map((list: any) => ({
      listId: list.id,
      name: list.name,
      memberCount: list.stats?.member_count ?? 0,
      unsubscribeCount: list.stats?.unsubscribe_count ?? 0,
      cleanedCount: list.stats?.cleaned_count ?? 0,
      campaignLastSent: list.stats?.campaign_last_sent || undefined,
      dateCreated: list.date_created,
      listRating: list.list_rating,
      defaultFromName: list.campaign_defaults?.from_name,
      defaultFromEmail: list.campaign_defaults?.from_email,
      defaultSubject: list.campaign_defaults?.subject
    }));

    return {
      output: {
        audiences,
        totalItems: result.total_items ?? 0
      },
      message: `Found **${audiences.length}** audience(s) out of ${result.total_items ?? 0} total.`
    };
  })
  .build();
