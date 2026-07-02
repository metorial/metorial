import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let callModule = SlateTool.create(spec, {
  name: 'Call API Module',
  key: 'call_api_module',
  description: `Call any API Labz module directly by its module ID. This is a flexible tool for accessing any module in the API Labz marketplace, including custom or newly added modules not covered by the dedicated tools.

Provide the module ID and a JSON payload to send to the module endpoint.`,
  instructions: [
    'Find module IDs in the API Labz marketplace at apilabz.com.',
    'The parameters object should contain the fields required by the specific module.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      moduleId: z.string().describe('The module ID to call, e.g. "617"'),
      parameters: z
        .record(z.string(), z.unknown())
        .describe('Key-value parameters to send to the module as the request body')
    })
  )
  .output(
    z.object({
      moduleResponse: z.any().describe('The raw response from the API Labz module')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress(`Calling module ${ctx.input.moduleId}...`);

    let result = await client.callModule(ctx.input.moduleId, ctx.input.parameters);

    return {
      output: {
        moduleResponse: result
      },
      message: `Successfully called API Labz module \`${ctx.input.moduleId}\`.`
    };
  })
  .build();
