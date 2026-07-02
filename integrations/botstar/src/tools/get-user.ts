import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve audience/user information for a specific chatbot user. Returns profile data including name, email, timezone, and any custom attributes. The user ID can be found in Reports & Insights > Audience.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('ID of the bot the user belongs to'),
      userId: z.string().describe('ID of the user to retrieve')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Unique identifier of the user'),
      firstName: z.string().optional().describe('First name of the user'),
      lastName: z.string().optional().describe('Last name of the user'),
      name: z.string().optional().describe('Full name of the user'),
      email: z.string().optional().describe('Email address of the user'),
      gender: z.string().optional().describe('Gender of the user'),
      birthday: z.string().optional().describe('Birthday of the user'),
      timezone: z.string().optional().describe('Timezone of the user'),
      customAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom attributes set on the user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    let user = await client.getUser(ctx.input.botId, ctx.input.userId);

    return {
      output: {
        userId: user.id || user._id || '',
        firstName: user.first_name,
        lastName: user.last_name,
        name: user.name,
        email: user.email,
        gender: user.gender,
        birthday: user.birthday,
        timezone: user.timezone,
        customAttributes: user.custom_attributes || user.attributes
      },
      message: `Retrieved user **${user.name || user.first_name || ctx.input.userId}**.`
    };
  })
  .build();
