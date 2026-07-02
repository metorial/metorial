import { SlateTool } from 'slates';
import { z } from 'zod';
import { TldvClient } from '../lib/client';
import { spec } from '../spec';

export let downloadRecording = SlateTool.create(spec, {
  name: 'Download Recording',
  key: 'download_recording',
  description: `Get a signed download URL for a meeting's recording file. The URL is temporary and **expires after 6 hours**. Use it to download or stream the recording within that window.`,
  constraints: ['The signed download URL expires 6 hours after being generated.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      meetingId: z
        .string()
        .describe('The unique identifier of the meeting whose recording to download.')
    })
  )
  .output(
    z.object({
      downloadUrl: z
        .string()
        .describe('Signed URL to download the recording. Expires after 6 hours.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TldvClient({ token: ctx.auth.token });
    let result = await client.getDownloadUrl(ctx.input.meetingId);

    return {
      output: {
        downloadUrl: result.url
      },
      message: `Generated download URL for meeting \`${ctx.input.meetingId}\`. The link expires in 6 hours.`
    };
  })
  .build();
