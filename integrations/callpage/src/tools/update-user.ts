import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing user's information including name, phone number, email, and role.`,
  instructions: [
    'Phone number must be in E.164 format (e.g., +14155551234).',
    'Name and phoneNumber are required even when only changing other fields.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.number().describe('The ID of the user to update'),
      name: z.string().describe('Updated full name'),
      phoneNumber: z.string().describe('Updated phone number in E.164 format'),
      email: z.string().optional().describe('Updated email address'),
      role: z.enum(['admin', 'manager']).optional().describe('Updated role')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('The ID of the updated user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let result = await client.updateUser({
      userId: ctx.input.userId,
      name: ctx.input.name,
      phoneNumber: ctx.input.phoneNumber,
      email: ctx.input.email,
      role: ctx.input.role
    });

    return {
      output: { userId: result.userId },
      message: `Updated user **#${result.userId}** (**${ctx.input.name}**).`
    };
  })
  .build();
