import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let campaignEvents = SlateTrigger.create(spec, {
  name: 'Campaign Events',
  key: 'campaign_events',
  description:
    'Triggered when a campaign is created or updated. Configure the webhook in Givebutter Settings > Developers > Webhooks.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of campaign event'),
      campaignId: z.number().describe('Campaign ID'),
      code: z.string().nullable().describe('Campaign code'),
      accountId: z.string().nullable().describe('Account ID'),
      type: z.string().nullable().describe('Campaign type'),
      title: z.string().nullable().describe('Campaign title'),
      subtitle: z.string().nullable().describe('Campaign subtitle'),
      description: z.string().nullable().describe('Campaign description'),
      slug: z.string().nullable().describe('URL slug'),
      url: z.string().nullable().describe('Public URL'),
      goal: z.number().nullable().describe('Fundraising goal'),
      raised: z.number().nullable().describe('Amount raised'),
      donors: z.number().nullable().describe('Number of donors'),
      currency: z.string().nullable().describe('Currency code'),
      status: z.string().nullable().describe('Campaign status'),
      timezone: z.string().nullable().describe('Timezone'),
      endAt: z.string().nullable().describe('End date'),
      createdAt: z.string().nullable().describe('When created'),
      updatedAt: z.string().nullable().describe('When updated')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Campaign ID'),
      code: z.string().nullable().describe('Campaign code'),
      accountId: z.string().nullable().describe('Account ID'),
      type: z
        .string()
        .nullable()
        .describe('Campaign type: general, collect, fundraise, or event'),
      title: z.string().nullable().describe('Campaign title'),
      subtitle: z.string().nullable().describe('Campaign subtitle'),
      slug: z.string().nullable().describe('URL slug'),
      url: z.string().nullable().describe('Public URL'),
      goal: z.number().nullable().describe('Fundraising goal'),
      raised: z.number().nullable().describe('Amount raised'),
      donors: z.number().nullable().describe('Number of donors'),
      currency: z.string().nullable().describe('Currency code'),
      status: z.string().nullable().describe('Campaign status'),
      timezone: z.string().nullable().describe('Timezone'),
      endAt: z.string().nullable().describe('End date'),
      createdAt: z.string().nullable().describe('Created timestamp'),
      updatedAt: z.string().nullable().describe('Updated timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event as string;
      let data = body.data;

      if (!eventType?.startsWith('campaign.')) {
        return { inputs: [] };
      }

      let type =
        eventType === 'campaign.created' ? ('created' as const) : ('updated' as const);

      return {
        inputs: [
          {
            eventType: type,
            campaignId: data.id,
            code: data.code ?? null,
            accountId: data.account_id ?? null,
            type: data.type ?? null,
            title: data.title ?? null,
            subtitle: data.subtitle ?? null,
            description: data.description ?? null,
            slug: data.slug ?? null,
            url: data.url ?? null,
            goal: data.goal ?? null,
            raised: data.raised ?? null,
            donors: data.donors ?? null,
            currency: data.currency ?? null,
            status: data.status ?? null,
            timezone: data.timezone ?? null,
            endAt: data.end_at ?? null,
            createdAt: data.created_at ?? null,
            updatedAt: data.updated_at ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `campaign.${ctx.input.eventType}`,
        id: `campaign-${ctx.input.campaignId}-${ctx.input.eventType}-${ctx.input.updatedAt ?? ctx.input.createdAt ?? Date.now()}`,
        output: {
          campaignId: ctx.input.campaignId,
          code: ctx.input.code,
          accountId: ctx.input.accountId,
          type: ctx.input.type,
          title: ctx.input.title,
          subtitle: ctx.input.subtitle,
          slug: ctx.input.slug,
          url: ctx.input.url,
          goal: ctx.input.goal,
          raised: ctx.input.raised,
          donors: ctx.input.donors,
          currency: ctx.input.currency,
          status: ctx.input.status,
          timezone: ctx.input.timezone,
          endAt: ctx.input.endAt,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
