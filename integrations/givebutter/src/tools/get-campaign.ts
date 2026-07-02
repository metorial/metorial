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
  .output(
    z.object({
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
      logo: z.string().nullable().describe('Campaign logo URL'),
      cover: coverSchema.describe('Cover media details'),
      status: z.string().nullable().describe('Campaign status'),
      endAt: z.string().nullable().describe('Campaign end date'),
      event: eventSchema.describe('Event-specific details (for event campaigns)'),
      createdAt: z.string().nullable().describe('When created'),
      updatedAt: z.string().nullable().describe('When last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let c = await client.getCampaign(ctx.input.campaignId);

    let event = c.event
      ? {
          title: c.event.title ?? null,
          type: c.event.type ?? null,
          locationName: c.event.location_name ?? null,
          addressFormatted: c.event.address_formatted ?? null,
          startAt: c.event.start_at ?? null,
          endAt: c.event.end_at ?? null,
          timezone: c.event.timezone ?? null,
          isPrivate: c.event.private ?? null,
          ticketsRequired: c.event.tickets_required ?? null
        }
      : null;

    let cover = c.cover
      ? {
          type: c.cover.type ?? null,
          url: c.cover.url ?? null,
          source: c.cover.source ?? null
        }
      : null;

    return {
      output: {
        campaignId: c.id,
        accountId: c.account_id ?? null,
        type: c.type ?? null,
        title: c.title ?? null,
        subtitle: c.subtitle ?? null,
        description: c.description ?? null,
        slug: c.slug ?? null,
        url: c.url ?? null,
        goal: c.goal ?? null,
        raised: c.raised ?? null,
        donors: c.donors ?? null,
        currency: c.currency ?? null,
        logo: c.logo ?? null,
        cover,
        status: c.status ?? null,
        endAt: c.end_at ?? null,
        event,
        createdAt: c.created_at ?? null,
        updatedAt: c.updated_at ?? null
      },
      message: `Retrieved campaign **${c.title ?? c.id}** (${c.type ?? 'unknown type'}) — raised ${c.raised ?? 0} ${c.currency ?? 'USD'} of ${c.goal ?? 'no'} goal.`
    };
  })
  .build();
