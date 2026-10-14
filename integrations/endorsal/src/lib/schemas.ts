import { z } from 'zod';
import type { EndorsalContact, EndorsalTestimonial } from './client';

export let searchQuerySchema = z
  .array(
    z.object({
      field: z
        .string()
        .describe(
          'Provider field to match, such as email, name, rating, or a custom attribute'
        ),
      operator: z
        .enum(['=', '>', '>=', '<', '<=', '!=', 'contains', 'in'])
        .describe(
          'Comparison operator; contains uses a regular expression and in uses an array'
        ),
      value: z
        .unknown()
        .describe('Value to compare, including numbers, null, or an array for the in operator')
    })
  )
  .min(1)
  .describe('Match conditions combined with AND');

export let contactListOutputSchema = z.object({
  contacts: z.array(
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
      archived: z.boolean().optional().describe('Whether the contact is archived'),
      added: z.number().optional().describe('Timestamp when contact was added')
    })
  ),
  total: z.number().optional().describe('Total number of contacts')
});

export let mapContact = (c: EndorsalContact) => ({
  contactId: c._id,
  email: c.email,
  phone: c.phone,
  name: c.name,
  firstName: c.firstName,
  lastName: c.lastName,
  company: c.company,
  position: c.position,
  location: c.location,
  website: c.website,
  avatar: c.avatar,
  archived: c.archived,
  added: c.added
});

export let testimonialListOutputSchema = z.object({
  testimonials: z.array(
    z.object({
      testimonialId: z.string().describe('Unique testimonial ID'),
      name: z.string().optional().describe('Reviewer name'),
      email: z.string().optional().describe('Reviewer email'),
      comments: z.string().optional().describe('Testimonial text content'),
      rating: z.number().optional().describe('Star rating (1-5)'),
      company: z.string().optional().describe('Reviewer company'),
      position: z.string().optional().describe('Reviewer job title'),
      location: z.string().optional().describe('Reviewer location'),
      avatar: z.string().optional().describe('Reviewer avatar URL'),
      avatarDetails: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider avatar URL and image sizes'),
      approved: z.number().optional().describe('Approval status'),
      featured: z.number().optional().describe('Whether the testimonial is featured'),
      added: z.number().optional().describe('Timestamp when testimonial was added'),
      source: z.string().optional().describe('Source platform of the testimonial'),
      tags: z.array(z.string()).optional().describe('Tags associated with the testimonial')
    })
  ),
  total: z.number().optional().describe('Total number of testimonials')
});

export let mapTestimonial = (t: EndorsalTestimonial) => ({
  testimonialId: t._id,
  name: t.name,
  email: t.email,
  comments: t.comments,
  rating: t.rating,
  company: t.company,
  position: t.position,
  location: t.location,
  avatar: t.avatar,
  avatarDetails: t.avatarDetails,
  approved: t.approved,
  featured: t.featured,
  added: t.added,
  source: t.source,
  tags: t.tags
});
