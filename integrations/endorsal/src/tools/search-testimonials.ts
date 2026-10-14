import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  mapTestimonial,
  searchQuerySchema,
  testimonialListOutputSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let searchTestimonials = SlateTool.create(spec, {
  name: 'Search Testimonials',
  key: 'search_testimonials',
  description:
    'Find Endorsal testimonials using field comparisons, ratings, reviewer names, or email matches. Multiple conditions are combined with AND.',
  tags: { readOnly: true }
})
  .input(z.object({ query: searchQuerySchema }))
  .output(testimonialListOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).searchTestimonials(
      ctx.input.query
    );
    let testimonials = result.data.map(mapTestimonial);
    return {
      output: { testimonials, total: result.total },
      message: `Found **${testimonials.length}** matching testimonial(s).`
    };
  })
  .build();
