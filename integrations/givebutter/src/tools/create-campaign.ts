import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new fundraising campaign. Supports donation forms (collect), fundraising pages (fundraise), events, and general campaigns. The campaign type affects pricing tiers.`,
  instructions: [
    'Choose the correct campaign type: "collect" for forms, "fundraise" for pages, "event" for events, "general" for general campaigns.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the campaign'),
      type: z.enum(['general', 'collect', 'fundraise', 'event']).describe('Campaign type'),
      subtitle: z.string().optional().describe('Subtitle of the campaign'),
      description: z.string().optional().describe('HTML description of the campaign'),
      slug: z.string().optional().describe('URL slug for the campaign'),
      goal: z.number().optional().describe('Fundraising goal amount'),
      endAt: z.string().optional().describe('Campaign end date (ISO 8601 format)')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('ID of the created campaign'),
      title: z.string().nullable().describe('Campaign title'),
      type: z.string().nullable().describe('Campaign type'),
      slug: z.string().nullable().describe('URL slug'),
      url: z.string().nullable().describe('Public URL of the campaign'),
      status: z.string().nullable().describe('Campaign status'),
      currency: z.string().nullable().describe('Currency code'),
      createdAt: z.string().nullable().describe('When created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let c = await client.createCampaign({
      title: ctx.input.title,
      type: ctx.input.type,
      subtitle: ctx.input.subtitle,
      description: ctx.input.description,
      slug: ctx.input.slug,
      goal: ctx.input.goal,
      end_at: ctx.input.endAt
    });

    return {
      output: {
        campaignId: c.id,
        title: c.title ?? null,
        type: c.type ?? null,
        slug: c.slug ?? null,
        url: c.url ?? null,
        status: c.status ?? null,
        currency: c.currency ?? null,
        createdAt: c.created_at ?? null
      },
      message: `Created campaign **${c.title ?? c.id}** (${c.type}) at ${c.url ?? 'N/A'}.`
    };
  })
  .build();
