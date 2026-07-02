import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRedactedAudio = SlateTool.create(spec, {
  name: 'Get Redacted Audio',
  key: 'get_redacted_audio',
  description: `Retrieve the URL for a PII-redacted audio file. The original transcription must have been submitted with PII audio redaction enabled (\`redactPiiAudio: true\`).
The redacted audio has personally identifiable information "beeped" out.`,
  constraints: [
    'Redacted audio files are only available for 24 hours after generation. Download promptly.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptId: z
        .string()
        .describe('The transcript ID that has PII audio redaction enabled.')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe('Status of the redacted audio (e.g., "redacted_audio_ready").'),
      redactedAudioUrl: z.string().describe('URL to download the redacted audio file.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getRedactedAudio(ctx.input.transcriptId);

    return {
      output: {
        status: result.status,
        redactedAudioUrl: result.redacted_audio_url
      },
      message: `Redacted audio is ready for transcript **${ctx.input.transcriptId}**. [Download link](${result.redacted_audio_url}) (expires in 24 hours).`
    };
  })
  .build();
