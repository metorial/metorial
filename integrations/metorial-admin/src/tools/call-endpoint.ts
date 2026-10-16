import { Buffer } from 'node:buffer';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { resolveMetorialRuntimeConfig } from '../config';
import { MetorialClient } from '../lib/client';
import {
  buildMetorialEndpointPath,
  METORIAL_METHODS,
  resolveMetorialEndpointForCall
} from '../lib/endpoints';
import { metorialValidationError } from '../lib/errors';
import { spec } from '../spec';

let methodSchema = z.enum(METORIAL_METHODS);

export let callEndpoint = SlateTool.create(spec, {
  name: 'Call Endpoint',
  key: 'call_endpoint',
  description:
    'Call a Metorial dashboard instance API endpoint that appears in list_endpoints. The endpoint is revalidated against current introspection before dispatch.',
  instructions: [
    'Use list_endpoints first and pass the returned path as endpointPath.',
    'instanceId always fills the :instanceId path segment and is also sent as metorial-instance-id.',
    'Provide any additional path parameters through pathParams.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      method: methodSchema.describe('HTTP method for the endpoint.'),
      endpointPath: z
        .string()
        .describe(
          'Dashboard instance endpoint path from list_endpoints, such as /dashboard/instances/:instanceId/...'
        ),
      instanceId: z
        .string()
        .describe(
          'Metorial instance ID or slug from list_instances, used for :instanceId and metorial-instance-id.'
        ),
      pathParams: z
        .record(z.string(), z.string())
        .optional()
        .describe('Values for endpoint path parameters other than :instanceId.'),
      query: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Query parameters to send with the endpoint request.'),
      body: z.unknown().optional().describe('JSON body to send for non-GET requests.')
    })
  )
  .output(
    z.object({
      status: z.number().describe('HTTP response status.'),
      statusText: z.string().optional().describe('HTTP response status text.'),
      contentType: z.string().optional().describe('Response content type.'),
      responseKind: z
        .enum(['json', 'empty', 'attachment'])
        .describe('How the response content was returned.'),
      data: z
        .unknown()
        .optional()
        .describe('Inline JSON response data, present only for JSON responses.'),
      size: z.number().describe('Response body size in bytes.'),
      attachmentCount: z.number().describe('Number of response files prepared for download.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.method === 'get' && ctx.input.body !== undefined) {
      throw metorialValidationError('GET Metorial endpoint calls cannot include a body.');
    }

    let config = resolveMetorialRuntimeConfig(ctx.config, ctx.auth);
    let client = new MetorialClient(config);
    let docs = await client.introspectEndpoints();
    let endpoint = resolveMetorialEndpointForCall(docs, {
      method: ctx.input.method,
      endpointPath: ctx.input.endpointPath
    });
    let path = buildMetorialEndpointPath(endpoint, {
      instanceId: ctx.input.instanceId,
      pathParams: ctx.input.pathParams
    });
    let response = await client.callEndpoint({
      method: ctx.input.method,
      path,
      token: ctx.auth.token,
      instanceId: ctx.input.instanceId,
      query: ctx.input.query,
      body: ctx.input.body
    });

    if (response.kind === 'json') {
      return {
        output: {
          status: response.status,
          statusText: response.statusText,
          contentType: response.contentType,
          responseKind: 'json' as const,
          data: response.data,
          size: response.size,
          attachmentCount: 0
        },
        message: `Called **${ctx.input.method.toUpperCase()} ${ctx.input.endpointPath}** and received JSON status **${response.status}**.`
      };
    }

    if (response.kind === 'empty') {
      return {
        output: {
          status: response.status,
          statusText: response.statusText,
          contentType: response.contentType,
          responseKind: 'empty' as const,
          size: response.size,
          attachmentCount: 0
        },
        message: `Called **${ctx.input.method.toUpperCase()} ${ctx.input.endpointPath}** and received empty status **${response.status}**.`
      };
    }

    // The dynamic request may use POST or other methods, so reuse the retrieved bytes.
    await ctx.addAttachment({
      type: 'content',
      content: new Response(
        response.kind === 'text' ? response.text : Buffer.from(response.base64, 'base64'),
        response.contentType
          ? { headers: { 'Content-Type': response.contentType } }
          : undefined
      ),
      mimeType: response.contentType
    });

    return {
      output: {
        status: response.status,
        statusText: response.statusText,
        contentType: response.contentType,
        responseKind: 'attachment' as const,
        size: response.size,
        attachmentCount: 1
      },
      message: `Called **${ctx.input.method.toUpperCase()} ${ctx.input.endpointPath}** and prepared the non-JSON response for download.`
    };
  })
  .build();
