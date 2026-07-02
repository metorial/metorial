import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let getSite = SlateTool.create(spec, {
  name: 'Get Site',
  key: 'get_site',
  description: `Retrieve detailed information about a specific Fingertip site by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to retrieve')
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
      locationId: z.string().nullable(),
      homePageId: z.string().nullable(),
      timeZone: z.string().nullable(),
      workspaceId: z.string().nullable(),
      overridePlan: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let site = await client.getSite(ctx.input.siteId);

    return {
      output: {
        siteId: site.id,
        name: site.name,
        slug: site.slug,
        description: site.description,
        businessType: site.businessType,
        status: site.status,
        locationId: site.locationId,
        homePageId: site.homePageId,
        timeZone: site.timeZone,
        workspaceId: site.workspaceId,
        overridePlan: site.overridePlan,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt
      },
      message: `Retrieved site **${site.name}** (${site.slug}).`
    };
  })
  .build();
