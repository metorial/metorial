import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description:
    'Discover testimonial tags for the connected Endorsal property. Use a tagId with list_testimonials to retrieve reviews for that tag.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      tags: z.array(
        z.object({
          tagId: z.string().describe('Tag ID to use with list_testimonials'),
          name: z.string().optional().describe('Tag name'),
          type: z
            .string()
            .optional()
            .describe('Tag category, such as product, service, course, or tag'),
          tagData: z
            .record(z.string(), z.unknown())
            .describe(
              'Tag details, including name, type, property, slug, optional product data, and edit timestamp'
            )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listTags();
    let tags = result.data.map(tag => ({
      tagId: tag._id,
      name: typeof tag.name === 'string' ? tag.name : undefined,
      type: typeof tag.type === 'string' ? tag.type : undefined,
      tagData: tag
    }));
    return { output: { tags }, message: `Found **${tags.length}** testimonial tag(s).` };
  })
  .build();
