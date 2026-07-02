import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let realtimeEndpointSchema = z
  .object({
    type: z.enum(['webhook', 'websocket']).describe('Type of realtime endpoint'),
    url: z.string().describe('URL for the realtime endpoint'),
    events: z
      .array(z.string())
      .describe('Events to subscribe to, e.g. "transcript.data", "participant_events.join"')
  })
  .describe('Realtime endpoint configuration');

let transcriptProviderSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe(
    'Transcript provider config, e.g. { "recallai_streaming": {} } or { "meeting_captions": {} }'
  );

let recordingConfigSchema = z
  .object({
    transcript: z
      .object({
        provider: transcriptProviderSchema,
        diarization: z
          .object({
            useSeparateStreamsWhenAvailable: z
              .boolean()
              .optional()
              .describe('Enable perfect diarization using separate participant audio streams')
          })
          .optional()
          .describe('Diarization settings')
      })
      .optional()
      .describe('Transcript configuration'),
    realtimeEndpoints: z
      .array(realtimeEndpointSchema)
      .optional()
      .describe('Realtime endpoints for streaming data during the meeting'),
    startRecordingOn: z
      .enum(['participant_join', 'host_join'])
      .optional()
      .describe('When to start recording'),
    videoMixedMp4: z.boolean().optional().describe('Enable mixed video MP4 recording'),
    audioMixedMp3: z.boolean().optional().describe('Enable mixed audio MP3 recording')
  })
  .optional()
  .describe('Recording and transcription configuration');

let automaticLeaveSchema = z
  .object({
    waitingRoomTimeout: z
      .number()
      .optional()
      .describe('Seconds to wait in waiting room before leaving'),
    nooneJoinedTimeout: z
      .number()
      .optional()
      .describe('Seconds to wait if no one joins before leaving'),
    everyoneLeftTimeout: z
      .number()
      .optional()
      .describe('Seconds to wait after everyone leaves before leaving')
  })
  .optional()
  .describe('Automatic leave behavior configuration');

export let createBotTool = SlateTool.create(spec, {
  name: 'Create Bot',
  key: 'create_bot',
  description: `Create a meeting bot that joins a video conference to capture recordings, transcripts, and metadata. Supports Zoom, Google Meet, Microsoft Teams, Webex, Slack Huddles, and GoTo Meeting.
Bots can be sent immediately or scheduled for a future time using **joinAt**. Configure transcription providers, realtime streaming endpoints, and recording options.`,
  instructions: [
    'For production use, schedule bots in advance using joinAt to avoid 507 errors.',
    'Set joinAt 10-15 seconds earlier than desired join time to account for boot time.',
    'Bots scheduled more than 10 minutes in advance are guaranteed to join on-time.'
  ],
  constraints: [
    'Rate limit: 60 requests per minute per workspace.',
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
      recordingConfig: recordingConfigSchema,
      automaticLeave: automaticLeaveSchema,
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
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let recordingConfigPayload: Record<string, unknown> | undefined;
    if (ctx.input.recordingConfig) {
      let rc = ctx.input.recordingConfig;
      let payload: Record<string, unknown> = {};

      if (rc.transcript) {
        let transcript: Record<string, unknown> = {};
        if (rc.transcript.provider) transcript.provider = rc.transcript.provider;
        if (rc.transcript.diarization) {
          transcript.diarization = {
            use_separate_streams_when_available:
              rc.transcript.diarization.useSeparateStreamsWhenAvailable
          };
        }
        payload.transcript = transcript;
      }

      if (rc.realtimeEndpoints) {
        payload.realtime_endpoints = rc.realtimeEndpoints.map(ep => ({
          type: ep.type,
          url: ep.url,
          events: ep.events
        }));
      }

      if (rc.startRecordingOn) payload.start_recording_on = rc.startRecordingOn;
      if (rc.videoMixedMp4 !== undefined) payload.video_mixed_mp4 = rc.videoMixedMp4;
      if (rc.audioMixedMp3 !== undefined) payload.audio_mixed_mp3 = rc.audioMixedMp3;

      recordingConfigPayload = payload;
    }

    let automaticLeavePayload: Record<string, unknown> | undefined;
    if (ctx.input.automaticLeave) {
      let al = ctx.input.automaticLeave;
      automaticLeavePayload = {};
      if (al.waitingRoomTimeout !== undefined)
        automaticLeavePayload.waiting_room_timeout = al.waitingRoomTimeout;
      if (al.nooneJoinedTimeout !== undefined)
        automaticLeavePayload.noone_joined_timeout = al.nooneJoinedTimeout;
      if (al.everyoneLeftTimeout !== undefined)
        automaticLeavePayload.everyone_left_timeout = al.everyoneLeftTimeout;
    }

    let bot = await client.createBot({
      meetingUrl: ctx.input.meetingUrl,
      botName: ctx.input.botName,
      joinAt: ctx.input.joinAt,
      recordingConfig: recordingConfigPayload,
      automaticLeave: automaticLeavePayload,
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
