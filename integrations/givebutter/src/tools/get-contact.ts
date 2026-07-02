import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  address1: z.string().nullable().describe('Street address'),
  address2: z.string().nullable().describe('Address line 2'),
  city: z.string().nullable().describe('City'),
  state: z.string().nullable().describe('State'),
  zipcode: z.string().nullable().describe('ZIP/postal code'),
  country: z.string().nullable().describe('Country'),
  type: z.string().nullable().describe('Address type'),
  isPrimary: z.number().nullable().describe('Whether this is the primary address')
});

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve full details about a specific contact including personal info, emails, phones, addresses, contribution stats, tags, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Unique identifier'),
      firstName: z.string().nullable().describe('First name'),
      middleName: z.string().nullable().describe('Middle name'),
      lastName: z.string().nullable().describe('Last name'),
      prefix: z.string().nullable().describe('Name prefix'),
      suffix: z.string().nullable().describe('Name suffix'),
      gender: z.string().nullable().describe('Gender'),
      dob: z.string().nullable().describe('Date of birth'),
      company: z.string().nullable().describe('Company'),
      title: z.string().nullable().describe('Title/position'),
      websiteUrl: z.string().nullable().describe('Website URL'),
      twitterUrl: z.string().nullable().describe('Twitter URL'),
      linkedinUrl: z.string().nullable().describe('LinkedIn URL'),
      facebookUrl: z.string().nullable().describe('Facebook URL'),
      emails: z
        .array(
          z.object({
            type: z.string().nullable().describe('Email type'),
            value: z.string().nullable().describe('Email address')
          })
        )
        .describe('Email addresses'),
      phones: z
        .array(
          z.object({
            type: z.string().nullable().describe('Phone type'),
            value: z.string().nullable().describe('Phone number')
          })
        )
        .describe('Phone numbers'),
      primaryEmail: z.string().nullable().describe('Primary email'),
      primaryPhone: z.string().nullable().describe('Primary phone'),
      note: z.string().nullable().describe('Contact note'),
      addresses: z.array(addressSchema).describe('Addresses'),
      totalContributions: z.number().nullable().describe('Total contributions'),
      recurringContributions: z.number().nullable().describe('Recurring contributions'),
      tags: z.array(z.string()).describe('Tags'),
      customFields: z.array(z.any()).describe('Custom fields'),
      externalIds: z.array(z.any()).describe('External IDs'),
      isEmailSubscribed: z.boolean().nullable().describe('Email subscription status'),
      isPhoneSubscribed: z.boolean().nullable().describe('Phone subscription status'),
      isAddressSubscribed: z.boolean().nullable().describe('Address subscription status'),
      archivedAt: z.string().nullable().describe('When archived'),
      createdAt: z.string().nullable().describe('When created'),
      updatedAt: z.string().nullable().describe('When updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let c = await client.getContact(ctx.input.contactId);

    let addresses = (c.addresses ?? []).map((a: any) => ({
      address1: a.address_1 ?? null,
      address2: a.address_2 ?? null,
      city: a.city ?? null,
      state: a.state ?? null,
      zipcode: a.zipcode ?? null,
      country: a.country ?? null,
      type: a.type ?? null,
      isPrimary: a.is_primary ?? null
    }));

    return {
      output: {
        contactId: c.id,
        firstName: c.first_name ?? null,
        middleName: c.middle_name ?? null,
        lastName: c.last_name ?? null,
        prefix: c.prefix ?? null,
        suffix: c.suffix ?? null,
        gender: c.gender ?? null,
        dob: c.dob ?? null,
        company: c.company ?? null,
        title: c.title ?? null,
        websiteUrl: c.website_url ?? null,
        twitterUrl: c.twitter_url ?? null,
        linkedinUrl: c.linkedin_url ?? null,
        facebookUrl: c.facebook_url ?? null,
        emails: (c.emails ?? []).map((e: any) => ({
          type: e.type ?? null,
          value: e.value ?? null
        })),
        phones: (c.phones ?? []).map((p: any) => ({
          type: p.type ?? null,
          value: p.value ?? null
        })),
        primaryEmail: c.primary_email ?? null,
        primaryPhone: c.primary_phone ?? null,
        note: c.note ?? null,
        addresses,
        totalContributions: c.stats?.total_contributions ?? null,
        recurringContributions: c.stats?.recurring_contributions ?? null,
        tags: c.tags ?? [],
        customFields: c.custom_fields ?? [],
        externalIds: c.external_ids ?? [],
        isEmailSubscribed: c.is_email_subscribed ?? null,
        isPhoneSubscribed: c.is_phone_subscribed ?? null,
        isAddressSubscribed: c.is_address_subscribed ?? null,
        archivedAt: c.archived_at ?? null,
        createdAt: c.created_at ?? null,
        updatedAt: c.updated_at ?? null
      },
      message: `Retrieved contact **${[c.first_name, c.last_name].filter(Boolean).join(' ') || c.id}**${c.primary_email ? ` (${c.primary_email})` : ''}.`
    };
  })
  .build();
