import { SlateTool } from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { googleMeetServiceError } from '../lib/errors';
import { googleMeetActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateSpaceTool = SlateTool.create(spec, {
  name: 'Update Meeting Space',
  key: 'update_space',
  description: `Update the configuration of an existing Google Meet meeting space. Modify access controls, moderation settings, feature restrictions, and auto-artifact settings. Only the fields you provide will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleMeetActionScopes.updateSpace)
  .input(
    z.object({
      spaceName: z.string().describe('Space resource name (e.g., "spaces/abc123")'),
      accessType: z
        .enum(['OPEN', 'TRUSTED', 'RESTRICTED'])
        .optional()
        .describe('Who can join without knocking.'),
      entryPointAccess: z
        .enum(['ALL', 'CREATOR_APP_ONLY'])
        .optional()
        .describe('Which entry points can be used to join.'),
      moderation: z
        .enum(['ON', 'OFF'])
        .optional()
        .describe('Whether moderation mode is enabled.'),
      moderationRestrictions: z
        .object({
          chatRestriction: z.enum(['HOSTS_ONLY', 'NO_RESTRICTION']).optional(),
          reactionRestriction: z.enum(['HOSTS_ONLY', 'NO_RESTRICTION']).optional(),
          presentRestriction: z.enum(['HOSTS_ONLY', 'NO_RESTRICTION']).optional(),
          defaultJoinAsViewerType: z.enum(['ON', 'OFF']).optional()
        })
        .optional()
        .describe('Feature restrictions when moderation is ON.'),
      autoRecording: z
        .enum(['ON', 'OFF'])
        .optional()
        .describe('Automatically start recording.'),
      autoTranscription: z
        .enum(['ON', 'OFF'])
        .optional()
        .describe('Automatically start transcription.'),
      autoSmartNotes: z
        .enum(['ON', 'OFF'])
        .optional()
        .describe('Automatically generate smart notes.')
    })
  )
  .output(
    z.object({
      spaceName: z.string().describe('Resource name of the updated space'),
      meetingUri: z.string().describe('Full meeting URL'),
      meetingCode: z.string().describe('Human-readable meeting code'),
      accessType: z.string().optional().describe('Updated access type'),
      moderation: z.string().optional().describe('Updated moderation mode')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });

    let updateMaskFields: string[] = [];
    let configUpdate: Record<string, any> = {};

    if (ctx.input.accessType) {
      configUpdate.accessType = ctx.input.accessType;
      updateMaskFields.push('config.accessType');
    }
    if (ctx.input.entryPointAccess) {
      configUpdate.entryPointAccess = ctx.input.entryPointAccess;
      updateMaskFields.push('config.entryPointAccess');
    }
    if (ctx.input.moderation) {
      configUpdate.moderation = ctx.input.moderation;
      updateMaskFields.push('config.moderation');
    }
    if (ctx.input.moderationRestrictions) {
      let moderationRestrictions = Object.fromEntries(
        Object.entries(ctx.input.moderationRestrictions).filter(
          ([, value]) => value !== undefined
        )
      );

      if (Object.keys(moderationRestrictions).length > 0) {
        configUpdate.moderationRestrictions = moderationRestrictions;
        for (let field of Object.keys(moderationRestrictions)) {
          updateMaskFields.push(`config.moderationRestrictions.${field}`);
        }
      }
    }
    if (ctx.input.autoRecording) {
      configUpdate.artifactConfig = configUpdate.artifactConfig || {};
      configUpdate.artifactConfig.recordingConfig = {
        autoRecordingGeneration: ctx.input.autoRecording
      };
      updateMaskFields.push('config.artifactConfig.recordingConfig.autoRecordingGeneration');
    }
    if (ctx.input.autoTranscription) {
      configUpdate.artifactConfig = configUpdate.artifactConfig || {};
      configUpdate.artifactConfig.transcriptionConfig = {
        autoTranscriptionGeneration: ctx.input.autoTranscription
      };
      updateMaskFields.push(
        'config.artifactConfig.transcriptionConfig.autoTranscriptionGeneration'
      );
    }
    if (ctx.input.autoSmartNotes) {
      configUpdate.artifactConfig = configUpdate.artifactConfig || {};
      configUpdate.artifactConfig.smartNotesConfig = {
        autoSmartNotesGeneration: ctx.input.autoSmartNotes
      };
      updateMaskFields.push('config.artifactConfig.smartNotesConfig.autoSmartNotesGeneration');
    }

    if (updateMaskFields.length === 0) {
      throw googleMeetServiceError('At least one updatable field must be provided.');
    }

    let space = await client.updateSpace(
      ctx.input.spaceName,
      configUpdate,
      updateMaskFields.join(',')
    );

    return {
      output: {
        spaceName: space.name || '',
        meetingUri: space.meetingUri || '',
        meetingCode: space.meetingCode || '',
        accessType: space.config?.accessType,
        moderation: space.config?.moderation
      },
      message: `Updated space **${space.meetingCode}**. Changed: ${updateMaskFields.join(', ')}.`
    };
  })
  .build();
