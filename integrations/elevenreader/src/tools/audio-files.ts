import { type SlateAddAttachmentInput, SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { parseProviderResponse, voiceDesignResponse } from '../lib/responses';
import { spec } from '../spec';

let audioMetadata = z.object({
  contentType: z.string().describe('MIME type of the generated audio'),
  byteLength: z.number().describe('Size of the generated audio in bytes')
});

let deliverAudio = async (
  ctx: { addAttachment(input: SlateAddAttachmentInput): Promise<void> },
  audio: { audioBase64: string; contentType: string }
) => {
  let bytes = new Uint8Array(Buffer.from(audio.audioBase64, 'base64'));
  await ctx.addAttachment({
    type: 'content',
    content: new Response(bytes, { headers: { 'Content-Type': audio.contentType } }),
    mimeType: audio.contentType
  });
  return { contentType: audio.contentType, byteLength: bytes.byteLength };
};

export let generateSpeechTool = SlateTool.create(spec, {
  name: 'Generate Speech Audio',
  key: 'generate_speech',
  description: 'Convert text into a downloadable audio file using an ElevenLabs voice.',
  instructions: [
    'Call list_voices to discover voice IDs and list_models to discover compatible models.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      voiceId: z.string().describe('ID of the voice to use for speech generation'),
      text: z.string().describe('The text content to convert to speech'),
      modelId: z
        .string()
        .optional()
        .describe(
          'Model ID to use (e.g. "eleven_multilingual_v2", "eleven_flash_v2_5", "eleven_turbo_v2_5"). Defaults to "eleven_multilingual_v2"'
        ),
      languageCode: z
        .string()
        .optional()
        .describe('ISO 639-1 language code to enforce a specific language'),
      outputFormat: z
        .string()
        .optional()
        .describe(
          'Output audio format (e.g. "mp3_44100_128", "pcm_16000", "opus_48000_96"). Defaults to "mp3_44100_128"'
        ),
      voiceSettings: z
        .object({
          stability: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Voice stability (0-1). Lower values are more expressive'),
          similarityBoost: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Similarity boost (0-1). Higher values make voice closer to original'),
          style: z.number().min(0).max(1).optional().describe('Style exaggeration (0-1)'),
          useSpeakerBoost: z
            .boolean()
            .optional()
            .describe('Enable speaker boost for clearer voice'),
          speed: z
            .number()
            .min(0.25)
            .max(4.0)
            .optional()
            .describe('Speech speed multiplier (0.25-4.0)')
        })
        .optional()
        .describe('Voice settings for fine-tuning the output'),
      seed: z
        .number()
        .int()
        .min(0)
        .max(4294967295)
        .optional()
        .describe('Seed for deterministic output (0-4294967295)'),
      previousText: z
        .string()
        .optional()
        .describe('Text that came before for continuity when chaining generations'),
      nextText: z
        .string()
        .optional()
        .describe('Text that comes after for continuity when chaining generations'),
      applyTextNormalization: z
        .enum(['auto', 'on', 'off'])
        .optional()
        .describe('Text normalization mode')
    })
  )
  .output(audioMetadata)
  .handleInvocation(async ctx => {
    let audio = await new ElevenLabsClient(ctx.auth.token).textToSpeech(
      ctx.input.voiceId,
      ctx.input,
      true
    );
    return {
      output: await deliverAudio(ctx, audio),
      message: 'Generated speech audio ready for download.'
    };
  })
  .build();

export let generateSoundEffectFileTool = SlateTool.create(spec, {
  name: 'Generate Sound Effect Audio',
  key: 'generate_sound_effect_file',
  description: 'Generate a downloadable sound effect from a text description.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      text: z
        .string()
        .describe(
          'Text description of the desired sound effect (e.g. "thunder rumbling in the distance", "cat purring softly")'
        ),
      durationSeconds: z
        .number()
        .min(0.5)
        .max(30)
        .optional()
        .describe(
          'Duration of the sound effect in seconds (0.5-30). Auto-determined if omitted'
        ),
      promptInfluence: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'How closely to follow the prompt (0-1). Higher values are more literal. Defaults to 0.3'
        ),
      loop: z.boolean().optional().describe('Create a seamlessly looping sound effect'),
      outputFormat: z
        .string()
        .optional()
        .describe('Output audio format (e.g. "mp3_44100_128"). Defaults to "mp3_44100_128"')
    })
  )
  .output(audioMetadata)
  .handleInvocation(async ctx => {
    let audio = await new ElevenLabsClient(ctx.auth.token).generateSoundEffect(
      ctx.input,
      true
    );
    return {
      output: await deliverAudio(ctx, audio),
      message: 'Generated sound effect ready for download.'
    };
  })
  .build();

export let isolateAudioFileTool = SlateTool.create(spec, {
  name: 'Isolate Audio File',
  key: 'isolate_audio_file',
  description:
    'Remove background noise and prepare the isolated vocals as a downloadable file.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      audioBase64: z.string().describe('Base64-encoded audio file to process'),
      fileName: z
        .string()
        .optional()
        .describe('Original file name of the audio (e.g. "recording.mp3")')
    })
  )
  .output(audioMetadata)
  .handleInvocation(async ctx => {
    let audio = await new ElevenLabsClient(ctx.auth.token).isolateAudio(ctx.input, true);
    return {
      output: await deliverAudio(ctx, audio),
      message: 'Isolated audio ready for download.'
    };
  })
  .build();

export let designVoicePreviewsTool = SlateTool.create(spec, {
  name: 'Design Voice Previews',
  key: 'design_voice_previews',
  description:
    'Generate downloadable voice previews from a description. Save a selected preview with create_voice_from_preview before using it for speech.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      voiceDescription: z
        .string()
        .min(20)
        .max(1000)
        .describe(
          'Description of the voice to design (e.g. "A warm female voice with a British accent, mid-30s, calm and professional")'
        ),
      text: z
        .string()
        .min(100)
        .max(1000)
        .optional()
        .describe(
          'Sample text (100-1000 characters) to preview the voice. If not provided, set autoGenerateText to true'
        ),
      autoGenerateText: z
        .boolean()
        .optional()
        .describe('Automatically generate sample text if none is provided'),
      modelId: z
        .enum(['eleven_multilingual_ttv_v2', 'eleven_ttv_v3'])
        .optional()
        .describe('Voice design model')
    })
  )
  .output(
    z.object({
      previews: z.array(
        z.object({
          generatedVoiceId: z.string(),
          mediaType: z.string(),
          durationSecs: z.number(),
          byteLength: z.number()
        })
      ),
      text: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = parseProviderResponse(
      voiceDesignResponse,
      await new ElevenLabsClient(ctx.auth.token).designVoice(ctx.input),
      'voice previews'
    );
    let previews: {
      generatedVoiceId: string;
      mediaType: string;
      durationSecs: number;
      byteLength: number;
    }[] = [];
    for (let preview of result.previews) {
      let audio = await deliverAudio(ctx, {
        audioBase64: preview.audio_base_64,
        contentType: preview.media_type
      });
      previews.push({
        generatedVoiceId: preview.generated_voice_id,
        mediaType: preview.media_type,
        durationSecs: preview.duration_secs,
        byteLength: audio.byteLength
      });
    }
    return {
      output: { previews, text: result.text ?? undefined },
      message: `Generated ${previews.length} voice previews ready for download. Save a selected preview with create_voice_from_preview.`
    };
  })
  .build();
