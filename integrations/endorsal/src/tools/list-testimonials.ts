import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type EndorsalListResponse, type EndorsalTestimonial } from '../lib/client';
import { mapTestimonial, testimonialListOutputSchema } from '../lib/schemas';
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
      page: z
        .number()
        .optional()
        .describe(
          'Positive whole-number page, starting at 1. Pagination is applied to the complete API response.'
        )
    })
  )
  .output(testimonialListOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.contactId && ctx.input.tagId) {
      throw createApiServiceError('Provide either contactId or tagId, not both.');
    }

    let result: EndorsalListResponse<EndorsalTestimonial>;

    if (ctx.input.contactId) {
      result = await client.getTestimonialsForContact(ctx.input.contactId, ctx.input);
    } else if (ctx.input.tagId) {
      result = await client.getTestimonialsForTag(ctx.input.tagId, ctx.input);
    } else {
      result = await client.listTestimonials({
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    }

    let testimonials = result.data.map(mapTestimonial);

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
