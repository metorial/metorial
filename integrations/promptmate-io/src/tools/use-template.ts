import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let useTemplate = SlateTool.create(spec, {
  name: 'Use Template',
  key: 'use_template',
  description: `Create a new app or workflow from a Promptmate.io template. Templates are pre-built AI workflows that can be customized for your specific needs. Use the "List Templates" tool first to discover available templates.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Unique identifier of the template to use')
    })
  )
  .output(
    z.object({
      createdResource: z
        .record(z.string(), z.unknown())
        .describe('Details of the app or workflow created from the template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.useTemplate(ctx.input.templateId);

    return {
      output: { createdResource: result },
      message: `Successfully created a new resource from template **${ctx.input.templateId}**.`
    };
  })
  .build();
