import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `List, fetch, activate, or pause email series campaigns. Also subscribe a person to a campaign or list a campaign's subscribers. Use this to manage drip sequences and their enrollment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'fetch', 'activate', 'pause', 'subscribe', 'list_subscribers'])
        .describe('The action to perform on campaigns.'),
      campaignId: z
        .string()
        .optional()
        .describe(
          'Campaign ID. Required for fetch, activate, pause, subscribe, and list_subscribers.'
        ),
      subscriberEmail: z
        .string()
        .optional()
        .describe('Subscriber email. Required for the subscribe action.'),
      doubleOptIn: z
        .boolean()
        .optional()
        .describe('Whether to require double opt-in when subscribing.'),
      startingEmailIndex: z
        .number()
        .optional()
        .describe('Zero-based index of the email to start the series at.'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields to set when subscribing.'),
      tags: z.array(z.string()).optional().describe('Tags to apply when subscribing.'),
      page: z.number().optional().describe('Page number for list actions.'),
      perPage: z.number().optional().describe('Results per page for list actions.'),
      status: z
        .string()
        .optional()
        .describe('Filter by campaign status (e.g., "active", "paused", "draft").')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.string(),
            name: z.string().optional(),
            status: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional()
        .describe('List of campaigns (for list action).'),
      campaign: z
        .object({
          campaignId: z.string(),
          name: z.string().optional(),
          status: z.string().optional(),
          createdAt: z.string().optional(),
          emailCount: z.number().optional()
        })
        .optional()
        .describe('Campaign details (for fetch action).'),
      subscribers: z
        .array(
          z.object({
            subscriberId: z.string(),
            email: z.string(),
            status: z.string().optional()
          })
        )
        .optional()
        .describe('Campaign subscribers (for list_subscribers action).'),
      subscribed: z.boolean().optional().describe('Whether subscription succeeded.'),
      activated: z.boolean().optional().describe('Whether activation succeeded.'),
      paused: z.boolean().optional().describe('Whether pause succeeded.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    if (ctx.input.action === 'list') {
      let result = await client.listCampaigns({
        status: ctx.input.status,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let campaigns = (result.campaigns ?? []).map((c: any) => ({
        campaignId: c.id ?? '',
        name: c.name,
        status: c.status,
        createdAt: c.created_at
      }));
      return {
        output: { campaigns },
        message: `Found **${campaigns.length}** campaigns.`
      };
    }

    if (!ctx.input.campaignId) {
      throw new Error('campaignId is required for this action.');
    }

    if (ctx.input.action === 'fetch') {
      let result = await client.fetchCampaign(ctx.input.campaignId);
      let c = result.campaigns?.[0] ?? {};
      return {
        output: {
          campaign: {
            campaignId: c.id ?? '',
            name: c.name,
            status: c.status,
            createdAt: c.created_at,
            emailCount: c.email_count
          }
        },
        message: `Fetched campaign **${c.name}** (${c.status}).`
      };
    }

    if (ctx.input.action === 'activate') {
      await client.activateCampaign(ctx.input.campaignId);
      return {
        output: { activated: true },
        message: `Campaign **${ctx.input.campaignId}** activated.`
      };
    }

    if (ctx.input.action === 'pause') {
      await client.pauseCampaign(ctx.input.campaignId);
      return {
        output: { paused: true },
        message: `Campaign **${ctx.input.campaignId}** paused.`
      };
    }

    if (ctx.input.action === 'subscribe') {
      if (!ctx.input.subscriberEmail) {
        throw new Error('subscriberEmail is required for the subscribe action.');
      }
      let sub: Record<string, any> = { email: ctx.input.subscriberEmail };
      if (ctx.input.doubleOptIn !== undefined) sub.double_optin = ctx.input.doubleOptIn;
      if (ctx.input.startingEmailIndex !== undefined)
        sub.starting_email_index = ctx.input.startingEmailIndex;
      if (ctx.input.customFields) sub.custom_fields = ctx.input.customFields;
      if (ctx.input.tags) sub.tags = ctx.input.tags;
      await client.subscribeToCampaign(ctx.input.campaignId, sub);
      return {
        output: { subscribed: true },
        message: `**${ctx.input.subscriberEmail}** subscribed to campaign **${ctx.input.campaignId}**.`
      };
    }

    if (ctx.input.action === 'list_subscribers') {
      let result = await client.listCampaignSubscribers(ctx.input.campaignId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let subscribers = (result.subscribers ?? []).map((s: any) => ({
        subscriberId: s.id ?? '',
        email: s.email ?? '',
        status: s.status
      }));
      return {
        output: { subscribers },
        message: `Found **${subscribers.length}** subscribers on campaign **${ctx.input.campaignId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
