import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve detailed information about a specific contact including CalendarHero's enriched insights such as job history, personality, social media links, and photos. Use **basic** mode if you only need core contact info without insights.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to retrieve'),
      basic: z
        .boolean()
        .optional()
        .describe('If true, return only basic info without enriched insights')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('Contact ID'),
      name: z.string().optional().describe('Contact name'),
      email: z.string().optional().describe('Primary email address'),
      title: z.string().optional().describe('Job title'),
      organization: z.string().optional().describe('Organization name'),
      phoneNumbers: z.array(z.string()).optional().describe('Phone numbers'),
      socialProfiles: z
        .array(
          z.object({
            network: z.string().optional(),
            url: z.string().optional()
          })
        )
        .optional()
        .describe('Social media profiles'),
      photo: z.string().optional().describe('Profile photo URL'),
      bio: z.string().optional().describe('Short biography'),
      raw: z.any().optional().describe('Full contact object with all insights')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let contact = await client.getContact(ctx.input.contactId, {
      basic: ctx.input.basic
    });

    let emails = Array.isArray(contact.email)
      ? contact.email
      : contact.email
        ? [contact.email]
        : [];
    let phones = Array.isArray(contact.telephone)
      ? contact.telephone
      : contact.telephone
        ? [contact.telephone]
        : [];
    let socials = (contact.socialProfiles || contact.social || []).map((s: any) => ({
      network: s.network || s.type || s.typeName,
      url: s.url || s.link
    }));

    return {
      output: {
        contactId: contact._id || contact.id,
        name: contact.name || contact.displayName,
        email: emails[0],
        title: contact.title,
        organization: contact.organization || contact.company,
        phoneNumbers: phones,
        socialProfiles: socials,
        photo: contact.photo || contact.avatar,
        bio: contact.bio || contact.description,
        raw: contact
      },
      message: `Retrieved contact **${contact.name || contact.email || ctx.input.contactId}**.`
    };
  })
  .build();
