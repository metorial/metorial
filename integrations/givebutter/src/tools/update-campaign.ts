import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update an existing campaign's details such as title, description, goal, slug, or end date. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to update'),
      title: z.string().optional().describe('New title'),
      type: z
        .enum(['general', 'collect', 'fundraise', 'event'])
        .optional()
        .describe('New campaign type'),
      subtitle: z.string().optional().describe('New subtitle'),
      description: z.string().optional().describe('New HTML description'),
      slug: z.string().optional().describe('New URL slug'),
      goal: z.number().optional().describe('New fundraising goal'),
      endAt: z.string().optional().describe('New end date (ISO 8601)')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('ID of the updated campaign'),
      title: z.string().nullable().describe('Updated title'),
      type: z.string().nullable().describe('Campaign type'),
      slug: z.string().nullable().describe('URL slug'),
      url: z.string().nullable().describe('Public URL'),
      goal: z.number().nullable().describe('Fundraising goal'),
      status: z.string().nullable().describe('Campaign status'),
      updatedAt: z.string().nullable().describe('When last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateData: Record<string, any> = {};
    if (ctx.input.title !== undefined) updateData.title = ctx.input.title;
    if (ctx.input.type !== undefined) updateData.type = ctx.input.type;
    if (ctx.input.subtitle !== undefined) updateData.subtitle = ctx.input.subtitle;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
    if (ctx.input.slug !== undefined) updateData.slug = ctx.input.slug;
    if (ctx.input.goal !== undefined) updateData.goal = ctx.input.goal;
    if (ctx.input.endAt !== undefined) updateData.end_at = ctx.input.endAt;

    let c = await client.updateCampaign(ctx.input.campaignId, updateData);

    return {
      output: {
        campaignId: c.id,
        title: c.title ?? null,
        type: c.type ?? null,
        slug: c.slug ?? null,
        url: c.url ?? null,
        goal: c.goal ?? null,
        status: c.status ?? null,
        updatedAt: c.updated_at ?? null
      },
      message: `Updated campaign **${c.title ?? c.id}**.`
    };
  })
  .build();
