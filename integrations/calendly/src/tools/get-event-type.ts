import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEventType = SlateTool.create(spec, {
  name: 'Get Event Type',
  key: 'get_event_type',
  description: `Retrieve detailed Calendly event type configuration, including scheduling URL, duration, location metadata, and custom questions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventTypeUri: z.string().describe('URI or UUID of the event type to retrieve')
    })
  )
  .output(
    z.object({
      eventTypeUri: z.string().describe('Unique URI of the event type'),
      name: z.string().describe('Event type name'),
      active: z.boolean().describe('Whether the event type is active'),
      slug: z.string().describe('URL-friendly identifier'),
      schedulingUrl: z.string().describe('Public scheduling URL'),
      duration: z.number().describe('Duration in minutes'),
      kind: z.string().describe('Kind of event type'),
      type: z.string().describe('Type classification'),
      color: z.string().describe('Display color'),
      descriptionPlain: z.string().nullable().describe('Plain text description'),
      descriptionHtml: z.string().nullable().describe('HTML description'),
      internalNote: z.string().nullable().describe('Internal note'),
      poolingType: z.string().nullable().describe('Pooling type for multi-host events'),
      secret: z.boolean().describe('Whether this is a secret event type'),
      customQuestions: z.array(z.any()).describe('Custom invitee questions'),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let eventType = await client.getEventType(ctx.input.eventTypeUri);

    return {
      output: {
        eventTypeUri: eventType.uri,
        name: eventType.name,
        active: eventType.active,
        slug: eventType.slug,
        schedulingUrl: eventType.schedulingUrl,
        duration: eventType.duration,
        kind: eventType.kind,
        type: eventType.type,
        color: eventType.color,
        descriptionPlain: eventType.descriptionPlain,
        descriptionHtml: eventType.descriptionHtml,
        internalNote: eventType.internalNote,
        poolingType: eventType.poolingType,
        secret: eventType.secret,
        customQuestions: eventType.customQuestions,
        createdAt: eventType.createdAt,
        updatedAt: eventType.updatedAt
      },
      message: `Retrieved event type **${eventType.name}** (${eventType.duration} minutes).`
    };
  })
  .build();
