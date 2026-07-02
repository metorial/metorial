import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAgent = SlateTool.create(spec, {
  name: 'Manage Agent',
  key: 'manage_agent',
  description: `Create a new agent or update an existing agent's settings. Manage phone number, extension, timezone, priority, and do-not-disturb mode.
- To **create** an agent, omit the agentId and provide name and phone number.
- To **update** an agent, provide the agentId along with the fields to change.
- To **delete** an agent, set the \`delete\` flag to true with the agentId.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      agentId: z
        .string()
        .optional()
        .describe('ID of the agent to update or delete. Omit to create a new agent.'),
      firstName: z.string().optional().describe('Agent first name (required when creating)'),
      lastName: z.string().optional().describe('Agent last name (required when creating)'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Agent phone number (required when creating)'),
      ext: z.string().optional().describe('Phone extension'),
      timezone: z.string().optional().describe('Agent timezone (e.g., "America/New_York")'),
      priority: z.number().optional().describe('Agent priority level'),
      doNotDisturb: z.boolean().optional().describe('Enable or disable do-not-disturb mode'),
      doNotDisturbUntil: z
        .string()
        .optional()
        .describe('ISO 8601 datetime for when DND mode expires'),
      delete: z.boolean().optional().describe('Set to true to delete the agent')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('ID of the agent'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phoneNumber: z.string().optional().describe('Phone number'),
      isAvailable: z.boolean().optional().describe('Whether the agent is currently available'),
      deleted: z.boolean().optional().describe('Whether the agent was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.delete && ctx.input.agentId) {
      await client.deleteAgent(ctx.input.agentId);
      return {
        output: {
          agentId: ctx.input.agentId,
          deleted: true
        },
        message: `Agent **${ctx.input.agentId}** deleted successfully.`
      };
    }

    if (ctx.input.agentId) {
      let data: Record<string, any> = {};
      if (ctx.input.firstName !== undefined) data.fname = ctx.input.firstName;
      if (ctx.input.lastName !== undefined) data.lname = ctx.input.lastName;
      if (ctx.input.phoneNumber !== undefined) data.phone_number = ctx.input.phoneNumber;
      if (ctx.input.ext !== undefined) data.ext = ctx.input.ext;
      if (ctx.input.timezone !== undefined) data.timezone = ctx.input.timezone;
      if (ctx.input.priority !== undefined) data.priority = ctx.input.priority;
      if (ctx.input.doNotDisturb !== undefined) data.donotdisturb = ctx.input.doNotDisturb;
      if (ctx.input.doNotDisturbUntil !== undefined)
        data.donotdisturb_until = ctx.input.doNotDisturbUntil;

      let result = await client.updateAgent(ctx.input.agentId, data);
      return {
        output: {
          agentId: String(result.id),
          firstName: result.fname,
          lastName: result.lname,
          phoneNumber: result.phone_number,
          isAvailable: result.is_available
        },
        message: `Agent **${result.fname ?? ''} ${result.lname ?? ''}** updated successfully.`
      };
    }

    let result = await client.createAgent({
      firstName: ctx.input.firstName!,
      lastName: ctx.input.lastName!,
      phoneNumber: ctx.input.phoneNumber!,
      ext: ctx.input.ext,
      timezone: ctx.input.timezone
    });

    return {
      output: {
        agentId: String(result.id),
        firstName: result.fname,
        lastName: result.lname,
        phoneNumber: result.phone_number,
        isAvailable: result.is_available
      },
      message: `Agent **${result.fname ?? ''} ${result.lname ?? ''}** created successfully.`
    };
  })
  .build();
