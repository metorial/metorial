import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let getOffer = SlateTool.create(spec, {
  name: 'Get Job Offer',
  key: 'get_offer',
  description: `Retrieve full details of a job offer or talent pool by ID, including description, requirements, locations, department, tags, status, and pipeline stages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offerId: z.number().describe('ID of the offer to retrieve')
    })
  )
  .output(
    z.object({
      offerId: z.number().describe('Offer ID'),
      title: z.string().describe('Title'),
      kind: z.string().describe('Type: job or talent_pool'),
      status: z.string().describe('Current status'),
      description: z.string().nullable().describe('Job description (HTML)'),
      requirements: z.string().nullable().describe('Job requirements (HTML)'),
      department: z.string().nullable().describe('Department name'),
      locations: z
        .array(
          z.object({
            locationId: z.number().describe('Location ID'),
            fullAddress: z.string().describe('Full address')
          })
        )
        .describe('Office locations'),
      remote: z.boolean().nullable().describe('Whether the position is remote'),
      tags: z.array(z.string()).describe('Tags'),
      slug: z.string().nullable().describe('URL slug'),
      careersUrl: z.string().nullable().describe('Careers site URL'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      publishedAt: z.string().nullable().describe('Publication timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let result = await client.getOffer(ctx.input.offerId);
    let o = result.offer;

    return {
      output: {
        offerId: o.id,
        title: o.title,
        kind: o.kind,
        status: o.status,
        description: o.description || null,
        requirements: o.requirements || null,
        department: o.department || null,
        locations: (o.locations || []).map((l: any) => ({
          locationId: l.id,
          fullAddress: l.full_address || `${l.city || ''}, ${l.country || ''}`.trim()
        })),
        remote: o.remote ?? null,
        tags: (o.tags || []).map((t: any) => (typeof t === 'string' ? t : t.name || t)),
        slug: o.slug || null,
        careersUrl: o.careers_url || null,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        publishedAt: o.published_at || null
      },
      message: `Retrieved ${o.kind === 'talent_pool' ? 'talent pool' : 'job offer'} **${o.title}** (ID: ${o.id}), status: "${o.status}".`
    };
  })
  .build();
