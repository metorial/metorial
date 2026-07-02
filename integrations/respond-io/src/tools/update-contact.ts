import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's profile fields. Identify the contact by ID, phone, or email, then provide any fields to update including name, phone, email, language, country code, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      identifierType: z
        .enum(['id', 'phone', 'email'])
        .describe('Type of identifier to find the contact'),
      identifierValue: z.string().describe('Value of the identifier'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      phone: z.string().optional().describe('Updated phone number'),
      email: z.string().optional().describe('Updated email address'),
      language: z.string().optional().describe('Updated language code (e.g. en_GB)'),
      countryCode: z.string().optional().describe('Updated ISO country code'),
      profilePicUrl: z.string().optional().describe('Updated profile picture URL'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values to update as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the updated contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let fields: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) fields.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) fields.lastName = ctx.input.lastName;
    if (ctx.input.phone !== undefined) fields.phone = ctx.input.phone;
    if (ctx.input.email !== undefined) fields.email = ctx.input.email;
    if (ctx.input.language !== undefined) fields.language = ctx.input.language;
    if (ctx.input.countryCode !== undefined) fields.countryCode = ctx.input.countryCode;
    if (ctx.input.profilePicUrl !== undefined) fields.profilePic = ctx.input.profilePicUrl;
    if (ctx.input.customFields !== undefined) fields.custom_fields = ctx.input.customFields;

    let result = await client.updateContact(
      ctx.input.identifierType,
      ctx.input.identifierValue,
      fields
    );
    let contact = result?.data || result;

    return {
      output: {
        contactId: String(contact.id || ''),
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone
      },
      message: `Updated contact **${contact.firstName || ''} ${contact.lastName || ''}** (${ctx.input.identifierType}: ${ctx.input.identifierValue}).`
    };
  })
  .build();
