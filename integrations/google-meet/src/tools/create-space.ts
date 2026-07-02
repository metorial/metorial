import { SlateTool } from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { googleMeetActionScopes } from '../scopes';
import { spec } from '../spec';

let autoGenerationType = z
  .enum(['ON', 'OFF'])
  .optional()
  .describe('Whether to enable auto-generation');

export let createSpaceTool = SlateTool.create(spec, {
  name: 'Create Meeting Space',
  key: 'create_space',
  description: `Create a new Google Meet meeting space with optional configuration. Returns the meeting URI and code that participants can use to join. Configure access controls, moderation, and auto-artifacts like recording and transcription.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleMeetActionScopes.createSpace)
  .input(
    z.object({
      accessType: z
        .enum(['OPEN', 'TRUSTED', 'RESTRICTED'])
        .optional()
        .describe(
          'Who can join without knocking. OPEN = anyone with the link, TRUSTED = trusted users, RESTRICTED = only invited users.'
        ),
      entryPointAccess: z
        .enum(['ALL', 'CREATOR_APP_ONLY'])
        .optional()
        .describe(
          'Which entry points can be used to join. ALL = any entry point, CREATOR_APP_ONLY = only from the app that created the space.'
        ),
      moderation: z
        .enum(['ON', 'OFF'])
        .optional()
        .describe(
          'Whether moderation mode is enabled, giving the organizer control over co-host management and feature restrictions.'
        ),
      moderationRestrictions: z
        .object({
          chatRestriction: z
            .enum(['HOSTS_ONLY', 'NO_RESTRICTION'])
            .optional()
            .describe('Who can send chat messages.'),
          reactionRestriction: z
            .enum(['HOSTS_ONLY', 'NO_RESTRICTION'])
            .optional()
            .describe('Who can send reactions.'),
          presentRestriction: z
            .enum(['HOSTS_ONLY', 'NO_RESTRICTION'])
            .optional()
            .describe('Who can present/share screen.'),
          defaultJoinAsViewerType: z
            .enum(['ON', 'OFF'])
            .optional()
            .describe('Whether participants join as viewers by default.')
        })
        .optional()
        .describe('Feature restrictions when moderation is ON.'),
      autoRecording: autoGenerationType.describe(
        'Automatically start recording when the conference begins.'
      ),
      autoTranscription: autoGenerationType.describe(
        'Automatically start transcription when the conference begins.'
      ),
      autoSmartNotes: autoGenerationType.describe(
        'Automatically generate smart notes for the conference.'
      )
    })
  )
  .output(
    z.object({
      spaceName: z.string().describe('Resource name of the space (e.g., spaces/abc123)'),
      meetingUri: z.string().describe('Full meeting URL for joining'),
      meetingCode: z.string().describe('Human-readable meeting code (e.g., abc-mnop-xyz)'),
      accessType: z.string().optional().describe('Configured access type'),
      moderation: z.string().optional().describe('Configured moderation mode')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });

    let artifactConfig: Record<string, any> | undefined;
    if (ctx.input.autoRecording || ctx.input.autoTranscription || ctx.input.autoSmartNotes) {
      artifactConfig = {};
      if (ctx.input.autoRecording) {
        artifactConfig.recordingConfig = { autoRecordingGeneration: ctx.input.autoRecording };
      }
      if (ctx.input.autoTranscription) {
        artifactConfig.transcriptionConfig = {
          autoTranscriptionGeneration: ctx.input.autoTranscription
        };
      }
      if (ctx.input.autoSmartNotes) {
        artifactConfig.smartNotesConfig = {
          autoSmartNotesGeneration: ctx.input.autoSmartNotes
        };
      }
    }

    let space = await client.createSpace({
      accessType: ctx.input.accessType,
      entryPointAccess: ctx.input.entryPointAccess,
      moderation: ctx.input.moderation,
      moderationRestrictions: ctx.input.moderationRestrictions,
      artifactConfig
    });

    return {
      output: {
        spaceName: space.name || '',
        meetingUri: space.meetingUri || '',
        meetingCode: space.meetingCode || '',
        accessType: space.config?.accessType,
        moderation: space.config?.moderation
      },
      message: `Created meeting space **${space.meetingCode}**.\n\nJoin URL: ${space.meetingUri}`
    };
  })
  .build();
