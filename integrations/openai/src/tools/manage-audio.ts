import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let audioFileInputSchema = z.object({
  filename: z.string().describe('Audio file name, including extension'),
  fileContent: z.string().optional().describe('Audio file content as a text string'),
  fileContentBase64: z.string().optional().describe('Base64-encoded audio file bytes'),
  mimeType: z.string().optional().describe('Audio MIME type, such as audio/mpeg or audio/wav')
});

let audioTextResultSchema = z.object({
  text: z.string().describe('Transcribed or translated text'),
  rawResult: z.any().describe('Full OpenAI audio response')
});

let getAudioText = (result: any) => {
  if (typeof result === 'string') {
    return result;
  }

  return result?.text ?? '';
};

export let synthesizeSpeech = SlateTool.create(spec, {
  name: 'Synthesize Speech',
  key: 'synthesize_speech',
  description: 'Generate spoken audio from text using OpenAI text-to-speech models.',
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .optional()
        .default('gpt-4o-mini-tts')
        .describe('Text-to-speech model to use'),
      input: z.string().describe('Text to synthesize into speech'),
      voice: z.string().optional().default('alloy').describe('Voice to use for speech'),
      instructions: z.string().optional().describe('Voice style instructions'),
      responseFormat: z
        .enum(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'])
        .optional()
        .default('mp3')
        .describe('Audio format to return'),
      speed: z.number().min(0.25).max(4).optional().describe('Playback speed multiplier')
    })
  )
  .output(
    z.object({
      audioBase64: z.string().describe('Base64-encoded generated audio'),
      format: z.string().describe('Audio format'),
      contentType: z.string().optional().describe('Returned content type')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.createSpeech({
      model: ctx.input.model,
      input: ctx.input.input,
      voice: ctx.input.voice,
      instructions: ctx.input.instructions,
      responseFormat: ctx.input.responseFormat,
      speed: ctx.input.speed
    });

    return {
      output: {
        audioBase64: result.audioBase64,
        format: ctx.input.responseFormat,
        contentType: result.contentType
      },
      message: `Generated ${ctx.input.responseFormat} speech audio.`
    };
  })
  .build();

export let transcribeAudio = SlateTool.create(spec, {
  name: 'Transcribe Audio',
  key: 'transcribe_audio',
  description: 'Transcribe speech from an uploaded audio file into the source language text.',
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    audioFileInputSchema.extend({
      model: z
        .string()
        .optional()
        .default('gpt-4o-mini-transcribe')
        .describe('Speech-to-text model to use'),
      language: z.string().optional().describe('Input language in ISO-639-1 format'),
      prompt: z.string().optional().describe('Optional prompt to guide transcription'),
      responseFormat: z
        .enum(['json', 'text', 'srt', 'verbose_json', 'vtt'])
        .optional()
        .default('json')
        .describe('Transcription response format'),
      temperature: z.number().min(0).max(1).optional().describe('Sampling temperature')
    })
  )
  .output(audioTextResultSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.createTranscription({
      filename: ctx.input.filename,
      fileContent: ctx.input.fileContent,
      fileContentBase64: ctx.input.fileContentBase64,
      mimeType: ctx.input.mimeType,
      model: ctx.input.model,
      language: ctx.input.language,
      prompt: ctx.input.prompt,
      responseFormat: ctx.input.responseFormat,
      temperature: ctx.input.temperature
    });
    let text = getAudioText(result);

    return {
      output: {
        text,
        rawResult: result
      },
      message: `Transcribed audio file **${ctx.input.filename}**.`
    };
  })
  .build();

export let translateAudio = SlateTool.create(spec, {
  name: 'Translate Audio',
  key: 'translate_audio',
  description: 'Translate speech from an uploaded audio file into English text.',
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    audioFileInputSchema.extend({
      model: z
        .string()
        .optional()
        .default('whisper-1')
        .describe('Audio translation model to use'),
      prompt: z.string().optional().describe('Optional prompt to guide translation'),
      responseFormat: z
        .enum(['json', 'text', 'srt', 'verbose_json', 'vtt'])
        .optional()
        .default('json')
        .describe('Translation response format'),
      temperature: z.number().min(0).max(1).optional().describe('Sampling temperature')
    })
  )
  .output(audioTextResultSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.createTranslation({
      filename: ctx.input.filename,
      fileContent: ctx.input.fileContent,
      fileContentBase64: ctx.input.fileContentBase64,
      mimeType: ctx.input.mimeType,
      model: ctx.input.model,
      prompt: ctx.input.prompt,
      responseFormat: ctx.input.responseFormat,
      temperature: ctx.input.temperature
    });
    let text = getAudioText(result);

    return {
      output: {
        text,
        rawResult: result
      },
      message: `Translated audio file **${ctx.input.filename}**.`
    };
  })
  .build();
