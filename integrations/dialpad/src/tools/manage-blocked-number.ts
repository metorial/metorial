import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let manageBlockedNumberTool = SlateTool.create(spec, {
  name: 'Manage Blocked Number',
  key: 'manage_blocked_number',
  description: `List, add, or remove blocked phone numbers at the company level. Blocked numbers are prevented from calling into your Dialpad organization.`
})
  .input(
    z.object({
      action: z.enum(['list', 'block', 'unblock']).describe('Action to perform'),
      phoneNumber: z.string().optional().describe('Phone number to block (for block action)'),
      blockedNumberId: z
        .string()
        .optional()
        .describe('Blocked number ID to remove (for unblock action)'),
      cursor: z.string().optional().describe('Pagination cursor (for list action)')
    })
  )
  .output(
    z.object({
      blockedNumbers: z
        .array(
          z.object({
            blockedNumberId: z.string().optional(),
            phoneNumber: z.string().optional()
          })
        )
        .optional()
        .describe('List of blocked numbers (for list action)'),
      nextCursor: z.string().optional(),
      success: z.boolean().optional(),
      actionPerformed: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listBlockedNumbers({ cursor: ctx.input.cursor });

      let blockedNumbers = (result.items || []).map((n: any) => ({
        blockedNumberId: String(n.id),
        phoneNumber: n.phone_number || n.number
      }));

      return {
        output: {
          blockedNumbers,
          nextCursor: result.cursor || undefined,
          actionPerformed: 'list'
        },
        message: `Found **${blockedNumbers.length}** blocked number(s)`
      };
    }

    if (action === 'block') {
      if (!ctx.input.phoneNumber) throw new Error('Phone number is required to block');

      await client.blockNumber({ phone_number: ctx.input.phoneNumber });

      return {
        output: { success: true, actionPerformed: 'block' },
        message: `Blocked number **${ctx.input.phoneNumber}**`
      };
    }

    if (action === 'unblock') {
      if (!ctx.input.blockedNumberId)
        throw new Error('Blocked number ID is required to unblock');

      await client.unblockNumber(ctx.input.blockedNumberId);

      return {
        output: { success: true, actionPerformed: 'unblock' },
        message: `Unblocked number **${ctx.input.blockedNumberId}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
