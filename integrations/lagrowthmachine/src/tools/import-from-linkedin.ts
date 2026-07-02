import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let importFromLinkedIn = SlateTool.create(spec, {
  name: 'Import Leads from LinkedIn',
  key: 'import_from_linkedin',
  description: `Import leads from LinkedIn into a La Growth Machine audience. Supports regular LinkedIn search URLs, Sales Navigator search URLs, and LinkedIn post URLs. Extracts contact information from the provided LinkedIn source.`,
  instructions: [
    'The target audience must already exist in La Growth Machine.',
    'For LinkedIn post URLs, you can filter by engagement type (likes or comments).'
  ]
})
  .input(
    z.object({
      audience: z.string().describe('Name of the LGM audience to import leads into'),
      identityId: z.string().describe('ID of the connected identity to use for the import'),
      linkedinUrl: z
        .string()
        .describe('LinkedIn search URL, Sales Navigator URL, or LinkedIn post URL'),
      autoImport: z.boolean().optional().describe('Automatically import matching leads'),
      excludeContactedLeads: z
        .boolean()
        .optional()
        .describe('Skip leads that have been previously contacted'),
      linkedinPostCategory: z
        .string()
        .optional()
        .describe('For post URLs: filter by engagement type (e.g., "like", "comment")')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Import operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.importFromLinkedIn({
      audience: ctx.input.audience,
      identityId: ctx.input.identityId,
      linkedinUrl: ctx.input.linkedinUrl,
      autoImport: ctx.input.autoImport,
      excludeContactedLeads: ctx.input.excludeContactedLeads,
      linkedinPostCategory: ctx.input.linkedinPostCategory
    });

    return {
      output: { result },
      message: `LinkedIn import initiated into audience **${ctx.input.audience}**.`
    };
  })
  .build();
