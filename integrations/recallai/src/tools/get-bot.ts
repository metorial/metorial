import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { recordingOutput, recordingSchema } from '../lib/schemas';
import { spec } from '../spec';

let statusChangeSchema = z.object({
  code: z.string().describe('Status code'),
  message: z.string().nullable().describe('Status message'),
  createdAt: z.string().describe('Timestamp of the status change'),
  subCode: z.string().nullable().describe('Sub-code for additional context')
});

let participantSchema = z.object({
  participantId: z.number().describe('Participant ID'),
  name: z.string().describe('Participant name'),
  events: z
    .array(
      z.object({
        code: z.string().describe('Event code (e.g. join, leave)'),
        createdAt: z.string().describe('Event timestamp')
      })
    )
    .describe('Participant events')
});

export let getBotTool = SlateTool.create(spec, {
  name: 'Get Bot',
  key: 'get_bot',
  description: `Retrieve detailed information about a specific bot including its status, meeting participants, status history, recording URL, and metadata.`,
  constraints: ['Rate limit: 300 requests per minute per workspace.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('The unique identifier of the bot to retrieve')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Bot unique identifier'),
      botName: z.string().describe('Bot display name'),
      meetingUrl: z.unknown().describe('Parsed meeting URL'),
      joinAt: z.string().nullable().describe('Scheduled join time'),
      status: z.string().describe('Current bot status'),
      metadata: z.record(z.string(), z.unknown()).describe('Custom bot metadata'),
      recordings: z
        .array(recordingSchema)
        .describe('Recordings captured by this bot, with IDs for get_recording'),
      statusChanges: z.array(statusChangeSchema).describe('History of status changes'),
      meetingParticipants: z.array(participantSchema).describe('Participants in the meeting'),
      meetingMetadata: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Meeting metadata'),
      videoUrl: z.string().nullable().describe('Pre-signed URL for the MP4 recording'),
      outputMedia: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional()
        .describe('Current bot output media configuration'),
      automaticAudioOutput: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional()
        .describe('Automatic audio settings; required before using output_media audio'),
      recordingConfig: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Recording configuration'),
      createdAt: z
        .string()
        .optional()
        .describe('Bot creation timestamp when supplied by Recall.ai'),
      mediaRetentionEnd: z.string().nullable().describe('When media will be deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let bot = await client.getBot(ctx.input.botId);

    return {
      output: {
        botId: bot.id,
        botName: bot.botName,
        meetingUrl: bot.meetingUrl,
        joinAt: bot.joinAt,
        status: bot.status,
        statusChanges: bot.statusChanges,
        metadata: bot.metadata,
        recordings: bot.recordings.map(recordingOutput),
        meetingParticipants: bot.meetingParticipants,
        meetingMetadata: bot.meetingMetadata,
        videoUrl: bot.videoUrl,
        recordingConfig: bot.recordingConfig,
        outputMedia: bot.outputMedia,
        automaticAudioOutput: bot.automaticAudioOutput,
        createdAt: bot.createdAt,
        mediaRetentionEnd: bot.mediaRetentionEnd
      },
      message: `Bot **${bot.botName}** (${bot.id}) — Status: **${bot.status}**. ${bot.meetingParticipants.length} participant(s). ${bot.videoUrl ? 'Recording available.' : 'No recording yet.'}`
    };
  })
  .build();
