import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { connectionId, integrationId, text, z } from '../lib/schemas';
import { spec } from '../spec';
export const proxyRequest = SlateTool.create(spec, {
  name: 'Proxy Request',
  key: 'proxy_request',
  description:
    'Request a provider endpoint through an exact Nango connection/integration pair from list_connections. Nango injects provider authorization. Requests can create irreversible provider effects; this is not a dry run. Credential/token/session endpoints and arbitrary origin overrides are unavailable. Recognized credential fields are redacted from results; only JSON/text responses up to the local 10 MiB cap are supported.',
  instructions: [
    'Use a relative endpoint path and queryParams separately. Do not supply credentials in paths, query, body or custom headers.',
    'Only safe condition/content headers are supported. Write retries are refused to prevent duplicate effects; inspect native state after an uncertain result.'
  ]
})
  .input(
    z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
      endpoint: text,
      connectionId,
      providerConfigKey: integrationId,
      requestBody: z.unknown().optional(),
      queryParams: z.record(z.string(), z.string()).optional(),
      retries: z.number().int().min(0).max(5).optional(),
      baseUrlOverride: z
        .string()
        .optional()
        .describe(
          'Legacy override. Any value is refused; configure the provider base URL in Nango.'
        ),
      headers: z.record(z.string(), z.string()).optional()
    })
  )
  .output(z.object({ responseBody: z.unknown() }))
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx).proxyRequest({
      ...ctx.input,
      data: ctx.input.requestBody
    });
    return {
      output: { responseBody: result },
      message:
        'Received the provider response through the exact Nango connection. This does not prove an asynchronous provider operation completed.'
    };
  })
  .build();
