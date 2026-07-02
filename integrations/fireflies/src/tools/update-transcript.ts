import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { firefliesServiceError } from '../lib/errors';
import { spec } from '../spec';

let privacySchema = z.enum([
  'link',
  'owner',
  'participants',
  'teammatesandparticipants',
  'teammates',
  'teammates_and_participants',
  'participating_teammates'
]);

let normalizePrivacy = (privacy: z.infer<typeof privacySchema>) => {
  if (privacy === 'teammates_and_participants') return 'teammatesandparticipants';
  if (privacy === 'participating_teammates') return 'teammates';
  return privacy;
};

export let updateTranscript = SlateTool.create(spec, {
  name: 'Update Transcript',
  key: 'update_transcript',
  description: `Update properties of a meeting transcript. You can change the title, privacy level, and/or channel assignment. Only meeting owners or team admins can perform updates.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      transcriptId: z.string().describe('The unique identifier of the transcript to update'),
      title: z.string().optional().describe('New title for the meeting'),
      privacy: privacySchema.optional().describe('New privacy level for the meeting'),
      channelId: z.string().optional().describe('Channel ID to assign this meeting to')
    })
  )
  .output(
    z.object({
      transcriptId: z.string().describe('Transcript identifier'),
      title: z.string().nullable().describe('Updated title'),
      privacy: z.string().nullable().describe('Updated privacy level'),
      channelUpdated: z.boolean().describe('Whether the channel assignment was updated')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.title && !ctx.input.privacy && !ctx.input.channelId) {
      throw firefliesServiceError(
        'Provide at least one of title, privacy, or channelId to update.'
      );
    }
    if (ctx.input.title !== undefined && ctx.input.title.trim().length === 0) {
      throw firefliesServiceError('title cannot be empty.');
    }
    if (ctx.input.title && ctx.input.title.length > 256) {
      throw firefliesServiceError('title must be 256 characters or fewer.');
    }

    let client = new FirefliesClient({ token: ctx.auth.token });

    let currentTitle: string | null = null;
    let currentPrivacy: string | null = null;
    let channelUpdated = false;

    if (ctx.input.title) {
      let result = await client.updateMeetingTitle(ctx.input.transcriptId, ctx.input.title);
      currentTitle = result?.title ?? ctx.input.title;
    }

    if (ctx.input.privacy) {
      let privacy = normalizePrivacy(ctx.input.privacy);
      let result = await client.updateMeetingPrivacy(ctx.input.transcriptId, privacy);
      currentPrivacy = result?.privacy ?? privacy;
    }

    if (ctx.input.channelId) {
      await client.updateMeetingChannel([ctx.input.transcriptId], ctx.input.channelId);
      channelUpdated = true;
    }

    let changes: string[] = [];
    if (ctx.input.title) changes.push(`title to "${ctx.input.title}"`);
    if (ctx.input.privacy) changes.push(`privacy to "${ctx.input.privacy}"`);
    if (ctx.input.channelId) changes.push(`channel to "${ctx.input.channelId}"`);

    return {
      output: {
        transcriptId: ctx.input.transcriptId,
        title: currentTitle,
        privacy: currentPrivacy,
        channelUpdated
      },
      message: `Updated transcript ${ctx.input.transcriptId}: ${changes.join(', ')}.`
    };
  })
  .build();
