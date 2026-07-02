import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let updateOffer = SlateTool.create(spec, {
  name: 'Update Job Offer',
  key: 'update_offer',
  description: `Update an existing job offer or talent pool. Change its title, description, requirements, locations, department, remote status, or publication status. Use the **status** field to publish, unpublish, close, or archive an offer.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      offerId: z.number().describe('ID of the offer to update'),
      title: z.string().optional().describe('Updated title'),
      description: z.string().optional().describe('Updated description (HTML supported)'),
      requirements: z.string().optional().describe('Updated requirements (HTML supported)'),
      departmentId: z.number().optional().describe('Updated department ID'),
      locationIds: z.array(z.number()).optional().describe('Updated location IDs'),
      remote: z.boolean().optional().describe('Whether the position is remote'),
      status: z
        .enum(['draft', 'published', 'internal', 'closed', 'archived'])
        .optional()
        .describe('Updated status')
    })
  )
  .output(
    z.object({
      offerId: z.number().describe('Offer ID'),
      title: z.string().describe('Updated title'),
      status: z.string().describe('Current status'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let result = await client.updateOffer(ctx.input.offerId, {
      title: ctx.input.title,
      description: ctx.input.description,
      requirements: ctx.input.requirements,
      departmentId: ctx.input.departmentId,
      locationIds: ctx.input.locationIds,
      remote: ctx.input.remote,
      status: ctx.input.status
    });

    let o = result.offer;

    return {
      output: {
        offerId: o.id,
        title: o.title,
        status: o.status,
        updatedAt: o.updated_at
      },
      message: `Updated offer **${o.title}** (ID: ${o.id}), status: "${o.status}".`
    };
  })
  .build();
