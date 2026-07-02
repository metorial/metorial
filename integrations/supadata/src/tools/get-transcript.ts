import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transcriptChunkSchema = z.object({
  text: z.string().describe('Transcript text segment'),
  offset: z.number().describe('Start time offset in milliseconds'),
  duration: z.number().describe('Duration of segment in milliseconds'),
  lang: z.string().optional().describe('Language code of the segment')
});

export let getTranscript = SlateTool.create(spec, {
  name: 'Get Video Transcript',
  key: 'get_transcript',
  description: `Extract text transcripts from videos hosted on YouTube, TikTok, Instagram, X (Twitter), Facebook, or from direct file URLs (MP4, WEBM, MP3, WAV, etc.).
Supports language preference, plain text or timestamped output, and multiple transcription modes (native captions, AI-generated, or auto).
If the video requires async processing, a job ID is returned that can be polled for results.`,
  instructions: [
    'Use mode "native" to only get existing captions, "generate" for AI-generated transcripts, or "auto" to try native first then fall back to AI.',
    'If the response contains a jobId instead of content, use the "Get Transcript Job Result" tool to poll for the completed transcript.'
  ],
  constraints: [
    'Only publicly accessible videos can be transcribed. Private, login-required, age-restricted, or paywalled content is not supported.',
    'Maximum file size for direct file URLs is 1 GB.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the video or audio file to transcribe'),
      lang: z
        .string()
        .optional()
        .describe('Preferred language (ISO 639-1 code, e.g. "en", "es", "fr")'),
      text: z
        .boolean()
        .optional()
        .describe('If true, return plain text instead of timestamped chunks'),
      chunkSize: z.number().optional().describe('Maximum number of characters per chunk'),
      mode: z
        .enum(['native', 'generate', 'auto'])
        .optional()
        .describe(
          'Transcription mode: native (existing captions only), generate (AI-generated), or auto (native with AI fallback)'
        )
    })
  )
  .output(
    z.object({
      content: z
        .union([z.array(transcriptChunkSchema), z.string()])
        .optional()
        .describe('Transcript content — either timestamped chunks or plain text'),
      lang: z.string().optional().describe('Language of the returned transcript'),
      availableLangs: z
        .array(z.string())
        .optional()
        .describe('Available language codes for the video'),
      jobId: z
        .string()
        .optional()
        .describe('Job ID for async processing — poll with Get Transcript Job Result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTranscript({
      url: ctx.input.url,
      lang: ctx.input.lang,
      text: ctx.input.text,
      chunkSize: ctx.input.chunkSize,
      mode: ctx.input.mode
    });

    if (result.jobId) {
      return {
        output: {
          jobId: result.jobId
        },
        message: `Transcript request is being processed asynchronously. Job ID: **${result.jobId}**. Use the "Get Transcript Job Result" tool to check the status.`
      };
    }

    let contentSummary =
      typeof result.content === 'string'
        ? `${result.content.length} characters`
        : `${(result.content as any[])?.length ?? 0} segments`;

    return {
      output: {
        content: result.content,
        lang: result.lang,
        availableLangs: result.availableLangs
      },
      message: `Transcript extracted successfully (${contentSummary}, language: ${result.lang ?? 'unknown'}).`
    };
  })
  .build();
