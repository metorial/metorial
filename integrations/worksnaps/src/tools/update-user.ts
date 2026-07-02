import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update a user account's profile information. Only the fields provided will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('The ID of the user to update'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      email: z.string().optional().describe('New email address'),
      timezoneId: z.number().optional().describe('New timezone ID')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.unknown()).describe('The updated user account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data: Record<string, unknown> = {};
    if (ctx.input.firstName !== undefined) data.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) data.lastName = ctx.input.lastName;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.timezoneId !== undefined) data.timezoneId = ctx.input.timezoneId;

    let user = await client.updateUser(ctx.input.userId, data);

    return {
      output: { user },
      message: `Updated user **${ctx.input.userId}**.`
    };
  })
  .build();
