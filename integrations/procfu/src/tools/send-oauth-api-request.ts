import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let sendOauthApiRequest = SlateTool.create(spec, {
  name: 'Send OAuth API Request',
  key: 'send_oauth_api_request',
  description: `Make an authenticated API request through a ProcFu-managed OAuth service. ProcFu handles the OAuth token lifecycle automatically.
The service must be previously configured in your ProcFu account settings.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      serviceName: z
        .string()
        .describe('The OAuth API service name as configured in your ProcFu account'),
      userId: z.string().describe('Your internal user reference for this OAuth connection'),
      requestUrl: z.string().describe('The full URL of the API endpoint to call'),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('HTTP method'),
      headers: z
        .string()
        .optional()
        .describe(
          'Comma-separated headers (defaults to "Content-type: application/json,Accept: application/json")'
        ),
      body: z
        .record(z.string(), z.any())
        .optional()
        .describe('Request body as a JSON object (for POST, PUT, PATCH)')
    })
  )
  .output(
    z.object({
      response: z.any().describe('The API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    let result = await client.sendApiRequest(
      ctx.input.serviceName,
      ctx.input.userId,
      ctx.input.requestUrl,
      ctx.input.method,
      ctx.input.headers,
      ctx.input.body ? JSON.stringify(ctx.input.body) : undefined
    );

    return {
      output: { response: result },
      message: `Sent **${ctx.input.method}** request to **${ctx.input.requestUrl}** via OAuth service **${ctx.input.serviceName}**.`
    };
  })
  .build();
