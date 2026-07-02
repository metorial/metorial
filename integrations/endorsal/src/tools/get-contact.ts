import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve detailed information about a specific contact by ID, including their testimonials. Returns the contact's profile data and any testimonials they have submitted.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The ID of the contact to retrieve'),
      includeTestimonials: z
        .boolean()
        .optional()
        .describe('Whether to also fetch testimonials submitted by this contact')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique contact ID'),
      email: z.string().optional().describe('Contact email address'),
      phone: z.string().optional().describe('Contact phone number'),
      name: z.string().optional().describe('Contact full name'),
      firstName: z.string().optional().describe('Contact first name'),
      lastName: z.string().optional().describe('Contact last name'),
      company: z.string().optional().describe('Contact company name'),
      position: z.string().optional().describe('Contact job title'),
      location: z.string().optional().describe('Contact location'),
      website: z.string().optional().describe('Contact website URL'),
      avatar: z.string().optional().describe('Contact avatar image URL'),
      customAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom contact attributes'),
      archived: z.boolean().optional().describe('Whether the contact is archived'),
      added: z.number().optional().describe('Timestamp when contact was added'),
      testimonials: z
        .array(
          z.object({
            testimonialId: z.string().describe('Testimonial ID'),
            name: z.string().optional().describe('Reviewer name'),
            comments: z.string().optional().describe('Testimonial text'),
            rating: z.number().optional().describe('Star rating (1-5)'),
            added: z.number().optional().describe('Timestamp when testimonial was added')
          })
        )
        .optional()
        .describe('Testimonials submitted by this contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contact = await client.getContact(ctx.input.contactId);

    let testimonials:
      | Array<{
          testimonialId: string;
          name?: string;
          comments?: string;
          rating?: number;
          added?: number;
        }>
      | undefined;

    if (ctx.input.includeTestimonials) {
      let result = await client.getTestimonialsForContact(ctx.input.contactId);
      testimonials = (result.data || []).map(t => ({
        testimonialId: t._id,
        name: t.name,
        comments: t.comments,
        rating: t.rating,
        added: t.added
      }));
    }

    return {
      output: {
        contactId: contact._id,
        email: contact.email,
        phone: contact.phone,
        name: contact.name,
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
        position: contact.position,
        location: contact.location,
        website: contact.website,
        avatar: contact.avatar,
        customAttributes: contact.customAttributes,
        archived: contact.archived,
        added: contact.added,
        testimonials
      },
      message: `Retrieved contact **${contact.name || contact.email || contact._id}**${testimonials ? ` with ${testimonials.length} testimonial(s)` : ''}.`
    };
  })
  .build();
