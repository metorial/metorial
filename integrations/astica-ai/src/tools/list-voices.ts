import { SlateTool } from 'slates';
import { z } from 'zod';
import { AsticaVoiceClient } from '../lib/client';
import { spec } from '../spec';

export let listVoicesTool = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `Retrieve available voices from Astica's voice AI platform. Returns the catalog of built-in voices (expressive, programmable, neural) and any custom voice clones associated with your account.
Use this to discover available voice identifiers for use with the Text to Speech tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeClones: z
        .boolean()
        .optional()
        .describe('Also fetch custom voice clones associated with your account')
    })
  )
  .output(
    z.object({
      voices: z.any().describe('List of available built-in voices'),
      clones: z.any().optional().describe('List of custom voice clones (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AsticaVoiceClient(ctx.auth.token);

    ctx.info('Fetching available voices');

    let voices = await client.listVoices();

    let clones: any;
    if (ctx.input.includeClones) {
      ctx.info('Fetching voice clones');
      clones = await client.listVoiceClones();
    }

    return {
      output: {
        voices,
        clones
      },
      message: `Retrieved available voices.${ctx.input.includeClones ? ' Including custom voice clones.' : ''}`
    };
  })
  .build();
