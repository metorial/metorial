import { createApiServiceError, pickDefined } from 'slates';
import { z } from 'zod';

export const automaticAudioOutputSchema = z.object({
  inCallRecording: z.object({
    data: z.object({
      kind: z.literal('mp3').describe('Audio format'),
      b64Data: z
        .string()
        .min(1)
        .max(1835008)
        .describe(
          'MP3 encoded with standard Base64; played when recording begins. Use a short silent MP3 to enable later on-demand audio without an announcement.'
        )
    })
  })
});
export const automaticAudioOutputPayload = (
  config: z.infer<typeof automaticAudioOutputSchema> | undefined
): Record<string, unknown> | undefined =>
  config
    ? {
        in_call_recording: {
          data: {
            kind: config.inCallRecording.data.kind,
            b64_data: config.inCallRecording.data.b64Data
          }
        }
      }
    : undefined;

export const recordingConfigSchema = z
  .object({
    transcript: z
      .object({
        provider: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Transcription provider configuration, such as {"recallai_streaming":{}}'),
        diarization: z
          .object({
            useSeparateStreamsWhenAvailable: z
              .boolean()
              .optional()
              .describe('Use separate participant streams for speaker attribution')
          })
          .optional()
      })
      .optional()
      .describe('Transcript settings; a provider is required when enabled'),
    realtimeEndpoints: z
      .array(
        z.object({
          type: z.enum(['webhook', 'websocket']).describe('Delivery protocol'),
          url: z.string().url().describe('Destination URL'),
          events: z
            .array(z.string())
            .describe('Recording events such as transcript.data or participant_events.join')
        })
      )
      .optional(),
    startRecordingOn: z
      .enum(['participant_join', 'host_join', 'call_join', 'participant_speak'])
      .optional()
      .describe('When recording starts; host_join is an unsupported legacy value'),
    videoMixedMp4: z.boolean().optional().describe('Capture a mixed MP4 recording'),
    audioMixedMp3: z.boolean().optional().describe('Capture a mixed MP3 recording')
  })
  .describe('Recording and transcription settings');
export const automaticLeaveSchema = z.object({
  waitingRoomTimeout: z
    .number()
    .optional()
    .describe('Waiting room timeout in seconds, at least 30'),
  nooneJoinedTimeout: z
    .number()
    .optional()
    .describe('Timeout when no participants join, at least 30 seconds'),
  everyoneLeftTimeout: z
    .number()
    .optional()
    .describe('Timeout after everyone leaves, at least 1 second'),
  inCallRecordingTimeout: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Maximum recording time in seconds'),
  inCallNotRecordingTimeout: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Maximum time in the call without recording, in seconds')
});
export const recordingConfigPayload = (
  config: z.infer<typeof recordingConfigSchema> | undefined
): Record<string, unknown> | undefined => {
  if (!config) return undefined;
  if (config.startRecordingOn === 'host_join')
    throw createApiServiceError(
      'Recall.ai does not support host_join. Choose call_join, participant_join, or participant_speak.'
    );
  if (
    config.transcript &&
    (!config.transcript.provider || !Object.keys(config.transcript.provider).length)
  )
    throw createApiServiceError(
      'Provide a transcription provider when enabling a transcript, such as {"recallai_streaming":{}}.'
    );
  return pickDefined({
    transcript: config.transcript
      ? pickDefined({
          provider: config.transcript.provider,
          diarization: config.transcript.diarization
            ? pickDefined({
                use_separate_streams_when_available:
                  config.transcript.diarization.useSeparateStreamsWhenAvailable
              })
            : undefined
        })
      : undefined,
    realtime_endpoints: config.realtimeEndpoints,
    start_recording_on: config.startRecordingOn,
    video_mixed_mp4:
      config.videoMixedMp4 === undefined ? undefined : config.videoMixedMp4 ? {} : null,
    audio_mixed_mp3:
      config.audioMixedMp3 === undefined ? undefined : config.audioMixedMp3 ? {} : null
  });
};
export const automaticLeavePayload = (
  config: z.infer<typeof automaticLeaveSchema> | undefined
): Record<string, unknown> | undefined => {
  if (!config) return undefined;
  for (const [key, value, minimum] of [
    ['waitingRoomTimeout', config.waitingRoomTimeout, 30],
    ['nooneJoinedTimeout', config.nooneJoinedTimeout, 30],
    ['everyoneLeftTimeout', config.everyoneLeftTimeout, 1]
  ] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < minimum))
      throw createApiServiceError(`${key} must be an integer of at least ${minimum} seconds.`);
  }
  return pickDefined({
    waiting_room_timeout: config.waitingRoomTimeout,
    noone_joined_timeout: config.nooneJoinedTimeout,
    everyone_left_timeout:
      config.everyoneLeftTimeout === undefined
        ? undefined
        : { timeout: config.everyoneLeftTimeout },
    in_call_recording_timeout: config.inCallRecordingTimeout,
    in_call_not_recording_timeout: config.inCallNotRecordingTimeout
  });
};
