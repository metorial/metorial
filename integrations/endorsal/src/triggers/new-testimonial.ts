import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newTestimonial = SlateTrigger.create(spec, {
  name: 'New Testimonial',
  key: 'new_testimonial',
  description:
    'Triggers when a new testimonial is submitted to your Endorsal property. Use this to react to incoming testimonials in real time, such as forwarding to Slack, syncing with a CRM, or triggering approval workflows.'
})
  .input(
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
      featured: z.number().optional().describe('Featured status'),
      added: z.number().optional().describe('Timestamp when testimonial was added'),
      source: z.string().optional().describe('Source platform'),
      tags: z.array(z.string()).optional().describe('Tags on the testimonial')
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
      featured: z.number().optional().describe('Featured status'),
      added: z.number().optional().describe('Timestamp when testimonial was added'),
      source: z.string().optional().describe('Source platform of the testimonial'),
      tags: z.array(z.string()).optional().describe('Tags associated with the testimonial')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.listTestimonials();
      let testimonials = result.data || [];

      let sortedTestimonials = testimonials.sort((a, b) => (b.added || 0) - (a.added || 0));

      let lastSeenTimestamp = (ctx.state as Record<string, unknown>)?.lastSeenTimestamp as
        | number
        | undefined;

      let newTestimonials = lastSeenTimestamp
        ? sortedTestimonials.filter(t => (t.added || 0) > lastSeenTimestamp)
        : sortedTestimonials.slice(0, 25);

      let updatedTimestamp =
        sortedTestimonials.length > 0
          ? sortedTestimonials[0]?.added || Date.now()
          : lastSeenTimestamp || Date.now();

      return {
        inputs: newTestimonials.map(t => ({
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
        })),
        updatedState: {
          lastSeenTimestamp: updatedTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'testimonial.created',
        id: ctx.input.testimonialId,
        output: {
          testimonialId: ctx.input.testimonialId,
          name: ctx.input.name,
          email: ctx.input.email,
          comments: ctx.input.comments,
          rating: ctx.input.rating,
          company: ctx.input.company,
          position: ctx.input.position,
          location: ctx.input.location,
          avatar: ctx.input.avatar,
          approved: ctx.input.approved,
          featured: ctx.input.featured,
          added: ctx.input.added,
          source: ctx.input.source,
          tags: ctx.input.tags
        }
      };
    }
  })
  .build();
