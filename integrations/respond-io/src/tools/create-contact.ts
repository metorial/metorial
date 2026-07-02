import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in the Respond.io workspace. Specify the contact using an identifier (phone or email) along with profile fields like name, language, and country code. Custom fields can also be set.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      identifierType: z
        .enum(['phone', 'email'])
        .describe('Type of identifier to use for the contact'),
      identifierValue: z
        .string()
        .describe('Value of the identifier (phone number or email address)'),
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      phone: z
        .string()
        .optional()
        .describe('Phone number of the contact (with country code, e.g. +15551234567)'),
      email: z.string().optional().describe('Email address of the contact'),
      language: z.string().optional().describe('Language code of the contact (e.g. en_GB)'),
      countryCode: z.string().optional().describe('ISO country code (e.g. US, GB)'),
      profilePicUrl: z.string().optional().describe('URL of the contact profile picture'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the created contact'),
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      phone: z.string().optional().describe('Phone number of the contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let fields: Record<string, any> = {};
    if (ctx.input.firstName) fields.firstName = ctx.input.firstName;
    if (ctx.input.lastName) fields.lastName = ctx.input.lastName;
    if (ctx.input.phone) fields.phone = ctx.input.phone;
    if (ctx.input.email) fields.email = ctx.input.email;
    if (ctx.input.language) fields.language = ctx.input.language;
    if (ctx.input.countryCode) fields.countryCode = ctx.input.countryCode;
    if (ctx.input.profilePicUrl) fields.profilePic = ctx.input.profilePicUrl;
    if (ctx.input.customFields) fields.custom_fields = ctx.input.customFields;

    let result = await client.createContact(
      ctx.input.identifierType,
      ctx.input.identifierValue,
      fields
    );

    let contact = result?.data || result;

    return {
      output: {
        contactId: String(contact.id || contact.contactId || ''),
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone
      },
      message: `Created contact **${contact.firstName || ''} ${contact.lastName || ''}** (${ctx.input.identifierType}: ${ctx.input.identifierValue}).`
    };
  })
  .build();
