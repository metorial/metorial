import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific user including their profile, work schedule, timezone, and availability.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userUuid: z.string().describe('UUID of the user to retrieve')
    })
  )
  .output(
    z.object({
      userUuid: z.string().describe('UUID of the user'),
      fullName: z.string().describe('Full name of the user'),
      email: z.string().optional().describe('Email address'),
      role: z.string().optional().describe('Organization role'),
      timezone: z.string().optional().describe('Timezone'),
      isActive: z.boolean().optional().describe('Whether the user is active'),
      occupation: z.string().optional().describe('Occupation or job title'),
      workDays: z.array(z.number()).optional().describe('Working days of the week'),
      workStartTime: z.string().optional().describe('Work start time'),
      raw: z.any().describe('Full user object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let user = await client.getUser(ctx.input.userUuid);

    return {
      output: {
        userUuid: user.uuid,
        fullName: user.full_name ?? user.name ?? '',
        email: user.email,
        role: user.role,
        timezone: user.timezone,
        isActive: user.is_active,
        occupation: user.occupation,
        workDays: user.work_days,
        workStartTime: user.work_start_time,
        raw: user
      },
      message: `Retrieved user **${user.full_name ?? user.name}**.`
    };
  })
  .build();
