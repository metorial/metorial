import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers when contacts are created, updated, deleted, archived, merged, tagged, or when subscription changes occur.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      eventId: z.string().describe('Unique event identifier'),
      contact: z.any().describe('Contact data from webhook payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Intercom contact ID'),
      role: z.string().optional().describe('Contact role (user or lead)'),
      email: z.string().optional().describe('Contact email'),
      name: z.string().optional().describe('Contact name'),
      phone: z.string().optional().describe('Contact phone'),
      externalId: z.string().optional().describe('External ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      customAttributes: z.record(z.string(), z.any()).optional().describe('Custom attributes'),
      tagId: z.string().optional().describe('Tag ID (for tag events)'),
      tagName: z.string().optional().describe('Tag name (for tag events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let topic = data.topic || '';
      let contactTopics = [
        'contact.user.created',
        'contact.lead.created',
        'contact.user.updated',
        'contact.lead.updated',
        'contact.archived',
        'contact.unarchive',
        'contact.deleted',
        'contact.merged',
        'contact.email.updated',
        'contact.lead.added_email',
        'contact.lead.signed_up',
        'contact.user.tag.created',
        'contact.user.tag.deleted',
        'contact.lead.tag.created',
        'contact.lead.tag.deleted',
        'contact.subscribed',
        'contact.unsubscribed'
      ];

      if (!contactTopics.includes(topic)) {
        return { inputs: [] };
      }

      let eventId =
        data.id || `${topic}-${data.data?.item?.id || ''}-${data.created_at || Date.now()}`;

      return {
        inputs: [
          {
            topic,
            eventId,
            contact: data.data?.item
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let contact = ctx.input.contact || {};

      return {
        type: ctx.input.topic,
        id: ctx.input.eventId,
        output: {
          contactId: contact.id || '',
          role: contact.role,
          email: contact.email,
          name: contact.name,
          phone: contact.phone,
          externalId: contact.external_id,
          createdAt: contact.created_at ? String(contact.created_at) : undefined,
          updatedAt: contact.updated_at ? String(contact.updated_at) : undefined,
          customAttributes: contact.custom_attributes,
          tagId: contact.tag?.id,
          tagName: contact.tag?.name
        }
      };
    }
  })
  .build();
