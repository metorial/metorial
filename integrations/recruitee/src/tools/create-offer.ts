import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let createOffer = SlateTool.create(spec, {
  name: 'Create Job Offer',
  key: 'create_offer',
  description: `Create a new job offer or talent pool in Recruitee. Set the **kind** to "talent_pool" to create a talent pool instead of a job. New offers default to draft. A requested status uses a separate transition followed by a readback; a failed transition can leave the created offer in its actual earlier status. Publishing exposes it on the careers site.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Job title or talent pool name'),
      kind: z
        .enum(['job', 'talent_pool'])
        .optional()
        .describe('Type: "job" (default) or "talent_pool"'),
      description: z.string().optional().describe('Job description (HTML supported)'),
      requirements: z.string().optional().describe('Job requirements (HTML supported)'),
      departmentId: z.number().optional().describe('Department ID to assign the offer to'),
      locationIds: z.array(z.number()).optional().describe('Office location IDs'),
      remote: z.boolean().optional().describe('Whether the position is remote'),
      status: z
        .enum(['draft', 'published', 'internal', 'closed', 'archived'])
        .optional()
        .describe('Initial status. Default is "draft"')
    })
  )
  .output(
    z.object({
      offerId: z.number().describe('ID of the created offer'),
      title: z.string().describe('Offer title'),
      kind: z.string().optional().describe('Offer type when returned'),
      status: z.string().describe('Offer status'),
      createdAt: z.string().optional().describe('Creation timestamp when returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = await RecruiteeClient.forContext(ctx);

    let result = await client.createOffer({
      title: ctx.input.title,
      kind: ctx.input.kind,
      description: ctx.input.description,
      requirements: ctx.input.requirements,
      departmentId: ctx.input.departmentId,
      locationIds: ctx.input.locationIds,
      remote: ctx.input.remote,
      status: ctx.input.status
    });

    let offer = result.offer;

    return {
      output: {
        offerId: offer.id,
        title: offer.title,
        kind: offer.kind,
        status: offer.status,
        createdAt: offer.created_at
      },
      message: `Created ${offer.kind === 'talent_pool' ? 'talent pool' : 'job offer'} **${offer.title}** (ID: ${offer.id}) with status "${offer.status}".`
    };
  })
  .build();
