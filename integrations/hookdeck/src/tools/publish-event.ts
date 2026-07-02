import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { hookdeckServiceError } from '../lib/errors';
import { spec } from '../spec';

export let publishEvent = SlateTool.create(spec, {
  name: 'Publish Event',
  key: 'publish_event',
  description: `Publish an outbound webhook event through the Hookdeck Publish API. Use this to send events from your system to destinations configured in Hookdeck. Specify a source by ID or name, along with the request headers and body.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceId: z
        .string()
        .optional()
        .describe('Source ID to publish to (provide sourceId or sourceName)'),
      sourceName: z
        .string()
        .optional()
        .describe('Source name to publish to (provide sourceId or sourceName)'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('HTTP headers for the outbound webhook request'),
      body: z.unknown().optional().describe('Body payload for the outbound webhook request')
    })
  )
  .output(
    z.object({
      publishedSuccessfully: z
        .boolean()
        .describe('Whether the event was published successfully'),
      response: z.unknown().optional().describe('Response from the Publish API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    let data: Record<string, unknown> = {};
    if (ctx.input.sourceId) data.source_id = ctx.input.sourceId;
    if (ctx.input.sourceName) data.source_name = ctx.input.sourceName;
    if (ctx.input.headers) data.headers = ctx.input.headers;
    if (ctx.input.body !== undefined) data.body = ctx.input.body;

    if (!data.source_id && !data.source_name) {
      throw hookdeckServiceError('sourceId or sourceName is required.');
    }

    let response = await client.publishEvent(data as any);

    return {
      output: {
        publishedSuccessfully: true,
        response
      },
      message: `Published event to source **${ctx.input.sourceName || ctx.input.sourceId}** successfully.`
    };
  })
  .build();
