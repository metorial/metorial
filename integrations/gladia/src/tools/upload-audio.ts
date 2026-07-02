import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadAudio = SlateTool.create(spec, {
  name: 'Upload Audio',
  key: 'upload_audio',
  description: `Upload an audio or video file to Gladia's servers by providing its URL. Returns a Gladia-hosted URL that can be used with the **Transcribe Audio** tool. Useful for files that require hosting or when working with temporary/authenticated URLs.`,
  instructions: [
    'Provide a publicly accessible URL to the audio or video file.',
    'The returned audioUrl can then be passed to the Transcribe Audio tool.'
  ],
  constraints: [
    'The source URL must be publicly accessible.',
    'Supports common audio/video formats: WAV, MP3, FLAC, AAC, M4A, etc.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      audioUrl: z
        .string()
        .describe('Publicly accessible URL of the audio or video file to upload')
    })
  )
  .output(
    z.object({
      audioUrl: z
        .string()
        .describe('Gladia-hosted URL for the uploaded file, use this with Transcribe Audio'),
      fileId: z.string().describe('Unique ID of the uploaded file'),
      filename: z.string().describe('Original filename'),
      extension: z.string().describe('File extension'),
      size: z.number().describe('File size in bytes'),
      audioDuration: z.number().describe('Duration of the audio in seconds'),
      numberOfChannels: z.number().describe('Number of audio channels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Uploading audio file...');
    let result = await client.uploadAudioFromUrl(ctx.input.audioUrl);

    return {
      output: {
        audioUrl: result.audio_url,
        fileId: result.audio_metadata.id,
        filename: result.audio_metadata.filename,
        extension: result.audio_metadata.extension,
        size: result.audio_metadata.size,
        audioDuration: result.audio_metadata.audio_duration,
        numberOfChannels: result.audio_metadata.number_of_channels
      },
      message: `Audio file **uploaded** successfully. File: \`${result.audio_metadata.filename}\`, Duration: ${result.audio_metadata.audio_duration.toFixed(1)}s, Channels: ${result.audio_metadata.number_of_channels}.`
    };
  })
  .build();
