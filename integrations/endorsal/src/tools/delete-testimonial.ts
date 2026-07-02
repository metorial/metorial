import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTestimonial = SlateTool.create(spec, {
  name: 'Delete Testimonial',
  key: 'delete_testimonial',
  description: `Permanently delete a testimonial from your Endorsal account. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      testimonialId: z.string().describe('The ID of the testimonial to delete')
    })
  )
  .output(
    z.object({
      testimonialId: z.string().describe('ID of the deleted testimonial'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteTestimonial(ctx.input.testimonialId);

    return {
      output: {
        testimonialId: ctx.input.testimonialId,
        deleted: true
      },
      message: `Deleted testimonial **${ctx.input.testimonialId}**.`
    };
  })
  .build();
