import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fail, id, integer, mapUser, native, text } from '../lib/contracts';
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
      available: z.boolean().optional().describe('Whether the user is available'),
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
      extensionExact: z
        .string()
        .nullable()
        .optional()
        .describe('Native extension string, preserving leading zeros'),
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
      createdAt: z.string().optional().describe('Creation date as ISO string')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth),
      user = await client.getUser(id(ctx.input.userId)),
      base = mapUser(user);
    const availability = ctx.input.checkAvailability
      ? await client.getUserAvailability(ctx.input.userId)
      : undefined;
    let extension: number | null = null;
    let extensionExact: string | null = null;
    if (user.extension !== undefined && user.extension !== null) {
      extensionExact =
        typeof user.extension === 'string'
          ? text(user.extension, 'Native extension')
          : String(integer(user.extension, 'Native extension'));
      if (
        /^(0|[1-9]\d*)$/.test(extensionExact) &&
        Number.isSafeInteger(Number(extensionExact))
      )
        extension = Number(extensionExact);
    }
    const numbers = user.numbers;
    if (!Array.isArray(numbers))
      fail('Aircall omitted native user number assignments.', 'aircall_receipt');
    return {
      output: {
        ...base,
        directLink:
          user.direct_link == null ? null : text(user.direct_link, 'Native direct link'),
        substatus: user.substatus == null ? null : text(user.substatus, 'Native substatus'),
        realtimeAvailability: availability
          ? text(availability.availability, 'Native availability')
          : null,
        extension,
        extensionExact,
        numbers: numbers.map(value => {
          const n = native(value, 'number');
          return {
            numberId: id(n.id),
            digits: text(n.digits, 'Native number'),
            name: n.name == null ? null : text(n.name, 'Native number name')
          };
        })
      },
      message: `Retrieved ${base.name}; V1 user endpoints remain available but have announced deprecation.`
    };
  })
  .build();
