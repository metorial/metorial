import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List available signature templates. Filter by active templates, archived templates, or template drafts. Returns template details including signer roles and merge fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['templates', 'templates_archived', 'template_drafts'])
        .default('templates')
        .describe('Filter templates by status'),
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Maximum number of templates to return')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            documentHash: z.string().describe('Template hash identifier'),
            title: z.string().optional().describe('Template title'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            signerRoles: z
              .array(
                z.object({
                  name: z.string().optional().describe('Role name'),
                  order: z.number().optional().describe('Signing order')
                })
              )
              .describe('Signer roles defined in the template')
          })
        )
        .describe('List of templates'),
      totalCount: z.number().describe('Number of templates returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let templates = await client.listTemplates(
      ctx.input.type,
      ctx.input.page,
      ctx.input.limit
    );

    let result = (Array.isArray(templates) ? templates : []).map((t: any) => ({
      documentHash: t.document_hash,
      title: t.title || undefined,
      createdAt: t.created ?? undefined,
      signerRoles: (t.signers || []).map((s: any) => ({
        name: s.role || s.name || undefined,
        order: s.order ?? undefined
      }))
    }));

    return {
      output: {
        templates: result,
        totalCount: result.length
      },
      message: `Found ${result.length} template(s).`
    };
  })
  .build();
