import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let manageCallCenterTool = SlateTool.create(spec, {
  name: 'Manage Call Center',
  key: 'manage_call_center',
  description: `Create, update, or delete a Dialpad call center. Also supports managing operators — adding or removing agents from a call center.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'add_operator', 'remove_operator'])
        .describe('Action to perform'),
      callCenterId: z
        .string()
        .optional()
        .describe(
          'Call center ID (required for update, delete, add_operator, remove_operator)'
        ),
      officeId: z.string().optional().describe('Office ID (required for create)'),
      name: z.string().optional().describe('Call center name (for create/update)'),
      description: z
        .string()
        .optional()
        .describe('Call center description (for create/update)'),
      operatorUserId: z.number().optional().describe('User ID to add/remove as operator'),
      operatorId: z.string().optional().describe('Operator ID (for remove_operator)'),
      skillLevel: z
        .number()
        .optional()
        .describe('Skill level for the operator (for add_operator)')
    })
  )
  .output(
    z.object({
      callCenterId: z.string().optional().describe('Call center ID'),
      name: z.string().optional(),
      state: z.string().optional(),
      actionPerformed: z.string(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let { action, callCenterId, officeId, name, description } = ctx.input;

    if (action === 'create') {
      if (!officeId) throw new Error('Office ID is required to create a call center');
      if (!name) throw new Error('Name is required to create a call center');

      let cc = await client.createCallCenter(officeId, { name, description });

      return {
        output: {
          callCenterId: String(cc.id),
          name: cc.name,
          state: cc.state,
          actionPerformed: 'create'
        },
        message: `Created call center **${cc.name}**`
      };
    }

    if (action === 'update') {
      if (!callCenterId) throw new Error('Call center ID is required');

      let updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      let cc = await client.updateCallCenter(callCenterId, updateData);

      return {
        output: {
          callCenterId: String(cc.id),
          name: cc.name,
          state: cc.state,
          actionPerformed: 'update'
        },
        message: `Updated call center **${cc.name || callCenterId}**`
      };
    }

    if (action === 'delete') {
      if (!callCenterId) throw new Error('Call center ID is required');

      await client.deleteCallCenter(callCenterId);

      return {
        output: {
          callCenterId,
          actionPerformed: 'delete',
          deleted: true
        },
        message: `Deleted call center **${callCenterId}**`
      };
    }

    if (action === 'add_operator') {
      if (!callCenterId) throw new Error('Call center ID is required');
      if (!ctx.input.operatorUserId) throw new Error('Operator user ID is required');

      await client.addCallCenterOperator(callCenterId, {
        user_id: ctx.input.operatorUserId,
        skill_level: ctx.input.skillLevel
      });

      return {
        output: {
          callCenterId,
          actionPerformed: 'add_operator'
        },
        message: `Added operator **${ctx.input.operatorUserId}** to call center **${callCenterId}**`
      };
    }

    if (action === 'remove_operator') {
      if (!callCenterId) throw new Error('Call center ID is required');
      if (!ctx.input.operatorId) throw new Error('Operator ID is required');

      await client.removeCallCenterOperator(callCenterId, ctx.input.operatorId);

      return {
        output: {
          callCenterId,
          actionPerformed: 'remove_operator'
        },
        message: `Removed operator **${ctx.input.operatorId}** from call center **${callCenterId}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
