import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact & Member Events',
  key: 'contact_events',
  description:
    'Triggers on CRM contact and member events including created, updated, deleted, and member login events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of contact/member event'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().describe('ID of the affected contact or member'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('Contact ID'),
      memberId: z.string().optional().describe('Member ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Primary email address'),
      phone: z.string().optional().describe('Primary phone number'),
      company: z.string().optional().describe('Company name'),
      createdDate: z.string().optional().describe('When the contact was created'),
      updatedDate: z.string().optional().describe('When the contact was last updated'),
      rawPayload: z.any().optional().describe('Complete raw event data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let eventType = data.eventType || data.type || 'unknown';
      let eventId = data.eventId || `${data.instanceId}-${Date.now()}`;
      let payload = data.data || data;

      let resourceId =
        payload.contact?.id ||
        payload.member?.id ||
        payload.contactId ||
        payload.memberId ||
        eventId;

      return {
        inputs: [
          {
            eventType,
            eventId,
            resourceId,
            payload
          }
        ]
      };
    },
    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      let contact = payload.contact || payload;
      let member = payload.member;
      let info = contact?.info || contact;

      let type = ctx.input.eventType.toLowerCase().replace(/\//g, '.').replace(/\s+/g, '_');
      if (!type.includes('.')) {
        type = `contact.${type}`;
      }

      return {
        type,
        id: ctx.input.eventId,
        output: {
          contactId: contact?.id || payload.contactId,
          memberId: member?.id || payload.memberId,
          firstName: info?.name?.first,
          lastName: info?.name?.last,
          email: info?.emails?.[0]?.email || member?.loginEmail,
          phone: info?.phones?.[0]?.phone,
          company: info?.company,
          createdDate: contact?.createdDate || contact?._createdDate,
          updatedDate: contact?.updatedDate || contact?._updatedDate,
          rawPayload: payload
        }
      };
    }
  })
  .build();
