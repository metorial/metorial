import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVideoTranscript = SlateTool.create(spec, {
  name: 'Get Video Transcript',
  key: 'get_video_transcript',
  description: `Retrieve the transcript for a VEO video. Returns the text-based representation of the video's audio content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('ID of the video to retrieve the transcript for')
    })
  )
  .output(
    z.object({
      transcript: z.any().describe('Transcript data for the video')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let result = await client.getVideoTranscript(ctx.input.videoId);

    return {
      output: {
        transcript: result
      },
      message: `Retrieved transcript for video \`${ctx.input.videoId}\`.`
    };
  })
  .build();
