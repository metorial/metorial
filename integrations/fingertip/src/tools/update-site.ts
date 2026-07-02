import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let updateSite = SlateTool.create(spec, {
  name: 'Update Site',
  key: 'update_site',
  description: `Update an existing Fingertip site's properties such as name, slug, description, status, time zone, or business type. Only provided fields will be updated.`
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to update'),
      name: z.string().optional().describe('New name for the site'),
      slug: z.string().optional().describe('New URL-friendly slug'),
      description: z.string().nullable().optional().describe('New description'),
      status: z
        .enum(['EMPTY', 'UNPUBLISHED', 'PREVIEW', 'SOFT_CLAIM', 'ENABLED', 'DEMO', 'ARCHIVED'])
        .optional()
        .describe('New status'),
      businessType: z.string().nullable().optional().describe('New business type'),
      timeZone: z.string().nullable().optional().describe('New time zone'),
      workspaceId: z.string().nullable().optional().describe('New workspace ID'),
      homePageId: z.string().nullable().optional().describe('New home page ID')
    })
  )
  .output(
    z.object({
      siteId: z.string(),
      name: z.string(),
      slug: z.string(),
      description: z.string().nullable(),
      businessType: z.string().nullable(),
      status: z.string(),
      timeZone: z.string().nullable(),
      workspaceId: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let { siteId, ...updateData } = ctx.input;
    let site = await client.updateSite(siteId, updateData);

    return {
      output: {
        siteId: site.id,
        name: site.name,
        slug: site.slug,
        description: site.description,
        businessType: site.businessType,
        status: site.status,
        timeZone: site.timeZone,
        workspaceId: site.workspaceId,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt
      },
      message: `Updated site **${site.name}**.`
    };
  })
  .build();
