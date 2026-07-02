import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Delete one or more templates from the Docmosis Cloud environment. Supports deleting multiple templates in a single request by providing an array of template names.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateNames: z
        .union([z.string(), z.array(z.string())])
        .describe(
          'Template path(s) to delete (e.g., "/invoices/template.docx" or an array of paths)'
        )
    })
  )
  .output(
    z.object({
      succeeded: z.boolean().describe('Whether the delete operation succeeded'),
      shortMsg: z.string().optional().describe('Status message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.deleteTemplate(ctx.input.templateNames);

    let names = Array.isArray(ctx.input.templateNames)
      ? ctx.input.templateNames
      : [ctx.input.templateNames];
    let message = result.succeeded
      ? `Successfully deleted **${names.length}** template(s): ${names.map(n => `\`${n}\``).join(', ')}.`
      : `Failed to delete template(s): ${result.shortMsg || 'Unknown error'}`;

    return {
      output: {
        succeeded: result.succeeded,
        shortMsg: result.shortMsg
      },
      message
    };
  })
  .build();
