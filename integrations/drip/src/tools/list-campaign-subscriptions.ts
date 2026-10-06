import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdSchema, paging, pagingShape } from '../lib/schemas';
import { spec } from '../spec';

export const listCampaignSubscriptions = SlateTool.create(spec, {
  name: 'List Campaign Subscriptions',
  key: 'list_campaign_subscriptions',
  description:
    'Read a subscriber’s email-series campaign memberships and delivery progress. Call list_accounts to select the account and get_subscriber to discover subscriber IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      subscriberId: z
        .string()
        .describe('Drip subscriber ID from get_subscriber or list_subscribers.'),
      page: z.number().optional().describe('Page number, starting at 1.')
    })
  )
  .output(
    z.object({
      subscriptions: z.array(
        z.object({
          subscriptionId: z.string(),
          campaignId: z.string(),
          status: z.string().optional(),
          isComplete: z.boolean().optional(),
          lap: z.number().optional(),
          lastSentEmailIndex: z.number().optional(),
          lastSentEmailAt: z.string().optional(),
          subscriberId: z.string().optional(),
          accountId: z.string().optional()
        })
      ),
      ...pagingShape
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({
      ...ctx.auth,
      accountId: ctx.input.accountId ?? ctx.config.accountId
    });
    const result = await client.getSubscriberCampaignSubscriptions(
      ctx.input.subscriberId,
      ctx.input.page
    );
    const subscriptions = result.campaign_subscriptions.map((value: Record<string, any>) => ({
      subscriptionId: value.id,
      campaignId: value.campaign_id,
      status: value.status,
      isComplete: value.is_complete,
      lap: value.lap,
      lastSentEmailIndex: value.last_sent_email_index,
      lastSentEmailAt: value.last_sent_email_at,
      subscriberId: value.links?.subscriber,
      accountId: value.links?.account
    }));
    return {
      output: { subscriptions, ...paging(result) },
      message: `Found ${subscriptions.length} campaign subscriptions in this page.`
    };
  })
  .build();
