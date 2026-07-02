import { SlateTool } from 'slates';
import { z } from 'zod';
import { DemioClient } from '../lib/client';
import { spec } from '../spec';

export let registerParticipant = SlateTool.create(spec, {
  name: 'Register Participant',
  key: 'register_participant',
  description: `Register a participant for a Demio webinar event and receive their unique join link. You can register by event ID (optionally targeting a specific date), or by a registration reference URL.`,
  instructions: [
    'Provide either an eventId or a referenceUrl, not both.',
    'When using eventId without dateId, the system registers for the next available session.',
    'Custom fields can be passed as key-value pairs where keys are the Demio custom field unique identifiers.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventId: z
        .string()
        .optional()
        .describe('The event ID to register for. Required if referenceUrl is not provided.'),
      dateId: z
        .string()
        .optional()
        .describe('A specific event date/session ID to register for. Only used with eventId.'),
      referenceUrl: z
        .string()
        .optional()
        .describe(
          'A Demio registration reference URL to register via. Alternative to eventId.'
        ),
      name: z.string().describe('Full name of the registrant'),
      email: z.string().describe('Email address of the registrant'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Custom fields as key-value pairs. Keys must be Demio custom field unique identifiers.'
        )
    })
  )
  .output(
    z.object({
      hash: z.string().describe('Unique registration hash'),
      joinLink: z
        .string()
        .describe('Unique join link for the registrant to access the webinar')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DemioClient({
      token: ctx.auth.token,
      apiSecret: ctx.auth.apiSecret
    });

    let data: Record<string, unknown> = {
      name: ctx.input.name,
      email: ctx.input.email
    };

    if (ctx.input.referenceUrl) {
      data.ref_url = ctx.input.referenceUrl;
    } else if (ctx.input.eventId) {
      data.id = Number(ctx.input.eventId);
      if (ctx.input.dateId) {
        data.date_id = Number(ctx.input.dateId);
      }
    }

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        data[key] = value;
      }
    }

    let result = await client.register(data as any);

    return {
      output: {
        hash: result.hash,
        joinLink: result.join_link
      },
      message: `Registered **${ctx.input.name}** (${ctx.input.email}). Join link: ${result.join_link}`
    };
  })
  .build();
