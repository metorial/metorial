import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid, object } from '../lib/client';
import { spec } from '../spec';

export let enrichCorporateHierarchy = SlateTool.create(spec, {
  name: 'Enrich Corporate Hierarchy',
  key: 'enrich_corporate_hierarchy',
  description: `Retrieve corporate hierarchy and subsidiary relationships for a company. Returns parent companies, ultimate parent, and subsidiary/child companies in the organizational tree. Useful for understanding company structures and identifying related entities.`,
  constraints: [
    'Enrichment can consume credits and counts against request/record limits. Purchased-record and usage history may be retained by ZoomInfo.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.number().optional().describe('ZoomInfo company ID'),
      companyName: z.string().optional().describe('Company name'),
      companyWebsite: z.string().optional().describe('Company website domain'),
      outputFields: z
        .array(z.string())
        .optional()
        .describe(
          'Current GTM hierarchy fields from Lookup Fields; defaults to companyId, familyTree and parentage'
        )
    })
  )
  .output(
    z.object({
      hierarchy: z
        .record(z.string(), z.unknown())
        .describe(
          'Corporate hierarchy data including parent, ultimate parent, and subsidiary relationships'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = Client.fromContext(ctx);

    let result = await client.enrichCorporateHierarchy(ctx.input);

    const value = result.data ?? result.result ?? result;
    const hierarchy = Array.isArray(value)
      ? (() => {
          if (value.length !== 1)
            throw invalid('ZoomInfo did not return exactly one hierarchy response record.');
          return object(value[0]);
        })()
      : object(value);

    return {
      output: { hierarchy },
      message:
        hierarchy.type === 'NoMatch'
          ? 'The company did not match a hierarchy record.'
          : 'Retrieved the company hierarchy response.'
    };
  })
  .build();
