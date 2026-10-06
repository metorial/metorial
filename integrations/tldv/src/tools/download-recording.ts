import { SlateTool } from 'slates';
import { z } from 'zod';
import { TldvClient } from '../lib/client';
import { spec } from '../spec';

export let downloadRecording = SlateTool.create(spec, {
  name: 'Download Recording',
  key: 'download_recording',
  description:
    'Prepare a downloadable meeting recording. A temporary download link is also returned and expires after six hours.',
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
        .describe('Signed URL to download the recording. Expires after 6 hours.'),
      meetingId: z.string().describe('Meeting whose recording is available for download.'),
      expiresAt: z.string().describe('Time to renew the download link, shortly before expiry.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TldvClient({ token: ctx.auth.token });
    let result = await client.getDownloadUrl(ctx.input.meetingId);
    await ctx.addAttachment({
      type: 'url',
      url: result.url,
      refreshReference: { meetingId: ctx.input.meetingId },
      refreshAt: result.expiresAt
    });

    return {
      output: {
        downloadUrl: result.url,
        meetingId: ctx.input.meetingId,
        expiresAt: result.expiresAt
      },
      message: `Generated download URL for meeting \`${ctx.input.meetingId}\`. The link expires in 6 hours.`
    };
  })
  .build();
