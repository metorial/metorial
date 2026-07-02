import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { contactSchema } from '../lib/schemas';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggered when a contact is created, updated, deleted, or restored in OnePageCRM. Configure the webhook URL in OnePageCRM Apps settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of contact event'),
      contactId: z.string().describe('ID of the affected contact'),
      timestamp: z.string().describe('Timestamp of the event'),
      rawData: z.any().describe('Raw contact data from the webhook payload')
    })
  )
  .output(contactSchema)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // OnePageCRM webhook payload has: timestamp, secretkey, type, reason, data
      if (body.type !== 'contact') {
        return { inputs: [] };
      }

      let contactData = body.data ?? {};

      return {
        inputs: [
          {
            eventType: body.reason ?? 'unknown',
            contactId: contactData.id ?? '',
            timestamp: body.timestamp ?? new Date().toISOString(),
            rawData: contactData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.rawData;

      let output = {
        contactId: c.id ?? ctx.input.contactId,
        firstName: c.first_name,
        lastName: c.last_name,
        companyName: c.company_name,
        companyId: c.company_id,
        jobTitle: c.job_title,
        background: c.background,
        status: c.status,
        statusId: c.status_id,
        leadSourceId: c.lead_source_id,
        ownerId: c.owner_id,
        emails: c.emails,
        phones: c.phones,
        urls: c.urls,
        address: c.address
          ? {
              address: c.address.address,
              city: c.address.city,
              state: c.address.state,
              zipCode: c.address.zip_code,
              countryCode: c.address.country_code
            }
          : undefined,
        tags: c.tags,
        starValue: c.star_value,
        customFields: c.custom_fields?.map((cf: any) => ({
          customFieldId: cf.custom_field?.id ?? cf.id,
          value: cf.custom_field?.value ?? cf.value
        })),
        createdAt: c.created_at,
        modifiedAt: c.modified_at
      };

      return {
        type: `contact.${ctx.input.eventType}`,
        id: `contact-${ctx.input.contactId}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output
      };
    }
  })
  .build();
