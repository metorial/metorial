import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBlockReasonsTool = SlateTool.create(spec, {
  name: 'List Block Reasons',
  key: 'list_block_reasons',
  description:
    'List blocking reasons and their IDs. Supply a board ID from list_boards to discover reasons assigned to that board before using block_card.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      boardId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Board ID from list_boards. Omit to list account-wide reasons.')
    })
  )
  .output(
    z.object({
      reasons: z
        .array(
          z.object({
            reasonId: z.number().describe('Block reason ID'),
            label: z.string().optional().describe('Reason name'),
            color: z.string().optional().describe('Hexadecimal color'),
            availability: z
              .number()
              .optional()
              .describe('Availability: 0=On-demand, 1=Auto, 2=Global'),
            isEnabled: z.number().optional().describe('Whether the reason is enabled (0 or 1)')
          })
        )
        .describe('Available block reasons')
    })
  )
  .handleInvocation(async ctx => {
    let reasons = await new Client(ctx.auth).listBlockReasons(ctx.input.boardId);
    return {
      output: {
        reasons: reasons.map((reason: any) => ({
          reasonId: reason.reason_id,
          label: reason.label,
          color: reason.color,
          availability: reason.availability,
          isEnabled: reason.is_enabled
        }))
      },
      message: `Found **${reasons.length}** block reason(s).`
    };
  })
  .build();
