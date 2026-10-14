import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieves a page of available API templates from Signaturely. Templates define document layouts, signer roles, and field placements.
Use this to discover available templates before creating signature requests. The returned template IDs can be used with the Create Signature Request tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of templates per page; defaults to 25'),
      page: z.number().optional().describe('One-based page number; defaults to 1'),
      withTeammateTemplates: z
        .boolean()
        .optional()
        .describe('Include templates belonging to teammates')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier of the template'),
            title: z.string().optional().describe('Display name of the template'),
            roles: z
              .array(
                z.object({
                  signerId: z.string().describe('Template signer identifier'),
                  name: z.string().optional().describe('Template signer name'),
                  role: z
                    .string()
                    .optional()
                    .describe('Role to use with create_signature_request')
                })
              )
              .optional()
              .describe('Signer roles when included by Signaturely')
          })
        )
        .describe('List of available API templates'),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of templates when returned by Signaturely')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Listing available templates');

    let result = await client.listTemplates(ctx.input);

    let templates = result.items.map(tmpl => ({
      templateId: tmpl.id,
      title: tmpl.title ?? tmpl.name ?? undefined,
      roles: tmpl.signers?.map(signer => ({
        signerId: signer.id,
        name: signer.name ?? undefined,
        role: signer.role ?? undefined
      }))
    }));

    return {
      output: {
        templates,
        totalCount: result.totalCount
      },
      message: `Found **${templates.length}** template(s) available for signature requests.`
    };
  })
  .build();
