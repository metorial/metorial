import { SlateTool } from 'slates';
import { z } from 'zod';
import { EditClient } from '../lib/client';
import { spec } from '../spec';

export let probeMediaTool = SlateTool.create(spec, {
  name: 'Probe Media',
  key: 'probe_media',
  description: `Inspect a media file at a given URL and retrieve its metadata. Returns format, duration, codec, resolution, and other technical details. Useful for validating media before rendering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('Public URL of the media file to inspect')
    })
  )
  .output(
    z.object({
      metadata: z
        .record(z.string(), z.any())
        .describe('Full media metadata including format, streams, duration, codec, resolution')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EditClient(ctx.auth.token, ctx.config.environment);
    let result = await client.probe(ctx.input.url);

    return {
      output: {
        metadata: result.response
      },
      message: `Media inspected successfully. Format: **${result.response?.metadata?.format?.format_long_name || 'unknown'}**`
    };
  })
  .build();
