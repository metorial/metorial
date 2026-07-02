import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { brevoServiceError } from '../lib/errors';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Track a custom event for a contact in Brevo. Events can be used for segmentation, automation triggers, and personalization.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z
        .string()
        .optional()
        .describe('Email address of the contact to associate the event with'),
      contactId: z
        .number()
        .optional()
        .describe('Brevo contact ID to associate the event with'),
      extId: z.string().optional().describe('External ID to associate the event with'),
      phone: z
        .string()
        .optional()
        .describe('Phone number identifier to associate the event with'),
      whatsapp: z
        .string()
        .optional()
        .describe('WhatsApp identifier to associate the event with'),
      landlineNumber: z
        .string()
        .optional()
        .describe('Landline number identifier to associate the event with'),
      eventName: z.string().describe('Name of the event to track'),
      eventDate: z.string().optional().describe('ISO 8601 timestamp when the event occurred'),
      contactProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Contact attributes to update while tracking the event'),
      eventProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Properties of the event for segmentation and personalization'),
      object: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional object record identifiers associated with the event')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was tracked successfully')
    })
  )
  .handleInvocation(async ctx => {
    if (
      !ctx.input.email &&
      ctx.input.contactId === undefined &&
      !ctx.input.extId &&
      !ctx.input.phone &&
      !ctx.input.whatsapp &&
      !ctx.input.landlineNumber
    ) {
      throw brevoServiceError(
        'Provide at least one identifier: email, contactId, extId, phone, whatsapp, or landlineNumber.'
      );
    }

    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.trackEvent({
      email: ctx.input.email,
      contactId: ctx.input.contactId,
      extId: ctx.input.extId,
      phone: ctx.input.phone,
      whatsapp: ctx.input.whatsapp,
      landlineNumber: ctx.input.landlineNumber,
      eventName: ctx.input.eventName,
      eventDate: ctx.input.eventDate,
      contactProperties: ctx.input.contactProperties,
      eventProperties: ctx.input.eventProperties,
      object: ctx.input.object
    });

    return {
      output: { success: true },
      message: `Event **${ctx.input.eventName}** tracked${ctx.input.email ? ` for ${ctx.input.email}` : ''}.`
    };
  });
