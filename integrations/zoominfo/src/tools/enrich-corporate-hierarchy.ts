import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichCorporateHierarchy = SlateTool.create(spec, {
  name: 'Enrich Corporate Hierarchy',
  key: 'enrich_corporate_hierarchy',
  description: `Retrieve corporate hierarchy and subsidiary relationships for a company. Returns parent companies, ultimate parent, and subsidiary/child companies in the organizational tree. Useful for understanding company structures and identifying related entities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.number().optional().describe('ZoomInfo company ID'),
      companyName: z.string().optional().describe('Company name'),
      companyWebsite: z.string().optional().describe('Company website domain')
    })
  )
  .output(
    z.object({
      hierarchy: z
        .record(z.string(), z.any())
        .describe(
          'Corporate hierarchy data including parent, ultimate parent, and subsidiary relationships'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.enrichCorporateHierarchy(ctx.input);

    let hierarchy = result.data || result.result || result;

    return {
      output: { hierarchy },
      message: `Retrieved corporate hierarchy data successfully.`
    };
  })
  .build();
