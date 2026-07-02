import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateContact = SlateTool.create(spec, {
  name: 'Create or Update Contact',
  key: 'create_or_update_contact',
  description: `Create a new contact or update an existing one in Gist. Contacts are de-duplicated by email address. If a contact with the given email already exists, it will be updated. Supports setting custom properties, tags, and subscription types.`,
  instructions: [
    'Custom property names cannot contain periods (.) or dollar ($) signs.',
    'Property names are limited to 190 characters, string values to 255 characters.',
    'Names ending in "_at" are automatically treated as date fields (use UNIX timestamps).'
  ],
  constraints: ['Maximum 250 custom properties per contact.']
})
  .input(
    z.object({
      email: z.string().optional().describe('Contact email address'),
      userId: z
        .string()
        .optional()
        .describe('External user ID. Setting this makes the contact a "user" type'),
      name: z.string().optional().describe('Full name'),
      phone: z.string().optional().describe('Phone number'),
      signedUpAt: z.string().optional().describe('Sign-up date as UNIX timestamp'),
      lastSeenAt: z.string().optional().describe('Last seen date as UNIX timestamp'),
      customProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom properties to set. Values must be strings, numbers, or booleans'),
      unsubscribedFromEmails: z
        .boolean()
        .optional()
        .describe('Whether to unsubscribe from emails')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Created/updated contact ID'),
      type: z.string().optional().describe('Contact type: "user" or "lead"'),
      name: z.string().optional(),
      email: z.string().optional(),
      userId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.userId) body.user_id = ctx.input.userId;
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.signedUpAt) body.signed_up_at = ctx.input.signedUpAt;
    if (ctx.input.lastSeenAt) body.last_seen_at = ctx.input.lastSeenAt;
    if (ctx.input.customProperties) body.custom_properties = ctx.input.customProperties;
    if (ctx.input.unsubscribedFromEmails !== undefined)
      body.unsubscribed_from_emails = ctx.input.unsubscribedFromEmails;

    let data = await client.createOrUpdateContact(body);
    let contact = data.contact || data;

    return {
      output: {
        contactId: String(contact.id),
        type: contact.type,
        name: contact.name,
        email: contact.email,
        userId: contact.user_id ? String(contact.user_id) : undefined
      },
      message: `Contact **${contact.name || contact.email || contact.id}** has been created/updated.`
    };
  })
  .build();
