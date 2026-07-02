import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let callApi = SlateTool.create(spec, {
  name: 'Call Any API',
  key: 'call_api',
  description: `Call any of APIVerve's 300+ API endpoints directly by specifying the endpoint name and parameters. Use this for any endpoint not covered by the dedicated tools, such as text translation, barcode generation, UUID generation, WHOIS lookup, and hundreds more.

Browse available endpoints at [docs.apiverve.com/api-endpoints](https://docs.apiverve.com/api-endpoints).`,
  instructions: [
    'The endpoint should be the path segment after /v1/, e.g. "translator", "uuidgenerator", "barcodegenerator".',
    'Use GET for data retrieval endpoints and POST for data processing or generation endpoints.',
    'Parameters are passed as query params for GET or request body for POST.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      endpoint: z
        .string()
        .describe(
          'The API endpoint name (e.g. "translator", "uuidgenerator", "whoisdomainlookup")'
        ),
      method: z.enum(['GET', 'POST']).describe('HTTP method to use'),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Parameters to send with the request (query params for GET, body for POST)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      responseData: z.any().describe('Response data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let endpoint = ctx.input.endpoint.startsWith('/')
      ? ctx.input.endpoint
      : `/${ctx.input.endpoint}`;

    let result = await client.callEndpoint(endpoint, ctx.input.method, ctx.input.parameters);

    if (result.status === 'error') {
      throw new Error(result.error || `API call to ${endpoint} failed`);
    }

    let output = {
      status: result.status,
      responseData: result.data
    };

    return {
      output,
      message: `API call to **${ctx.input.endpoint}** completed successfully.`
    };
  })
  .build();
