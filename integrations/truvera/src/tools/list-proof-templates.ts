import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProofTemplates = SlateTool.create(spec, {
  name: 'List Proof Templates',
  key: 'list_proof_templates',
  description: `Retrieve all proof verification templates. Templates define the credential schemas, attributes, and conditions required for verifiable presentations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Number of items to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of items to return (max 64)')
    })
  )
  .output(
    z.object({
      templates: z.array(
        z.object({
          templateId: z.string().describe('Template ID'),
          templateName: z.string().optional().describe('Template name'),
          totalRequests: z
            .number()
            .optional()
            .describe('Number of proof requests created from this template'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
      ),
      total: z.number().optional().describe('Total number of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listProofTemplates({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let list = Array.isArray(result) ? result : result?.list || [];
    let total = result?.total;

    let templates = list.map((t: any) => ({
      templateId: t.id || '',
      templateName: t.name,
      totalRequests: t.totalRequests,
      createdAt: t.created,
      updatedAt: t.updated
    }));

    return {
      output: { templates, total },
      message: `Found **${templates.length}** proof template(s)${total != null ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
