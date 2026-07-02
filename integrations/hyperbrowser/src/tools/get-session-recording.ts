import { SlateTool } from 'slates';
import { z } from 'zod';
import { HyperbrowserClient } from '../lib/client';
import { spec } from '../spec';

export let getSessionRecording = SlateTool.create(spec, {
  name: 'Get Session Recording',
  key: 'get_session_recording',
  description: `Retrieve recording URLs for a stopped browser session.
Can get rrweb DOM-based replay recording URLs and MP4 video recording URLs. Video recordings must be explicitly enabled when creating the session.`,
  instructions: [
    'The session must be stopped before recordings are available.',
    'rrweb recordings are enabled by default; video recordings require enableVideoWebRecording to be set when creating the session.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('Session ID to get recordings for'),
      includeVideo: z
        .boolean()
        .optional()
        .describe('Also retrieve the MP4 video recording URL (if available)')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session identifier'),
      recordingUrl: z.string().optional().nullable().describe('rrweb DOM recording URL'),
      videoRecordingUrl: z.string().optional().nullable().describe('MP4 video recording URL'),
      downloadsUrl: z
        .string()
        .optional()
        .nullable()
        .describe('URL to retrieve downloaded files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });

    let recordingResult = await client.getSessionRecordingUrl(ctx.input.sessionId);
    let recordingUrl = (recordingResult.url ?? recordingResult.recordingUrl) as
      | string
      | null
      | undefined;

    let videoRecordingUrl: string | null | undefined;
    if (ctx.input.includeVideo) {
      let videoResult = await client.getSessionVideoRecordingUrl(ctx.input.sessionId);
      videoRecordingUrl = (videoResult.url ?? videoResult.videoRecordingUrl) as
        | string
        | null
        | undefined;
    }

    let downloadsResult = await client.getSessionDownloadsUrl(ctx.input.sessionId);
    let downloadsUrl = (downloadsResult.url ?? downloadsResult.downloadsUrl) as
      | string
      | null
      | undefined;

    return {
      output: {
        sessionId: ctx.input.sessionId,
        recordingUrl,
        videoRecordingUrl,
        downloadsUrl
      },
      message: `Retrieved recording data for session **${ctx.input.sessionId}**.${recordingUrl ? ` [Recording](${recordingUrl})` : ''}`
    };
  })
  .build();
