import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTranscription = SlateTool.create(spec, {
  name: 'Get Transcription',
  key: 'get_transcription',
  description: `Retrieve the status and results of a pre-recorded transcription job. Returns the full transcript, utterances with timestamps and speaker labels, and any enabled audio intelligence results (translation, summarization, sentiment, NER, chapters, etc.). Can optionally wait for completion by polling.`,
  instructions: [
    'Use the transcription ID returned from Transcribe Audio.',
    'If the transcription is still processing, you can enable polling to wait for completion.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptionId: z.string().describe('ID of the transcription job to retrieve'),
      waitForCompletion: z
        .boolean()
        .optional()
        .describe(
          'If true, polls until the transcription is complete (up to ~5 min). Defaults to false.'
        )
    })
  )
  .output(
    z.object({
      transcriptionId: z.string().describe('Unique ID of the transcription'),
      status: z.string().describe('Current status: queued, processing, done, or error'),
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
        .describe('Error code if the transcription failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.waitForCompletion) {
      ctx.info('Polling for transcription completion...');
      result = await client.pollTranscriptionUntilDone(ctx.input.transcriptionId);
    } else {
      result = await client.getTranscription(ctx.input.transcriptionId);
    }

    let utterances = result.result?.transcription?.utterances?.map((u: any) => ({
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
      errorCode: result.error_code
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

    if (result.status === 'done') {
      let transcript = result.result?.transcription?.full_transcript ?? '';
      let preview = transcript.substring(0, 200) + (transcript.length > 200 ? '...' : '');
      return {
        output,
        message: `Transcription **completed**. Duration: ${result.result?.metadata?.audio_duration?.toFixed(1)}s. Preview: "${preview}"`
      };
    }

    if (result.status === 'error') {
      return {
        output,
        message: `Transcription **failed** with error code \`${result.error_code}\`.`
      };
    }

    return {
      output,
      message: `Transcription is currently **${result.status}**. It is not yet complete.`
    };
  })
  .build();
