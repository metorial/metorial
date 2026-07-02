import { SlateTool } from 'slates';
import { z } from 'zod';
import { TextToSpeechClient } from '../lib/client';
import { azureSpeechServiceError } from '../lib/errors';
import { spec } from '../spec';
import { audioAttachment, audioOutput, audioOutputSchema } from './shared';

export let synthesizeSpeech = SlateTool.create(spec, {
  name: 'Synthesize Speech',
  key: 'synthesize_speech',
  description: `Converts text into natural-sounding synthesized speech audio using Azure neural voices.
Provide either plain text (which will be wrapped in SSML automatically) or custom SSML for fine-grained control over pronunciation, prosody, speaking styles, pauses, and other speech characteristics.
Returns the synthesized audio as a Slate attachment.`,
  instructions: [
    'When providing plain text, specify a voiceName to select the desired voice. Use the **List Voices** tool to discover available voices.',
    'For advanced control (e.g., speaking styles, emphasis, breaks), provide custom SSML directly in the ssml field instead of text.',
    'The default output format is riff-24khz-16bit-mono-pcm (WAV). Use outputFormat to select a different format.'
  ],
  constraints: [
    'Audio output is truncated to 10 minutes maximum.',
    'Generated audio is returned as an attachment; tool output only includes metadata.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      text: z
        .string()
        .optional()
        .describe(
          'Plain text to synthesize. If provided, it will be wrapped in SSML using the specified voice. Mutually exclusive with ssml.'
        ),
      ssml: z
        .string()
        .optional()
        .describe(
          'Custom SSML markup for fine-grained speech synthesis control. Mutually exclusive with text.'
        ),
      voiceName: z
        .string()
        .optional()
        .describe(
          'Short name of the voice to use (e.g., "en-US-JennyNeural"). Required when using text input. Ignored when ssml is provided.'
        ),
      language: z
        .string()
        .optional()
        .default('en-US')
        .describe('Language code (e.g., "en-US"). Used when wrapping plain text in SSML.'),
      outputFormat: z
        .string()
        .optional()
        .default('riff-24khz-16bit-mono-pcm')
        .describe(
          'Audio output format (e.g., "audio-24khz-48kbitrate-mono-mp3", "riff-24khz-16bit-mono-pcm", "ogg-24khz-16bit-mono-opus").'
        )
    })
  )
  .output(audioOutputSchema)
  .handleInvocation(async ctx => {
    let { text, ssml, voiceName, language, outputFormat } = ctx.input;

    if (!text && !ssml) {
      throw azureSpeechServiceError('Either text or ssml must be provided.');
    }

    if (text && ssml) {
      throw azureSpeechServiceError('text and ssml are mutually exclusive.');
    }

    let finalSsml: string;
    if (ssml) {
      finalSsml = ssml;
    } else {
      if (!voiceName) {
        throw azureSpeechServiceError('voiceName is required when using plain text input.');
      }
      let escapedText = text!
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      finalSsml = `<speak version='1.0' xml:lang='${language}'><voice xml:lang='${language}' name='${voiceName}'>${escapedText}</voice></speak>`;
    }

    let client = new TextToSpeechClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.info('Synthesizing speech...');

    let result = await client.synthesizeSpeech({
      ssml: finalSsml,
      outputFormat: outputFormat || 'riff-24khz-16bit-mono-pcm'
    });

    return {
      output: audioOutput(result),
      attachments: [audioAttachment(result)],
      message: `Successfully synthesized speech. Audio format: **${outputFormat}**, content type: ${result.contentType}.`
    };
  })
  .build();
