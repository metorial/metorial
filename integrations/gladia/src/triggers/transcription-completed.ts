import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transcriptionCompleted = SlateTrigger.create(spec, {
  name: 'Transcription Completed',
  key: 'transcription_completed',
  description:
    'Triggers when a pre-recorded transcription job is completed or fails. Receives a webhook notification from Gladia with the transcription ID, then fetches the full result.'
})
  .input(
    z.object({
      transcriptionId: z.string().describe('ID of the completed transcription'),
      status: z.string().describe('Status of the transcription')
    })
  )
  .output(
    z.object({
      transcriptionId: z.string().describe('Unique ID of the transcription'),
      status: z.string().describe('Final status: done or error'),
      createdAt: z.string().describe('ISO 8601 timestamp when the transcription was created'),
      completedAt: z
        .string()
        .nullable()
        .describe('ISO 8601 timestamp when the transcription completed'),
      audioDuration: z.number().optional().describe('Duration of the audio in seconds'),
      numberOfChannels: z.number().optional().describe('Number of audio channels'),
      fullTranscript: z.string().optional().describe('Full transcript text'),
      languages: z.array(z.string()).optional().describe('Detected or specified languages'),
      utterances: z
        .array(
          z.object({
            text: z.string(),
            language: z.string(),
            start: z.number(),
            end: z.number(),
            confidence: z.number(),
            channel: z.number(),
            speaker: z.number()
          })
        )
        .optional()
        .describe('Transcript utterances with timestamps and speaker information'),
      translation: z.any().optional().describe('Translation results if enabled'),
      summarization: z.any().optional().describe('Summarization results if enabled'),
      sentimentAnalysis: z.any().optional().describe('Sentiment analysis results if enabled'),
      namedEntityRecognition: z
        .any()
        .optional()
        .describe('Named entity recognition results if enabled'),
      chapterization: z.any().optional().describe('Chapterization results if enabled'),
      audioToLlm: z.any().optional().describe('Audio-to-LLM results if enabled'),
      moderation: z.any().optional().describe('Content moderation results if enabled'),
      structuredDataExtraction: z
        .any()
        .optional()
        .describe('Structured data extraction results if enabled'),
      subtitles: z
        .array(
          z.object({
            format: z.string(),
            subtitles: z.string()
          })
        )
        .optional()
        .describe('Generated subtitles if enabled'),
      errorCode: z
        .number()
        .nullable()
        .optional()
        .describe('Error code if the transcription failed'),
      sourceUrl: z.string().optional().describe('Original audio source URL'),
      customMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata attached to the transcription')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Gladia webhooks (both account-level and callback) send a payload containing the transcription ID.
      // The payload format can vary - it might contain the full result or just an ID.
      let transcriptionId = body.id || body.transcription_id || body.payload?.id;
      let status = body.status || body.payload?.status || 'done';

      if (!transcriptionId) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            transcriptionId,
            status
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.getTranscription(ctx.input.transcriptionId);

      let utterances = result.result?.transcription?.utterances?.map(u => ({
        text: u.text,
        language: u.language,
        start: u.start,
        end: u.end,
        confidence: u.confidence,
        channel: u.channel,
        speaker: u.speaker
      }));

      let output: any = {
        transcriptionId: result.id,
        status: result.status,
        createdAt: result.created_at,
        completedAt: result.completed_at,
        errorCode: result.error_code,
        sourceUrl: result.file?.source,
        customMetadata: result.custom_metadata
      };

      if (result.result) {
        output.audioDuration = result.result.metadata?.audio_duration;
        output.numberOfChannels = result.result.metadata?.number_of_channels;
        output.fullTranscript = result.result.transcription?.full_transcript;
        output.languages = result.result.transcription?.languages;
        output.utterances = utterances;
        output.subtitles = result.result.transcription?.subtitles;

        if (result.result.translation) output.translation = result.result.translation;
        if (result.result.summarization) output.summarization = result.result.summarization;
        if (result.result.sentiment_analysis)
          output.sentimentAnalysis = result.result.sentiment_analysis;
        if (result.result.named_entity_recognition)
          output.namedEntityRecognition = result.result.named_entity_recognition;
        if (result.result.chapterization) output.chapterization = result.result.chapterization;
        if (result.result.audio_to_llm) output.audioToLlm = result.result.audio_to_llm;
        if (result.result.moderation) output.moderation = result.result.moderation;
        if (result.result.structured_data_extraction)
          output.structuredDataExtraction = result.result.structured_data_extraction;
      }

      let eventType =
        result.status === 'error' ? 'transcription.error' : 'transcription.completed';

      return {
        type: eventType,
        id: result.id,
        output
      };
    }
  })
  .build();
