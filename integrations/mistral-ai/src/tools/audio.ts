import { Buffer } from 'node:buffer';
import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { mistralServiceError } from '../lib/errors';
import { spec } from '../spec';

let usageSchema = z.object({
  promptAudioSeconds: z.number().optional().describe('Audio seconds processed'),
  promptTokens: z.number().optional().describe('Prompt tokens processed'),
  completionTokens: z.number().optional().describe('Completion tokens generated'),
  totalTokens: z.number().optional().describe('Total tokens used')
});

let transcriptionSegmentSchema = z.object({
  text: z.string().optional().describe('Segment text'),
  start: z.number().optional().describe('Segment start time in seconds'),
  end: z.number().optional().describe('Segment end time in seconds'),
  speakerId: z
    .string()
    .nullable()
    .optional()
    .describe('Speaker ID when diarization is enabled')
});

let voiceSchema = z.object({
  voiceId: z.string().describe('Voice ID'),
  name: z.string().describe('Voice name'),
  slug: z.string().nullable().optional().describe('Voice slug'),
  languages: z.array(z.string()).optional().describe('Supported languages'),
  gender: z.string().nullable().optional().describe('Voice gender metadata'),
  age: z.number().nullable().optional().describe('Voice age metadata'),
  tags: z.array(z.string()).nullable().optional().describe('Voice tags'),
  color: z.string().nullable().optional().describe('Voice color metadata'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  userId: z.string().nullable().optional().describe('Owning user ID')
});

let decodeBase64 = (label: string, contentBase64: string) => {
  let normalized = contentBase64.replace(/\s+/g, '');
  let buffer = Buffer.from(normalized, 'base64');
  let encoded = buffer.toString('base64').replace(/=+$/u, '');
  let input = normalized.replace(/=+$/u, '');

  if (!normalized || encoded !== input) {
    throw mistralServiceError(`${label} must be valid non-empty base64 data`);
  }

  return buffer;
};

let speechMimeType = (format: string | undefined) => {
  switch (format) {
    case 'wav':
      return 'audio/wav';
    case 'flac':
      return 'audio/flac';
    case 'opus':
      return 'audio/opus';
    case 'pcm':
      return 'audio/L16';
    default:
      return 'audio/mpeg';
  }
};

let mapVoice = (voice: any) => ({
  voiceId: voice.id,
  name: voice.name,
  slug: voice.slug,
  languages: voice.languages,
  gender: voice.gender,
  age: voice.age,
  tags: voice.tags,
  color: voice.color,
  createdAt: voice.created_at,
  userId: voice.user_id
});

export let transcribeAudioTool = SlateTool.create(spec, {
  name: 'Transcribe Audio',
  key: 'transcribe_audio',
  description: `Transcribe an audio file with Mistral AI's audio transcription API. Supports public file URLs, Mistral file IDs, or inline base64 audio, with optional language hints, diarization, context bias, and timestamps.`,
  instructions: [
    'Set sourceType to "file_url", "file_id", or "file_content".',
    'For file_url, provide fileUrl. For file_id, provide fileId. For file_content, provide filename and contentBase64.',
    'Use diarize=true when speaker labels are needed.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceType: z
        .enum(['file_url', 'file_id', 'file_content'])
        .describe('Audio source type'),
      fileUrl: z.string().optional().describe('Public audio file URL for file_url source'),
      fileId: z.string().optional().describe('Mistral file ID for file_id source'),
      filename: z.string().optional().describe('Filename for file_content source'),
      contentBase64: z
        .string()
        .optional()
        .describe('Base64-encoded audio bytes for file_content source'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type for file_content source, e.g. audio/mpeg'),
      model: z.string().default('voxtral-mini-latest').describe('Transcription model ID'),
      language: z.string().optional().describe('Two-letter language hint, e.g. "en"'),
      temperature: z.number().optional().describe('Sampling temperature'),
      diarize: z.boolean().optional().describe('Enable speaker diarization'),
      contextBias: z
        .array(z.string())
        .optional()
        .describe('Words or terms to bias transcription toward'),
      timestampGranularities: z
        .array(z.enum(['segment', 'word']))
        .optional()
        .describe('Timestamp granularities to include')
    })
  )
  .output(
    z.object({
      model: z.string().describe('Transcription model used'),
      text: z.string().describe('Transcribed text'),
      language: z.string().nullable().optional().describe('Detected or configured language'),
      segments: z
        .array(transcriptionSegmentSchema)
        .optional()
        .describe('Timestamped segments when requested or returned'),
      usage: usageSchema.optional().describe('Token and audio usage')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.sourceType === 'file_url' && !ctx.input.fileUrl) {
      throw mistralServiceError('fileUrl is required when sourceType is "file_url"');
    }
    if (ctx.input.sourceType === 'file_id' && !ctx.input.fileId) {
      throw mistralServiceError('fileId is required when sourceType is "file_id"');
    }
    if (ctx.input.sourceType === 'file_content') {
      if (!ctx.input.filename) {
        throw mistralServiceError('filename is required when sourceType is "file_content"');
      }
      if (!ctx.input.contentBase64) {
        throw mistralServiceError(
          'contentBase64 is required when sourceType is "file_content"'
        );
      }
      decodeBase64('contentBase64', ctx.input.contentBase64);
    }

    let client = new MistralClient(ctx.auth.token);
    let result = await client.transcribeAudio({
      sourceType: ctx.input.sourceType,
      fileUrl: ctx.input.fileUrl,
      fileId: ctx.input.fileId,
      filename: ctx.input.filename,
      contentBase64: ctx.input.contentBase64,
      mimeType: ctx.input.mimeType,
      model: ctx.input.model,
      language: ctx.input.language,
      temperature: ctx.input.temperature,
      diarize: ctx.input.diarize,
      contextBias: ctx.input.contextBias,
      timestampGranularities: ctx.input.timestampGranularities
    });

    let output = {
      model: result.model,
      text: result.text ?? '',
      language: result.language,
      segments: result.segments?.map((segment: any) => ({
        text: segment.text,
        start: segment.start,
        end: segment.end,
        speakerId: segment.speaker_id
      })),
      usage: result.usage
        ? {
            promptAudioSeconds: result.usage.prompt_audio_seconds,
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens
          }
        : undefined
    };

    return {
      output,
      message: `Transcribed audio with **${output.model}** (${output.text.length} characters).`
    };
  })
  .build();

export let generateSpeechTool = SlateTool.create(spec, {
  name: 'Generate Speech',
  key: 'generate_speech',
  description: `Generate speech audio from text using Mistral AI. Returns the generated audio as a Slate attachment instead of inline base64.`,
  instructions: [
    'Provide voiceId for a preset or custom voice when required by the account.',
    'Alternatively provide refAudio as base64-encoded reference audio for zero-shot voice cloning.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      input: z.string().describe('Text to synthesize'),
      model: z.string().optional().describe('Speech model ID'),
      voiceId: z.string().optional().describe('Preset or custom voice ID'),
      refAudio: z
        .string()
        .optional()
        .describe('Base64-encoded reference audio for zero-shot voice cloning'),
      responseFormat: z
        .enum(['pcm', 'wav', 'mp3', 'flac', 'opus'])
        .optional()
        .default('mp3')
        .describe('Output audio format')
    })
  )
  .output(
    z.object({
      responseFormat: z.string().describe('Generated audio format'),
      mimeType: z.string().describe('Attachment MIME type'),
      byteLength: z.number().describe('Decoded audio byte length'),
      attachmentCount: z.number().describe('Number of audio attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.refAudio) {
      decodeBase64('refAudio', ctx.input.refAudio);
    }

    let client = new MistralClient(ctx.auth.token);
    let result = await client.generateSpeech({
      input: ctx.input.input,
      model: ctx.input.model,
      voiceId: ctx.input.voiceId,
      refAudio: ctx.input.refAudio,
      responseFormat: ctx.input.responseFormat
    });

    if (typeof result.audio_data !== 'string' || result.audio_data.length === 0) {
      throw mistralServiceError('Mistral AI speech response did not include audio_data');
    }

    let responseFormat = ctx.input.responseFormat ?? 'mp3';
    let byteLength = Buffer.from(result.audio_data, 'base64').byteLength;
    let mimeType = speechMimeType(responseFormat);

    return {
      output: {
        responseFormat,
        mimeType,
        byteLength,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(result.audio_data, mimeType)],
      message: `Generated speech audio (${byteLength} bytes, ${responseFormat}).`
    };
  })
  .build();

export let listVoicesTool = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `List available Mistral AI speech voices, excluding sample audio data. Use a returned voiceId with Generate Speech when a voice is required.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum voices to return'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      voices: z.array(voiceSchema).describe('Available voices'),
      total: z.number().optional().describe('Total voice count'),
      page: z.number().optional().describe('Current page'),
      pageSize: z.number().optional().describe('Page size'),
      totalPages: z.number().optional().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);
    let result = await client.listVoices({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let voices = (result.items ?? []).map(mapVoice);

    return {
      output: {
        voices,
        total: result.total,
        page: result.page,
        pageSize: result.page_size,
        totalPages: result.total_pages
      },
      message: `Found **${voices.length}** voice(s).`
    };
  })
  .build();
