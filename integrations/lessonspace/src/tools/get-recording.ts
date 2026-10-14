import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecording = SlateTool.create(spec, {
  name: 'Get Recording',
  key: 'get_recording',
  description: `Retrieves the recording URL for a session. The returned URL provides access to an interactive recording where users can replay events, download resources, and switch between different participants' perspectives. The recording URL is valid for up to 3 hours.`,
  constraints: [
    'Recording must have been enabled when the space was launched.',
    'The returned recording URL expires after approximately 3 hours.',
    'If ready is false, the recording is still preparing and may not play correctly yet.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sessionUuid: z.string().describe('UUID of the session to get the recording for.')
    })
  )
  .output(
    z.object({
      recordingUrl: z
        .string()
        .describe('Direct URL to the interactive session recording. Valid for up to 3 hours.'),
      ready: z.boolean().describe('Whether the recording is ready to play.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    let result = await client.getPlaybackUrl(ctx.input.sessionUuid);

    return {
      output: {
        recordingUrl: result.recordingUrl,
        ready: result.ready
      },
      message: result.ready
        ? `Recording is ready: ${result.recordingUrl}`
        : `Recording is still preparing. Playback URL: ${result.recordingUrl}`
    };
  })
  .build();
