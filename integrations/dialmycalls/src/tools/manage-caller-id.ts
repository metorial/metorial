import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCallerId = SlateTool.create(spec, {
  name: 'Manage Caller ID',
  key: 'manage_caller_id',
  description: `Create, update, verify, or delete caller IDs used as outgoing numbers for voice call broadcasts.
- **create**: Add a verified caller ID directly.
- **create_unverified**: Initiate a phone verification process (you'll receive a call with a PIN).
- **verify**: Submit the PIN to complete verification of an unverified caller ID.
- **update**: Rename an existing caller ID.
- **delete**: Remove a caller ID.`
})
  .input(
    z.object({
      action: z
        .enum(['create', 'create_unverified', 'verify', 'update', 'delete'])
        .describe('The operation to perform.'),
      callerIdId: z
        .string()
        .optional()
        .describe('Required for verify, update, and delete actions.'),
      phone: z
        .string()
        .optional()
        .describe('Phone number. Required for create and create_unverified.'),
      name: z
        .string()
        .optional()
        .describe('Caller ID name. Required for create, create_unverified, and update.'),
      pin: z
        .string()
        .optional()
        .describe('Verification PIN received via phone. Required for verify.')
    })
  )
  .output(
    z.object({
      callerIdId: z.string().optional(),
      name: z.string().optional(),
      phone: z.string().optional(),
      approved: z.boolean().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, callerIdId, phone, name, pin } = ctx.input;

    if (action === 'delete') {
      if (!callerIdId) throw new Error('callerIdId is required for delete action');
      await client.deleteCallerId(callerIdId);
      return {
        output: { callerIdId },
        message: `Caller ID \`${callerIdId}\` deleted successfully.`
      };
    }

    if (action === 'verify') {
      if (!callerIdId) throw new Error('callerIdId is required for verify action');
      if (!pin) throw new Error('pin is required for verify action');
      let result = await client.verifyCallerId(callerIdId, pin);
      return {
        output: {
          callerIdId: result.id,
          name: result.name,
          phone: result.phone,
          approved: result.approved,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Caller ID \`${callerIdId}\` verified successfully.`
      };
    }

    if (action === 'update') {
      if (!callerIdId) throw new Error('callerIdId is required for update action');
      if (!name) throw new Error('name is required for update action');
      let result = await client.updateCallerId(callerIdId, { name });
      return {
        output: {
          callerIdId: result.id,
          name: result.name,
          phone: result.phone,
          approved: result.approved,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Caller ID \`${callerIdId}\` renamed to **${name}**.`
      };
    }

    if (action === 'create_unverified') {
      if (!phone) throw new Error('phone is required for create_unverified action');
      if (!name) throw new Error('name is required for create_unverified action');
      let result = await client.createUnverifiedCallerId({ phone, name });
      return {
        output: {
          callerIdId: result.id,
          name: result.name,
          phone: result.phone,
          approved: result.approved,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Unverified caller ID created with ID \`${result.id}\`. A verification call with a PIN has been initiated to **${phone}**. Use the verify action with the PIN to complete setup.`
      };
    }

    // create (verified)
    if (!phone) throw new Error('phone is required for create action');
    if (!name) throw new Error('name is required for create action');
    let result = await client.createCallerId({ phone, name });
    return {
      output: {
        callerIdId: result.id,
        name: result.name,
        phone: result.phone,
        approved: result.approved,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `Caller ID **${result.name}** (${result.phone}) created with ID \`${result.id}\`.`
    };
  })
  .build();
