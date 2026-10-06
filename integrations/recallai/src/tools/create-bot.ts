import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  automaticAudioOutputPayload,
  automaticAudioOutputSchema,
  automaticLeavePayload,
  automaticLeaveSchema,
  recordingConfigPayload,
  recordingConfigSchema
} from '../lib/bot-config';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBotTool = SlateTool.create(spec, {
  name: 'Create Bot',
  key: 'create_bot',
  description: `Create a meeting bot that joins a video conference to capture recordings, transcripts, and metadata. Supports Zoom, Google Meet, Microsoft Teams, Webex, Slack Huddles, and GoTo Meeting.
Bots can be sent immediately or scheduled for a future time using **joinAt**. Configure transcription providers, realtime streaming endpoints, and recording options.`,
  instructions: [
    'For production use, schedule bots in advance using joinAt to avoid 507 errors.',
    'Bots scheduled more than 10 minutes in advance are guaranteed to join on-time.'
  ],
  constraints: [
    'Rate limit: 120 requests per minute per workspace.',
    'Bots are single-use and cannot be reused after a meeting ends.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      meetingUrl: z.string().describe('Meeting URL (Zoom, Google Meet, Teams, Webex, etc.)'),
      botName: z
        .string()
        .optional()
        .describe(
          'Custom display name for the bot in the meeting (default: "Meeting Notetaker")'
        ),
      joinAt: z
        .string()
        .optional()
        .describe(
          'ISO 8601 timestamp for when the bot should join. Omit to join immediately.'
        ),
      recordingConfig: recordingConfigSchema.optional(),
      automaticLeave: automaticLeaveSchema.optional(),
      automaticAudioOutput: automaticAudioOutputSchema
        .optional()
        .describe('Audio played when recording starts; also enables output_media audio'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata to attach to the bot')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Unique identifier of the created bot'),
      botName: z.string().describe('Display name of the bot'),
      meetingUrl: z.unknown().describe('Parsed meeting URL object'),
      joinAt: z
        .string()
        .nullable()
        .describe('Scheduled join time, or null if joining immediately'),
      status: z.string().describe('Current bot status'),
      createdAt: z
        .string()
        .optional()
        .describe('Bot creation timestamp when supplied by Recall.ai')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let bot = await client.createBot({
      meetingUrl: ctx.input.meetingUrl,
      botName: ctx.input.botName,
      joinAt: ctx.input.joinAt,
      recordingConfig: recordingConfigPayload(ctx.input.recordingConfig),
      automaticLeave: automaticLeavePayload(ctx.input.automaticLeave),
      automaticAudioOutput: automaticAudioOutputPayload(ctx.input.automaticAudioOutput),
      metadata: ctx.input.metadata
    });

    let scheduled = bot.joinAt ? `scheduled for ${bot.joinAt}` : 'joining immediately';

    return {
      output: {
        botId: bot.id,
        botName: bot.botName,
        meetingUrl: bot.meetingUrl,
        joinAt: bot.joinAt,
        status: bot.status,
        createdAt: bot.createdAt
      },
      message: `Bot **${bot.botName}** (${bot.id}) created, ${scheduled}. Status: ${bot.status}.`
    };
  })
  .build();
