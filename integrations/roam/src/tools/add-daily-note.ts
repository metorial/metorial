import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let addDailyNote = SlateTool.create(spec, {
  name: 'Add Daily Note',
  key: 'add_daily_note',
  description: `Add a block to a daily note page in the Roam Research graph. If no date is provided, uses today's date. The daily note page UID follows the format \`MM-DD-YYYY\`.

Useful for quick capture, journaling, and logging workflows.`,
  instructions: [
    'The date should be in MM-DD-YYYY format (e.g., "01-15-2025").',
    'If the daily note page does not exist yet, it will be created automatically when a block is added.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      content: z.string().describe('Text content of the block to add to the daily note'),
      date: z
        .string()
        .optional()
        .describe('Date in MM-DD-YYYY format. Defaults to today if not provided.'),
      order: z
        .union([z.number(), z.enum(['first', 'last'])])
        .default('last')
        .describe('Position: "first" to prepend, "last" to append, or a specific number')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the block was added successfully'),
      dailyNoteUid: z.string().describe('UID of the daily note page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let dateStr = ctx.input.date;
    if (!dateStr) {
      let now = new Date();
      let month = String(now.getMonth() + 1).padStart(2, '0');
      let day = String(now.getDate()).padStart(2, '0');
      let year = now.getFullYear();
      dateStr = `${month}-${day}-${year}`;
    }

    let result = await client.createBlock(
      {
        parentUid: dateStr,
        order: ctx.input.order
      },
      {
        string: ctx.input.content
      }
    );

    return {
      output: {
        success: result.success,
        dailyNoteUid: dateStr
      },
      message: `Block added to daily note **${dateStr}** in graph **${ctx.config.graphName}**.`
    };
  })
  .build();
