import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let managePhoneNumberTool = SlateTool.create(spec, {
  name: 'Manage Phone Number',
  key: 'manage_phone_number',
  description: `List, assign, or unassign Dialpad phone numbers. Numbers can be assigned to users, offices, rooms, or call routers.`
})
  .input(
    z.object({
      action: z.enum(['list', 'assign', 'unassign']).describe('Action to perform'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Phone number (E.164 format) for assign/unassign'),
      targetType: z
        .enum(['user', 'office', 'room', 'call_router'])
        .optional()
        .describe('Target type for the number'),
      targetId: z.string().optional().describe('Target ID for the number'),
      cursor: z.string().optional().describe('Pagination cursor (for list action)')
    })
  )
  .output(
    z.object({
      numbers: z
        .array(
          z.object({
            phoneNumber: z.string().optional(),
            targetType: z.string().optional(),
            targetId: z.string().optional()
          })
        )
        .optional()
        .describe('List of phone numbers (for list action)'),
      nextCursor: z.string().optional(),
      success: z.boolean().optional().describe('Whether the assign/unassign was successful'),
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
      let result = await client.listNumbers({
        cursor: ctx.input.cursor,
        target_type: ctx.input.targetType,
        target_id: ctx.input.targetId
      });

      let numbers = (result.items || []).map((n: any) => ({
        phoneNumber: n.number || n.phone_number,
        targetType: n.target_type,
        targetId: n.target_id ? String(n.target_id) : undefined
      }));

      return {
        output: {
          numbers,
          nextCursor: result.cursor || undefined,
          actionPerformed: 'list'
        },
        message: `Found **${numbers.length}** phone number(s)`
      };
    }

    if (action === 'assign') {
      if (!ctx.input.phoneNumber) throw new Error('Phone number is required for assign');
      if (!ctx.input.targetType) throw new Error('Target type is required for assign');
      if (!ctx.input.targetId) throw new Error('Target ID is required for assign');

      await client.assignNumber({
        number: ctx.input.phoneNumber,
        target_type: ctx.input.targetType,
        target_id: Number(ctx.input.targetId)
      });

      return {
        output: { success: true, actionPerformed: 'assign' },
        message: `Assigned **${ctx.input.phoneNumber}** to ${ctx.input.targetType} ${ctx.input.targetId}`
      };
    }

    if (action === 'unassign') {
      if (!ctx.input.phoneNumber) throw new Error('Phone number is required for unassign');
      if (!ctx.input.targetType) throw new Error('Target type is required for unassign');
      if (!ctx.input.targetId) throw new Error('Target ID is required for unassign');

      await client.unassignNumber({
        number: ctx.input.phoneNumber,
        target_type: ctx.input.targetType,
        target_id: Number(ctx.input.targetId)
      });

      return {
        output: { success: true, actionPerformed: 'unassign' },
        message: `Unassigned **${ctx.input.phoneNumber}** from ${ctx.input.targetType} ${ctx.input.targetId}`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
