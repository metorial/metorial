import { SlateTool } from 'slates';
import { z } from 'zod';
import { TldvClient } from '../lib/client';
import { spec } from '../spec';

export let importMeeting = SlateTool.create(spec, {
  name: 'Import Meeting',
  key: 'import_meeting',
  description: `Import an external meeting recording into tl;dv from a publicly accessible URL. The media must be in a supported format. Once imported, tl;dv will process the recording for transcription and analysis.`,
  constraints: [
    'The URL must be publicly accessible.',
    'The media must be in a supported audio/video format.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('Publicly accessible URL of the recording to import.')
    })
  )
  .output(
    z.object({
      meetingId: z.string().describe('Unique identifier of the imported meeting.'),
      name: z.string().describe('Name assigned to the imported meeting.'),
      url: z.string().describe('tl;dv web URL for the imported meeting.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TldvClient({ token: ctx.auth.token });
    let meeting = await client.importMeeting({ url: ctx.input.sourceUrl });

    return {
      output: {
        meetingId: meeting.id,
        name: meeting.name,
        url: meeting.url
      },
      message: `Imported meeting **${meeting.name}** from the provided URL. It will be processed for transcription and analysis.`
    };
  })
  .build();
