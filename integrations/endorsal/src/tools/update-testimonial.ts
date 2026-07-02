import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTestimonial = SlateTool.create(spec, {
  name: 'Update Testimonial',
  key: 'update_testimonial',
  description: `Update an existing testimonial's content, rating, reviewer details, or status. Provide the testimonial ID and the fields you want to change.`
})
  .input(
    z.object({
      testimonialId: z.string().describe('The ID of the testimonial to update'),
      name: z.string().optional().describe('Updated reviewer name'),
      comments: z.string().optional().describe('Updated testimonial text'),
      rating: z.number().min(1).max(5).optional().describe('Updated star rating (1-5)'),
      email: z.string().optional().describe('Updated reviewer email'),
      company: z.string().optional().describe('Updated reviewer company'),
      position: z.string().optional().describe('Updated reviewer job title'),
      location: z.string().optional().describe('Updated reviewer location'),
      avatar: z.string().optional().describe('Updated avatar image URL'),
      approved: z.boolean().optional().describe('Set approval status'),
      featured: z.boolean().optional().describe('Set featured status')
    })
  )
  .output(
    z.object({
      testimonialId: z.string().describe('ID of the updated testimonial'),
      name: z.string().optional().describe('Reviewer name'),
      comments: z.string().optional().describe('Testimonial text'),
      rating: z.number().optional().describe('Star rating'),
      approved: z.number().optional().describe('Approval status'),
      featured: z.number().optional().describe('Featured status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { testimonialId, approved, featured, ...rest } = ctx.input;

    let t = await client.updateTestimonial(testimonialId, {
      ...rest,
      approved: approved !== undefined ? (approved ? 1 : 0) : undefined,
      featured: featured !== undefined ? (featured ? 1 : 0) : undefined
    });

    return {
      output: {
        testimonialId: t._id,
        name: t.name,
        comments: t.comments,
        rating: t.rating,
        approved: t.approved,
        featured: t.featured
      },
      message: `Updated testimonial **${t._id}** from **${t.name || 'Unknown'}**.`
    };
  })
  .build();
