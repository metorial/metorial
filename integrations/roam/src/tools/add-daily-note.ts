import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { fail } from '../lib/validation';
import { spec } from '../spec';
export let addDailyNote = SlateTool.create(spec, {
  name: 'Add Daily Note',
  key: 'add_daily_note',
  description:
    'Add a block to an existing daily note page identified by its MM-DD-YYYY UID. Defaults to the current UTC date.',
  instructions: [
    'The exact daily page must already exist. Open or create the desired daily note in Roam first if it is missing; this tool does not invent a page title.',
    'A lost or unconfirmed write may leave a block behind. Inspect its target UID before retrying.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      content: z.string().describe('Block text to add'),
      date: z
        .string()
        .optional()
        .describe('Valid calendar date in MM-DD-YYYY format; defaults to today in UTC'),
      order: z
        .union([
          z.number().nonnegative().max(Number.MAX_SAFE_INTEGER),
          z.enum(['first', 'last'])
        ])
        .default('last')
        .describe('Sibling position: nonnegative index, first, or last')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the block creation was confirmed'),
      dailyNoteUid: z.string().describe('Exact daily note page UID'),
      blockUid: z.string().describe('Exact created block UID for recovery'),
      verified: z.boolean().describe('Whether the requested block was independently read back')
    })
  )
  .handleInvocation(async ctx => {
    const now = new Date();
    const date =
      ctx.input.date ??
      `${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${now.getUTCFullYear()}`;
    if (!/^\d{2}-\d{2}-\d{4}$/.test(date))
      fail('Date must be a valid calendar date in MM-DD-YYYY format.');
    const [month, day, year] = date.split('-').map(Number);
    const calendar = new Date(
      `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00Z`
    );
    if (
      calendar.getUTCFullYear() !== year ||
      calendar.getUTCMonth() + 1 !== month ||
      calendar.getUTCDate() !== day
    )
      fail('Date must be a valid calendar date in MM-DD-YYYY format.');
    const client = new RoamClient({ graphName: ctx.config.graphName, token: ctx.auth.token });
    const page = await client.entity(date);
    if (!page || typeof page[':node/title'] !== 'string')
      fail(
        'The exact daily note page is missing. Open or create this daily note in Roam before adding a block; no write was sent.'
      );
    const result = await client.createBlock(
      { parentUid: date, order: ctx.input.order },
      { string: ctx.input.content }
    );
    return {
      output: {
        success: result.success,
        dailyNoteUid: date,
        blockUid: result.targetUid,
        verified: result.verified
      },
      message: 'Added the block to the existing daily note and confirmed its exact UID.'
    };
  })
  .build();
