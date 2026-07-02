import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.string().describe('Unique contact ID'),
  type: z.string().optional().describe('Contact type: "user" or "lead"'),
  name: z.string().optional().describe('Full name'),
  email: z.string().optional().describe('Email address'),
  userId: z.string().optional().describe('External user ID'),
  phone: z.string().optional().describe('Phone number'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  signedUpAt: z.string().optional().describe('Sign-up timestamp'),
  lastSeenAt: z.string().optional().describe('Last seen timestamp'),
  lastContactedAt: z.string().optional().describe('Last contacted timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  sessionCount: z.number().optional().describe('Number of sessions'),
  avatar: z.string().optional().describe('Avatar URL'),
  landingUrl: z.string().optional().describe('Landing page URL'),
  originalReferrer: z.string().optional().describe('Original referrer URL'),
  unsubscribedFromEmails: z.boolean().optional().describe('Whether unsubscribed from emails'),
  tags: z.array(z.any()).optional().describe('Tags applied to the contact'),
  segments: z.array(z.any()).optional().describe('Segments the contact belongs to'),
  customProperties: z.record(z.string(), z.any()).optional().describe('Custom properties'),
  locationData: z.any().optional().describe('Location information'),
  socialProfiles: z.any().optional().describe('Social profile links')
});

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact from Gist by their ID, email address, or user ID. Returns the full contact profile including tags, segments, custom properties, and location data.`,
  tags: { readOnly: true }
})
  .input(
    z
      .object({
        contactId: z.string().optional().describe('Gist contact ID'),
        email: z.string().optional().describe('Contact email address'),
        userId: z.string().optional().describe('External user ID')
      })
      .describe('Provide one of contactId, email, or userId')
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });
    let data: any;

    if (ctx.input.contactId) {
      data = await client.getContact(ctx.input.contactId);
    } else if (ctx.input.email) {
      data = await client.getContactByEmail(ctx.input.email);
    } else if (ctx.input.userId) {
      data = await client.getContactByUserId(ctx.input.userId);
    } else {
      throw new Error('Provide at least one of contactId, email, or userId');
    }

    let contact = data.contact || data;

    return {
      output: {
        contactId: String(contact.id),
        type: contact.type,
        name: contact.name,
        email: contact.email,
        userId: contact.user_id ? String(contact.user_id) : undefined,
        phone: contact.phone,
        createdAt: contact.created_at ? String(contact.created_at) : undefined,
        signedUpAt: contact.signed_up_at ? String(contact.signed_up_at) : undefined,
        lastSeenAt: contact.last_seen_at ? String(contact.last_seen_at) : undefined,
        lastContactedAt: contact.last_contacted_at
          ? String(contact.last_contacted_at)
          : undefined,
        updatedAt: contact.updated_at ? String(contact.updated_at) : undefined,
        sessionCount: contact.session_count,
        avatar: contact.avatar,
        landingUrl: contact.landing_url,
        originalReferrer: contact.original_referrer,
        unsubscribedFromEmails: contact.unsubscribed_from_emails,
        tags: contact.tags,
        segments: contact.segments,
        customProperties: contact.custom_properties,
        locationData: contact.location_data,
        socialProfiles: contact.social_profiles
      },
      message: `Retrieved contact **${contact.name || contact.email || contact.id}** (${contact.type || 'unknown type'}).`
    };
  })
  .build();
