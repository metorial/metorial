import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieves detailed information about a specific template by its ID. Use this to inspect template contents before creating a proposal.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The unique ID of the template to retrieve')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      template: z.any().describe('Full template details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTemplate(ctx.input.templateId);

    return {
      output: {
        status: result.status ?? 'success',
        template: result.data
      },
      message: `Retrieved template **${ctx.input.templateId}**.`
    };
  })
  .build();
