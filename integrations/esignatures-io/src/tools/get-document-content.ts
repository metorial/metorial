import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocumentContent = SlateTool.create(spec, {
  name: 'Get Document Content',
  key: 'get_document_content',
  description:
    'Reads the Markdown body of a contract or template, including extended signer-field syntax. Use this before applying precise content edits.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      resource: z.enum(['contract', 'template']).describe('Type of document to read'),
      resourceId: z
        .string()
        .min(1)
        .describe('Contract ID from create_contract or template ID from list_templates')
    })
  )
  .output(
    z.object({
      resource: z.enum(['contract', 'template']),
      resourceId: z.string(),
      markdown: z.string().describe('Current document body in Markdown')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getDocumentContent(
      ctx.input.resource,
      ctx.input.resourceId
    );
    return {
      output: { ...ctx.input, markdown: result.data.markdown },
      message: `Retrieved content for ${ctx.input.resource} **${ctx.input.resourceId}**.`
    };
  })
  .build();
