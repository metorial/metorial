import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let EVENT_TYPE_MAP: Record<number, string> = {
  0: 'created',
  9: 'addressed',
  10: 'printed',
  11: 'mailed',
  4: 'in_transit',
  5: 'in_local_area',
  6: 'processed_for_delivery',
  2: 're_routed',
  3: 'return_to_sender',
  7: 'purl_opened',
  8: 'purl_completed'
};

export let mailEvent = SlateTrigger.create(spec, {
  name: 'Mail Event',
  key: 'mail_event',
  description:
    'Triggers when a mail lifecycle or online response event occurs for a campaign. Covers all event types: created, addressed, printed, mailed, in transit, in local area, processed for delivery, re-routed, return to sender, pURL opened, and pURL completed.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type name (e.g. created, mailed, purl_opened)'),
      eventTypeId: z.number().describe('Numeric event type identifier'),
      eventDate: z.string().describe('Timestamp of the event'),
      expectedDeliveryDate: z.string().optional().describe('Estimated delivery date'),
      mailId: z.string().optional().describe('Internal mail piece identifier'),
      contactDataId: z
        .string()
        .optional()
        .describe('Contact data ID for matching back to internal records'),
      dropId: z.string().optional().describe('Campaign mail drop identifier'),
      recipient: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Recipient address and info'),
      sender: z.record(z.string(), z.unknown()).optional().describe('Sender info'),
      piece: z.record(z.string(), z.unknown()).optional().describe('Mail piece details'),
      fields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Variable data fields from the contact record'),
      wasAddressUpdated: z
        .boolean()
        .optional()
        .describe('Whether the address was corrected by CASS/NCOA'),
      raw: z.record(z.string(), z.unknown()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      eventType: z
        .string()
        .describe('Descriptive event type (e.g. created, mailed, purl_opened)'),
      eventDate: z.string().describe('Timestamp of the event'),
      expectedDeliveryDate: z
        .string()
        .optional()
        .describe('Estimated delivery date if available'),
      contactDataId: z
        .string()
        .optional()
        .describe('Contact data ID for matching to your records'),
      dropId: z.string().optional().describe('Campaign mail drop identifier'),
      recipientFirstName: z.string().optional().describe('Recipient first name'),
      recipientLastName: z.string().optional().describe('Recipient last name'),
      recipientCompany: z.string().optional().describe('Recipient company'),
      recipientStreet: z.string().optional().describe('Recipient street address'),
      recipientCity: z.string().optional().describe('Recipient city'),
      recipientState: z.string().optional().describe('Recipient state'),
      recipientZip: z.string().optional().describe('Recipient ZIP code'),
      wasAddressUpdated: z
        .boolean()
        .optional()
        .describe('Whether address was corrected by CASS/NCOA validation'),
      variableFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Variable data fields from the contact record'),
      raw: z.record(z.string(), z.unknown()).describe('Full raw webhook payload')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventTypeId = (data.eventType ?? data.event_type ?? 0) as number;
      let eventTypeName = EVENT_TYPE_MAP[eventTypeId] || `unknown_${eventTypeId}`;

      let to = (data.to || {}) as Record<string, unknown>;
      let from = (data.from || {}) as Record<string, unknown>;
      let piece = (data.piece || {}) as Record<string, unknown>;
      let meta = (data.meta || {}) as Record<string, unknown>;

      return {
        inputs: [
          {
            eventType: eventTypeName,
            eventTypeId,
            eventDate: (data.eventDate || data.event_date || '') as string,
            expectedDeliveryDate: (data.expectedDeliveryDate || data.expected_delivery_date) as
              | string
              | undefined,
            mailId: (data.mailId || data.mail_id) as string | undefined,
            contactDataId: (meta.dataId || meta.data_id) as string | undefined,
            dropId: (meta.dropId || meta.drop_id) as string | undefined,
            recipient: to,
            sender: from,
            piece,
            fields: (meta.fields || {}) as Record<string, unknown>,
            wasAddressUpdated: to.wasUpdated as boolean | undefined,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let recipient = (ctx.input.recipient || {}) as Record<string, unknown>;

      return {
        type: `mail.${ctx.input.eventType}`,
        id: `${ctx.input.mailId || ''}-${ctx.input.eventTypeId}-${ctx.input.eventDate}`,
        output: {
          eventType: ctx.input.eventType,
          eventDate: ctx.input.eventDate,
          expectedDeliveryDate: ctx.input.expectedDeliveryDate,
          contactDataId: ctx.input.contactDataId,
          dropId: ctx.input.dropId,
          recipientFirstName: (recipient.firstName || recipient.first_name) as
            | string
            | undefined,
          recipientLastName: (recipient.lastName || recipient.last_name) as string | undefined,
          recipientCompany: recipient.company as string | undefined,
          recipientStreet: (recipient.address || recipient.address_street) as
            | string
            | undefined,
          recipientCity: (recipient.city || recipient.address_city) as string | undefined,
          recipientState: (recipient.state || recipient.address_state) as string | undefined,
          recipientZip: (recipient.zip || recipient.address_zip) as string | undefined,
          wasAddressUpdated: ctx.input.wasAddressUpdated,
          variableFields: ctx.input.fields,
          raw: ctx.input.raw
        }
      };
    }
  })
  .build();
