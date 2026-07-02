import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type EndorsalListResponse, type EndorsalTestimonial } from '../lib/client';
import { spec } from '../spec';

export let listTestimonials = SlateTool.create(spec, {
  name: 'List Testimonials',
  key: 'list_testimonials',
  description: `Retrieve testimonials from your Endorsal account. Optionally filter by a specific contact or tag to find relevant reviews for a product or service.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('Filter testimonials by a specific contact ID'),
      tagId: z.string().optional().describe('Filter testimonials by a specific tag ID'),
      limit: z.number().optional().describe('Maximum number of testimonials to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
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
          approved: z.number().optional().describe('Approval status'),
          featured: z.number().optional().describe('Whether the testimonial is featured'),
          added: z.number().optional().describe('Timestamp when testimonial was added'),
          source: z.string().optional().describe('Source platform of the testimonial'),
          tags: z.array(z.string()).optional().describe('Tags associated with the testimonial')
        })
      ),
      total: z.number().optional().describe('Total number of testimonials')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: EndorsalListResponse<EndorsalTestimonial>;

    if (ctx.input.contactId) {
      result = await client.getTestimonialsForContact(ctx.input.contactId);
    } else if (ctx.input.tagId) {
      result = await client.getTestimonialsForTag(ctx.input.tagId);
    } else {
      result = await client.listTestimonials({
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    }

    let testimonials = (result.data || []).map(t => ({
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
      source: t.source,
      tags: t.tags
    }));

    let filterDesc = ctx.input.contactId
      ? ` for contact ${ctx.input.contactId}`
      : ctx.input.tagId
        ? ` for tag ${ctx.input.tagId}`
        : '';

    return {
      output: {
        testimonials,
        total: result.total
      },
      message: `Found **${testimonials.length}** testimonial(s)${filterDesc}${result.total ? ` out of ${result.total} total` : ''}.`
    };
  })
  .build();
