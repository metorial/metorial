import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let channelSchema = z.object({
  type: z
    .enum(['email', 'sms', 'viber', 'mobilepush', 'webpush', 'appinbox', 'widget', 'inapp'])
    .describe('Channel type'),
  value: z
    .string()
    .describe('Channel identifier (email address, phone number, push token, etc.)')
});

let addressSchema = z
  .object({
    region: z.string().optional().describe('Region or state'),
    town: z.string().optional().describe('City or town'),
    address: z.string().optional().describe('Street address'),
    postcode: z.string().optional().describe('Postal code'),
    countryCode: z
      .string()
      .optional()
      .describe('ISO 3166-1 alpha-2 country code (e.g., "US", "GB")')
  })
  .optional();

let customFieldSchema = z.object({
  id: z.number().describe('Custom field ID'),
  value: z.string().describe('Custom field value')
});

export let upsertContact = SlateTool.create(spec, {
  name: 'Upsert Contact',
  key: 'upsert_contact',
  description: `Add a new contact or update an existing one in eSputnik. If a contact with the same channel value already exists, it will be updated.
Supports setting channels (email, SMS, Viber, etc.), personal info, address, custom fields, and segment membership.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channels: z
        .array(channelSchema)
        .min(1)
        .describe('At least one contact channel is required'),
      firstName: z.string().max(40).optional().describe('First name (max 40 characters)'),
      lastName: z.string().max(40).optional().describe('Last name (max 40 characters)'),
      address: addressSchema.describe('Contact address'),
      fields: z.array(customFieldSchema).optional().describe('Custom fields to set'),
      externalCustomerId: z.string().optional().describe('External system customer ID'),
      groups: z
        .array(z.string())
        .optional()
        .describe('Static segment names to add the contact to'),
      languageCode: z.string().optional().describe('Language code (e.g., "en", "fr")'),
      timeZone: z.string().optional().describe('Contact timezone (e.g., "Europe/London")')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('eSputnik internal contact ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let payload: Record<string, any> = {
      channels: ctx.input.channels
    };

    if (ctx.input.firstName) payload.firstName = ctx.input.firstName;
    if (ctx.input.lastName) payload.lastName = ctx.input.lastName;
    if (ctx.input.address) payload.address = ctx.input.address;
    if (ctx.input.fields) payload.fields = ctx.input.fields;
    if (ctx.input.externalCustomerId)
      payload.externalCustomerId = ctx.input.externalCustomerId;
    if (ctx.input.groups) payload.groups = ctx.input.groups;
    if (ctx.input.languageCode) payload.languageCode = ctx.input.languageCode;
    if (ctx.input.timeZone) payload.timeZone = ctx.input.timeZone;

    let result = await client.addOrUpdateContact(payload);

    return {
      output: {
        contactId: result.id
      },
      message: `Contact upserted successfully with ID **${result.id}**.`
    };
  })
  .build();
