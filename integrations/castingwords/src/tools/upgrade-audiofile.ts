import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let upgradeAudiofile = SlateTool.create(spec, {
  name: 'Upgrade Audiofile',
  key: 'upgrade_audiofile',
  description: `Upgrade an existing audiofile order with additional services or a faster transcription tier.

**Available upgrade SKUs:**
- \`UPGRD1\` — Budget to 7-Day
- \`UPGRD2\` — Budget to 1-Day
- \`UPGRD3\` — 7-Day to 1-Day
- \`EDIT01\` — Extra Editing
- \`DIFFQ2\` — Difficult Audio
- \`TSTMP1\` — Timestamps`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      audiofileId: z.number().describe('ID of the audiofile to upgrade'),
      skus: z.array(z.string()).min(1).describe('One or more upgrade SKU codes to apply'),
      test: z
        .boolean()
        .optional()
        .describe('Set to true for test mode (only works with audiofile IDs 100 and 101)')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message from CastingWords')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.upgradeAudiofile(
      ctx.input.audiofileId,
      ctx.input.skus,
      ctx.input.test
    );

    return {
      output: {
        message: result.message ?? 'Upgrade applied successfully'
      },
      message: `Upgraded audiofile **${ctx.input.audiofileId}** with SKUs: ${ctx.input.skus.join(', ')}.`
    };
  })
  .build();
