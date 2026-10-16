import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let createCampaignOutputSchema = z.object({
  campaignId: z.number().describe('ID of the created campaign'),
  title: z.string().nullable().describe('Campaign title'),
  type: z.string().nullable().describe('Campaign type'),
  slug: z.string().nullable().describe('URL slug'),
  url: z.string().nullable().describe('Public URL of the campaign'),
  status: z.string().nullable().describe('Campaign status'),
  currency: z.string().nullable().describe('Currency code'),
  createdAt: z.string().nullable().describe('When created')
});

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new fundraising campaign. Supports donation forms (collect), fundraising pages (fundraise), events, and general campaigns. Choose the campaign type that matches the fundraising experience.`,
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
  .output(createCampaignOutputSchema)
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
      output: client.output(createCampaignOutputSchema, {
        campaignId: c.id,
        title: c.title,
        type: c.type,
        slug: c.slug,
        url: c.url,
        status: c.status,
        currency: c.currency,
        createdAt: c.created_at
      }),
      message: client.publicData(
        `Created campaign **${c.title ?? c.id}** (${c.type}) at ${c.url ?? 'N/A'}.`
      )
    };
  })
  .build();
