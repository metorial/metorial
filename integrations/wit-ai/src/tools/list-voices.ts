import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let voiceSchema = z.object({
  name: z.string().describe('Voice identifier name'),
  locale: z.string().describe('Locale of the voice'),
  gender: z.string().optional().describe('Gender of the voice'),
  styles: z.array(z.string()).optional().describe('Available speaking styles')
});

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `List available voices for text-to-speech synthesis. Returns voice names, locales, genders, and available styles. Currently supports English (US).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      voices: z
        .record(z.string(), z.array(voiceSchema))
        .describe('Available voices grouped by locale')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.listVoices();

    return {
      output: {
        voices: result ?? {}
      },
      message: `Retrieved available voices for text-to-speech synthesis.`
    };
  })
  .build();
