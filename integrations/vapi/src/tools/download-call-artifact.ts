import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const downloadCallArtifact = SlateTool.create(spec, {
  name: 'Download Call Artifact',
  key: 'download_call_artifact',
  description:
    'Download a call recording, video, logs, or packet capture through the authenticated Vapi download endpoint. The call must have generated the requested artifact.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      callId: z.string().min(1).describe('Call ID from list_calls'),
      artifact: z
        .enum([
          'mono-recording',
          'stereo-recording',
          'customer-recording',
          'assistant-recording',
          'video-recording',
          'call-logs',
          'pcap'
        ])
        .describe('Artifact to download')
    })
  )
  .output(z.object({ callId: z.string(), artifact: z.string() }))
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token, ctx.auth.region);
    await client.checkCallArtifact(ctx.input.callId, ctx.input.artifact);
    await ctx.addAttachment({
      type: 'url',
      url: `${client.baseUrl}/call/${encodeURIComponent(ctx.input.callId)}/${ctx.input.artifact}`,
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });
    return {
      output: { callId: ctx.input.callId, artifact: ctx.input.artifact },
      message: `Prepared ${ctx.input.artifact} for call ${ctx.input.callId} for download.`
    };
  })
  .build();
