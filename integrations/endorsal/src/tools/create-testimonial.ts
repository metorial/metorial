import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTestimonial = SlateTool.create(spec, {
  name: 'Create Testimonial',
  key: 'create_testimonial',
  description: `Create a new testimonial in your Endorsal account. Provide the reviewer's details, feedback comments, and star rating. The testimonial will be associated with the specified property.`,
  instructions: ['The propertyId can be found in the URL in your Endorsal Property Settings.']
})
  .input(
    z.object({
      name: z.string().describe('Name of the person giving the testimonial'),
      comments: z.string().describe('The testimonial text / feedback content'),
      propertyId: z
        .string()
        .describe('The Endorsal property ID to associate this testimonial with'),
      rating: z.number().min(1).max(5).optional().describe('Star rating from 1 to 5'),
      email: z.string().optional().describe('Email of the person giving the testimonial'),
      company: z.string().optional().describe('Company of the reviewer'),
      position: z.string().optional().describe('Job title of the reviewer'),
      location: z.string().optional().describe('Location of the reviewer'),
      avatar: z.string().optional().describe('URL to a publicly accessible avatar image'),
      approved: z
        .boolean()
        .optional()
        .describe('Whether the testimonial should be approved immediately'),
      featured: z.boolean().optional().describe('Whether the testimonial should be featured')
    })
  )
  .output(
    z.object({
      testimonialId: z.string().describe('ID of the newly created testimonial'),
      name: z.string().optional().describe('Reviewer name'),
      comments: z.string().optional().describe('Testimonial text'),
      rating: z.number().optional().describe('Star rating'),
      added: z.number().optional().describe('Timestamp when testimonial was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let t = await client.createTestimonial({
      name: ctx.input.name,
      comments: ctx.input.comments,
      propertyID: ctx.input.propertyId,
      rating: ctx.input.rating,
      email: ctx.input.email,
      company: ctx.input.company,
      position: ctx.input.position,
      location: ctx.input.location,
      avatar: ctx.input.avatar,
      approved: ctx.input.approved !== undefined ? (ctx.input.approved ? 1 : 0) : undefined,
      featured: ctx.input.featured !== undefined ? (ctx.input.featured ? 1 : 0) : undefined,
      added: Date.now()
    });

    return {
      output: {
        testimonialId: t._id,
        name: t.name,
        comments: t.comments,
        rating: t.rating,
        added: t.added
      },
      message: `Created testimonial from **${t.name || 'Unknown'}**${t.rating ? ` with ${t.rating}/5 stars` : ''}.`
    };
  })
  .build();
