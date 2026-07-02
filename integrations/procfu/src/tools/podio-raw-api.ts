import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let podioRawApi = SlateTool.create(spec, {
  name: 'Podio Raw API Call',
  key: 'podio_raw_api_call',
  description: `Make a raw HTTP request to any Podio API endpoint through ProcFu's authenticated connection.
Use this for advanced operations not covered by other tools. ProcFu handles the Podio OAuth automatically.`,
  instructions: [
    'The url should be the Podio API path (e.g. "/item/123456"), not a full URL.',
    'Attributes and options should be valid JSON strings.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      url: z.string().describe('The Podio API endpoint path (e.g. "/item/123456")'),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('HTTP method'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Request body/attributes as a JSON object'),
      options: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional request options as a JSON object')
    })
  )
  .output(
    z.object({
      response: z.any().describe('The Podio API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    let result = await client.podioRawCurl(
      ctx.input.url,
      ctx.input.method,
      ctx.input.options ? JSON.stringify(ctx.input.options) : undefined,
      ctx.input.attributes ? JSON.stringify(ctx.input.attributes) : undefined
    );

    return {
      output: { response: result },
      message: `Executed **${ctx.input.method}** request to Podio API endpoint **${ctx.input.url}**.`
    };
  })
  .build();
