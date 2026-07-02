import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let managePhoneNumber = SlateTool.create(spec, {
  name: 'Manage Phone Number',
  key: 'manage_phone_number',
  description: `Get, update, or delete a phone number on your account. Use this to view number details, update tags, change connection assignment, or release a number.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      phoneNumberId: z.string().describe('The unique ID of the phone number to manage'),
      action: z
        .enum(['get', 'update', 'delete'])
        .describe('Action to perform on the phone number'),
      tags: z.array(z.string()).optional().describe('Tags to assign (for update action)'),
      connectionId: z
        .string()
        .optional()
        .describe('Connection ID to assign (for update action)'),
      billingGroupId: z
        .string()
        .optional()
        .describe('Billing group ID to assign (for update action)'),
      externalPin: z
        .string()
        .optional()
        .describe('External PIN for port-out protection (for update action)')
    })
  )
  .output(
    z.object({
      phoneNumberId: z.string().describe('Unique ID of the phone number'),
      phoneNumber: z.string().optional().describe('Phone number in E.164 format'),
      status: z.string().optional().describe('Current status'),
      connectionId: z.string().optional().describe('Associated connection ID'),
      tags: z.array(z.string()).optional().describe('Tags on the number'),
      deleted: z.boolean().optional().describe('Whether the number was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      await client.deletePhoneNumber(ctx.input.phoneNumberId);
      return {
        output: {
          phoneNumberId: ctx.input.phoneNumberId,
          deleted: true
        },
        message: `Phone number **${ctx.input.phoneNumberId}** has been deleted.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updatePhoneNumber(ctx.input.phoneNumberId, {
        tags: ctx.input.tags,
        connectionId: ctx.input.connectionId,
        billingGroupId: ctx.input.billingGroupId,
        externalPin: ctx.input.externalPin
      });
      return {
        output: {
          phoneNumberId: result.id,
          phoneNumber: result.phone_number,
          status: result.status,
          connectionId: result.connection_id,
          tags: result.tags
        },
        message: `Phone number **${result.phone_number}** updated successfully.`
      };
    }

    let result = await client.getPhoneNumber(ctx.input.phoneNumberId);
    return {
      output: {
        phoneNumberId: result.id,
        phoneNumber: result.phone_number,
        status: result.status,
        connectionId: result.connection_id,
        tags: result.tags
      },
      message: `Phone number **${result.phone_number}** — Status: ${result.status}.`
    };
  })
  .build();
