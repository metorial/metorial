import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific user including their availability, assigned numbers, timezone, and role details. Optionally check the user's real-time availability status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('The ID of the user to retrieve'),
      checkAvailability: z
        .boolean()
        .optional()
        .describe(
          'Also fetch real-time availability status (available, offline, do_not_disturb, in_call, after_call_work)'
        )
    })
  )
  .output(
    z.object({
      userId: z.number().describe('Unique user identifier'),
      directLink: z
        .string()
        .nullable()
        .describe('Direct link to the user in Aircall dashboard'),
      name: z.string().describe('Full name of the user'),
      email: z.string().describe('Email address'),
      available: z.boolean().describe('Whether the user is available'),
      availabilityStatus: z.string().nullable().describe('Availability status'),
      substatus: z
        .string()
        .nullable()
        .describe(
          'Substatus (out_for_lunch, on_a_break, in_training, doing_back_office, other)'
        ),
      realtimeAvailability: z
        .string()
        .nullable()
        .describe(
          'Real-time availability if requested (available, offline, do_not_disturb, in_call, after_call_work)'
        ),
      timeZone: z.string().nullable().describe('User timezone'),
      language: z.string().nullable().describe('User language'),
      wrapUpTime: z.number().nullable().describe('Wrap-up time in seconds'),
      extension: z.number().nullable().describe('User extension number'),
      numbers: z
        .array(
          z.object({
            numberId: z.number(),
            digits: z.string(),
            name: z.string().nullable()
          })
        )
        .describe('Assigned phone numbers'),
      createdAt: z.string().describe('Creation date as ISO string')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let user = await client.getUser(ctx.input.userId);

    let realtimeAvailability: string | null = null;
    if (ctx.input.checkAvailability) {
      let availability = await client.getUserAvailability(ctx.input.userId);
      realtimeAvailability =
        availability.availability ?? availability.user?.availability ?? null;
    }

    let output = {
      userId: user.id,
      directLink: user.direct_link ?? null,
      name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      email: user.email,
      available: user.available ?? false,
      availabilityStatus: user.availability_status ?? null,
      substatus: user.substatus ?? null,
      realtimeAvailability,
      timeZone: user.time_zone ?? null,
      language: user.language ?? null,
      wrapUpTime: user.wrap_up_time ?? null,
      extension: user.extension ?? null,
      numbers: (user.numbers || []).map((n: any) => ({
        numberId: n.id,
        digits: n.digits,
        name: n.name ?? null
      })),
      createdAt: user.created_at
        ? new Date(user.created_at * 1000).toISOString()
        : new Date().toISOString()
    };

    return {
      output,
      message: `Retrieved user **${output.name}** (${output.email}) — availability: ${output.availabilityStatus ?? 'unknown'}${realtimeAvailability ? `, real-time: ${realtimeAvailability}` : ''}.`
    };
  })
  .build();
