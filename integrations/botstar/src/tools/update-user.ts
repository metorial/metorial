import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update a chatbot user's profile information and custom attributes. You can update standard fields like name, email, gender, birthday, or set custom attribute values.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      botId: z.string().describe('ID of the bot the user belongs to'),
      userId: z.string().describe('ID of the user to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated email address'),
      gender: z.string().optional().describe('Updated gender'),
      birthday: z.string().optional().describe('Updated birthday'),
      customAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom attributes to set or update as key-value pairs')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);

    let updates: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) updates.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) updates.last_name = ctx.input.lastName;
    if (ctx.input.email !== undefined) updates.email = ctx.input.email;
    if (ctx.input.gender !== undefined) updates.gender = ctx.input.gender;
    if (ctx.input.birthday !== undefined) updates.birthday = ctx.input.birthday;
    if (ctx.input.customAttributes) {
      Object.assign(updates, ctx.input.customAttributes);
    }

    await client.updateUser(ctx.input.botId, ctx.input.userId, updates);

    return {
      output: { success: true },
      message: `Updated user **${ctx.input.userId}** successfully.`
    };
  })
  .build();
