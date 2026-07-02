import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Created',
  key: 'contact_events',
  description:
    'Triggered when a new contact is created as a result of a transaction or manual creation. Does not fire during CSV imports.'
})
  .input(
    z.object({
      contactId: z.number().describe('Contact ID'),
      rawPayload: z.any().describe('Raw contact payload')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Contact ID'),
      prefix: z.string().nullable().describe('Name prefix'),
      firstName: z.string().nullable().describe('First name'),
      middleName: z.string().nullable().describe('Middle name'),
      lastName: z.string().nullable().describe('Last name'),
      suffix: z.string().nullable().describe('Name suffix'),
      gender: z.string().nullable().describe('Gender'),
      dob: z.string().nullable().describe('Date of birth'),
      company: z.string().nullable().describe('Company'),
      title: z.string().nullable().describe('Title/position'),
      primaryEmail: z.string().nullable().describe('Primary email'),
      primaryPhone: z.string().nullable().describe('Primary phone'),
      emails: z.array(z.any()).describe('Email addresses'),
      phones: z.array(z.any()).describe('Phone numbers'),
      addresses: z.array(z.any()).describe('Addresses'),
      note: z.string().nullable().describe('Contact note'),
      totalContributions: z.number().nullable().describe('Total contributions'),
      recurringContributions: z.number().nullable().describe('Recurring contributions'),
      tags: z.array(z.string()).describe('Tags'),
      customFields: z.array(z.any()).describe('Custom fields'),
      isEmailSubscribed: z.boolean().nullable().describe('Email subscription status'),
      isPhoneSubscribed: z.boolean().nullable().describe('Phone subscription status'),
      isAddressSubscribed: z.boolean().nullable().describe('Address subscription status'),
      createdAt: z.string().nullable().describe('When created'),
      updatedAt: z.string().nullable().describe('When updated')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.event !== 'contact.created') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            contactId: body.data.id,
            rawPayload: body.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let d = ctx.input.rawPayload;

      return {
        type: 'contact.created',
        id: `contact-${ctx.input.contactId}-${d.created_at ?? Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          prefix: d.prefix ?? null,
          firstName: d.first_name ?? null,
          middleName: d.middle_name ?? null,
          lastName: d.last_name ?? null,
          suffix: d.suffix ?? null,
          gender: d.gender ?? null,
          dob: d.dob ?? null,
          company: d.company ?? null,
          title: d.title ?? null,
          primaryEmail: d.primary_email ?? null,
          primaryPhone: d.primary_phone ?? null,
          emails: d.emails ?? [],
          phones: d.phones ?? [],
          addresses: d.addresses ?? [],
          note: d.note ?? null,
          totalContributions: d.stats?.total_contributions ?? null,
          recurringContributions: d.stats?.recurring_contributions ?? null,
          tags: d.tags ?? [],
          customFields: d.custom_fields ?? [],
          isEmailSubscribed: d.is_email_subscribed ?? null,
          isPhoneSubscribed: d.is_phone_subscribed ?? null,
          isAddressSubscribed: d.is_address_subscribed ?? null,
          createdAt: d.created_at ?? null,
          updatedAt: d.updated_at ?? null
        }
      };
    }
  })
  .build();
