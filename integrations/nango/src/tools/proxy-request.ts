import { SlateTool } from 'slates';
import { z } from 'zod';
import { NangoClient } from '../lib/client';
import { spec } from '../spec';

export let proxyRequest = SlateTool.create(spec, {
  name: 'Proxy Request',
  key: 'proxy_request',
  description: `Make an authenticated API request to an external provider on behalf of a connected user. Nango injects the user's credentials, handles retries and rate limits, and returns the external API's response. You only specify the endpoint path relative to the provider's base URL.`,
  instructions: [
    'The endpoint should be the path portion of the external API URL, not a full URL.',
    'Custom headers you provide are forwarded to the external API.',
    'Set retries for automatic exponential backoff on failures.'
  ]
})
  .input(
    z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('HTTP method'),
      endpoint: z.string().describe('API endpoint path (e.g., "repos/owner/repo/issues")'),
      connectionId: z.string().describe('The connection ID to authenticate as'),
      providerConfigKey: z.string().describe('The integration ID (unique key)'),
      requestBody: z.any().optional().describe('Request body for POST/PUT/PATCH requests'),
      queryParams: z
        .record(z.string(), z.string())
        .optional()
        .describe('Query parameters to forward'),
      retries: z
        .number()
        .optional()
        .describe('Number of retry attempts with exponential backoff (default: 0)'),
      baseUrlOverride: z.string().optional().describe('Override the provider base URL'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional headers to forward to the external API')
    })
  )
  .output(
    z.object({
      responseBody: z.any().describe('The response from the external API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NangoClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.proxyRequest({
      method: ctx.input.method,
      endpoint: ctx.input.endpoint,
      connectionId: ctx.input.connectionId,
      providerConfigKey: ctx.input.providerConfigKey,
      data: ctx.input.requestBody,
      queryParams: ctx.input.queryParams,
      retries: ctx.input.retries,
      baseUrlOverride: ctx.input.baseUrlOverride,
      headers: ctx.input.headers
    });

    return {
      output: { responseBody: result },
      message: `Proxied **${ctx.input.method}** request to **${ctx.input.endpoint}** via connection **${ctx.input.connectionId}**.`
    };
  })
  .build();
