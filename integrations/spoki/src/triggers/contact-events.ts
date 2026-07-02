import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers when a contact is created, updated, or deleted in Spoki. Also fires for tag changes, list membership changes, and custom field updates.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of contact event'),
      eventId: z.string().describe('Unique event identifier'),
      contactId: z.string().optional().describe('ID of the affected contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email'),
      tag: z.string().optional().describe('Tag name (for tag events)'),
      listId: z.string().optional().describe('List ID (for list events)'),
      listName: z.string().optional().describe('List name (for list events)'),
      fieldName: z.string().optional().describe('Custom field name (for field events)'),
      fieldValue: z.string().optional().describe('Custom field value (for field events)'),
      payload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('ID of the affected contact'),
      phone: z.string().optional().describe('Phone number'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email'),
      tag: z.string().optional().describe('Tag name (for tag events)'),
      listId: z.string().optional().describe('List ID (for list events)'),
      listName: z.string().optional().describe('List name (for list events)'),
      fieldName: z.string().optional().describe('Field name (for field events)'),
      fieldValue: z.string().optional().describe('Field value (for field events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let eventType = data?.event || data?.type || data?.event_type || 'unknown';
      let contact = data?.contact || data?.data || data;

      let eventTypeMap: Record<string, string> = {
        contact_created: 'contact.created',
        contact_updated: 'contact.updated',
        contact_deleted: 'contact.deleted',
        tag_added: 'contact.tag_added',
        tag_deleted: 'contact.tag_removed',
        tag_removed: 'contact.tag_removed',
        contact_added_to_list: 'contact.added_to_list',
        contact_deleted_from_list: 'contact.removed_from_list',
        contact_removed_from_list: 'contact.removed_from_list',
        contact_field_updated: 'contact.field_updated',
        contactfield_created_or_updated: 'contact.field_updated'
      };

      let normalizedType = eventTypeMap[eventType] || `contact.${eventType}`;
      let contactId = contact?.id
        ? String(contact.id)
        : data?.contact_id
          ? String(data.contact_id)
          : undefined;
      let eventId = data?.id
        ? String(data.id)
        : `${normalizedType}-${contactId || ''}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: normalizedType,
            eventId,
            contactId,
            phone: contact?.phone || data?.phone,
            firstName: contact?.first_name || data?.first_name,
            lastName: contact?.last_name || data?.last_name,
            email: contact?.email || data?.email,
            tag: data?.tag || data?.tag_name,
            listId: data?.list_id
              ? String(data.list_id)
              : data?.list?.id
                ? String(data.list.id)
                : undefined,
            listName: data?.list_name || data?.list?.name,
            fieldName: data?.field_name || data?.field?.name || data?.custom_field_name,
            fieldValue:
              data?.field_value !== undefined
                ? String(data.field_value)
                : data?.field?.value !== undefined
                  ? String(data.field.value)
                  : undefined,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          contactId: ctx.input.contactId,
          phone: ctx.input.phone,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          tag: ctx.input.tag,
          listId: ctx.input.listId,
          listName: ctx.input.listName,
          fieldName: ctx.input.fieldName,
          fieldValue: ctx.input.fieldValue
        }
      };
    }
  })
  .build();
