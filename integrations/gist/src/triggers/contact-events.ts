import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers when contact-related events occur: user/lead created or deleted, tagged/untagged, custom attribute updated, email updated, email unsubscribed, lead submitted email, event performed, or form submitted.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      timestamp: z.string().optional().describe('Event timestamp'),
      contactId: z.string().optional().describe('Contact ID'),
      contactType: z.string().optional().describe('Contact type (user or lead)'),
      contactEmail: z.string().optional().describe('Contact email'),
      contactName: z.string().optional().describe('Contact name'),
      tagName: z.string().optional().describe('Tag name (for tagged/untagged events)'),
      customAttribute: z
        .string()
        .optional()
        .describe('Custom attribute name (for attribute updates)'),
      eventName: z.string().optional().describe('Event name (for performed event)'),
      formId: z.string().optional().describe('Form ID (for form submitted)'),
      raw: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('Contact ID'),
      contactType: z.string().optional().describe('Contact type (user or lead)'),
      contactEmail: z.string().optional().describe('Contact email'),
      contactName: z.string().optional().describe('Contact name'),
      tagName: z.string().optional().describe('Tag name if applicable'),
      customAttribute: z.string().optional().describe('Custom attribute name if applicable'),
      eventName: z.string().optional().describe('Tracked event name if applicable'),
      formId: z.string().optional().describe('Form ID if applicable'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let topic = data.topic || '';
      let contact = data.contact || data.user || data.lead || data.data?.contact || {};

      let input: any = {
        topic,
        timestamp: data.timestamp ? String(data.timestamp) : undefined,
        contactId: contact.id ? String(contact.id) : undefined,
        contactType: contact.type,
        contactEmail: contact.email,
        contactName: contact.name,
        raw: data
      };

      if (topic === 'contact.tagged' || topic === 'contact.untagged') {
        input.tagName = data.tag?.name || data.data?.tag?.name;
      }
      if (topic === 'custom_attribute.updated') {
        input.customAttribute = data.attribute?.name || data.data?.attribute?.name;
      }
      if (topic === 'contact.performed_event') {
        input.eventName = data.event?.name || data.data?.event?.name;
      }
      if (topic === 'contact.submitted_form') {
        let formId = data.form?.id || data.data?.form?.id;
        input.formId = formId ? String(formId) : undefined;
      }

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let topicMap: Record<string, string> = {
        'user.created': 'contact.created',
        'lead.created': 'contact.created',
        'user.deleted': 'contact.deleted',
        'lead.deleted': 'contact.deleted',
        'contact.tagged': 'contact.tagged',
        'contact.untagged': 'contact.untagged',
        'custom_attribute.updated': 'contact.attribute_updated',
        'contact.email_updated': 'contact.email_updated',
        'contact.unsubscribed_emails': 'contact.unsubscribed',
        'lead.submitted_email': 'contact.lead_submitted_email',
        'contact.performed_event': 'contact.performed_event',
        'contact.submitted_form': 'contact.submitted_form'
      };

      let type = topicMap[ctx.input.topic] || ctx.input.topic;
      let id = `${ctx.input.topic}-${ctx.input.contactId || ''}-${ctx.input.timestamp || Date.now()}`;

      return {
        type,
        id,
        output: {
          contactId: ctx.input.contactId,
          contactType: ctx.input.contactType,
          contactEmail: ctx.input.contactEmail,
          contactName: ctx.input.contactName,
          tagName: ctx.input.tagName,
          customAttribute: ctx.input.customAttribute,
          eventName: ctx.input.eventName,
          formId: ctx.input.formId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
