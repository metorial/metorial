import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let coverSchema = z
  .object({
    type: z.string().nullable().describe('Cover media type'),
    url: z.string().nullable().describe('Cover media URL'),
    source: z.string().nullable().describe('Cover media source')
  })
  .nullable();

let eventSchema = z
  .object({
    title: z.string().nullable().describe('Event title'),
    type: z.string().nullable().describe('Event type'),
    locationName: z.string().nullable().describe('Event location name'),
    addressFormatted: z.string().nullable().describe('Formatted event address'),
    startAt: z.string().nullable().describe('Event start time'),
    endAt: z.string().nullable().describe('Event end time'),
    timezone: z.string().nullable().describe('Event timezone'),
    isPrivate: z.boolean().nullable().describe('Whether the event is private'),
    ticketsRequired: z.boolean().nullable().describe('Whether tickets are required')
  })
  .nullable();

let getCampaignOutputSchema = z.object({
  campaignId: z.number().describe('Unique identifier of the campaign'),
  accountId: z.string().nullable().describe('Account ID'),
  type: z.string().nullable().describe('Campaign type'),
  title: z.string().nullable().describe('Campaign title'),
  subtitle: z.string().nullable().describe('Campaign subtitle'),
  description: z.string().nullable().describe('HTML description of the campaign'),
  slug: z.string().nullable().describe('URL slug'),
  url: z.string().nullable().describe('Public URL'),
  goal: z.number().nullable().describe('Fundraising goal amount'),
  raised: z.number().nullable().describe('Total amount raised'),
  donors: z.number().nullable().describe('Number of donors'),
  currency: z.string().nullable().describe('Currency code'),
  logo: z.string().nullable().optional().describe('Campaign logo URL'),
  cover: coverSchema.describe('Cover media details'),
  status: z.string().nullable().describe('Campaign status'),
  endAt: z.string().nullable().describe('Campaign end date'),
  event: eventSchema.optional().describe('Event-specific details (for event campaigns)'),
  createdAt: z.string().nullable().describe('When created'),
  updatedAt: z.string().nullable().describe('When last updated'),
  raw: z
    .record(z.string(), z.unknown())
    .describe('Original campaign data returned by Givebutter')
});

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve detailed information about a specific campaign including its fundraising progress, event details, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to retrieve')
    })
  )
  .output(getCampaignOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let c = await client.getCampaign(ctx.input.campaignId);

    let event = c.event
      ? {
          title: c.event.title,
          type: c.event.type,
          locationName: c.event.location_name,
          addressFormatted: c.event.address_formatted,
          startAt: c.event.start_at,
          endAt: c.event.end_at,
          timezone: c.event.timezone,
          isPrivate: c.event.private,
          ticketsRequired: c.event.tickets_required
        }
      : c.event;

    let cover = c.cover
      ? {
          type: c.cover.type,
          url: c.cover.url,
          source: c.cover.source
        }
      : c.cover;

    return {
      output: client.output(getCampaignOutputSchema, {
        campaignId: c.id,
        accountId: c.account_id,
        type: c.type,
        title: c.title,
        subtitle: c.subtitle,
        description: c.description,
        slug: c.slug,
        url: c.url,
        goal: c.goal,
        raised: c.raised,
        donors: c.donors,
        currency: c.currency,
        logo: c.logo,
        cover,
        status: c.status,
        endAt: c.end_at,
        event,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        raw: client.rawData(c)
      }),
      message: client.publicData(`Retrieved campaign **${c.id}**.`)
    };
  })
  .build();
