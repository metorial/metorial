import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTestimonial = SlateTool.create(spec, {
  name: 'Get Testimonial',
  key: 'get_testimonial',
  description: `Retrieve detailed information about a specific testimonial by its ID, including the full review text, rating, reviewer details, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      testimonialId: z.string().describe('The ID of the testimonial to retrieve')
    })
  )
  .output(
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
      approved: z.number().optional().describe('Approval status'),
      featured: z.number().optional().describe('Whether the testimonial is featured'),
      added: z.number().optional().describe('Timestamp when testimonial was added'),
      updated: z.number().optional().describe('Timestamp when testimonial was last updated'),
      source: z.string().optional().describe('Source platform of the testimonial'),
      tags: z.array(z.string()).optional().describe('Tags associated with the testimonial')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let t = await client.getTestimonial(ctx.input.testimonialId);

    return {
      output: {
        testimonialId: t._id,
        name: t.name,
        email: t.email,
        comments: t.comments,
        rating: t.rating,
        company: t.company,
        position: t.position,
        location: t.location,
        avatar: t.avatar,
        approved: t.approved,
        featured: t.featured,
        added: t.added,
        updated: t.updated,
        source: t.source,
        tags: t.tags
      },
      message: `Retrieved testimonial from **${t.name || 'Unknown'}**${t.rating ? ` (${t.rating}/5 stars)` : ''}: "${(t.comments || '').slice(0, 100)}${(t.comments || '').length > 100 ? '...' : ''}"`
    };
  })
  .build();
