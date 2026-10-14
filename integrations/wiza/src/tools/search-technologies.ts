import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTechnologies = SlateTool.create(spec, {
  key: 'search_technologies',
  name: 'Search Technologies',
  description:
    'Find technology names and slugs accepted by Search Prospects. Use a returned slug as the technologies filter value.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      query: z
        .string()
        .trim()
        .min(3)
        .describe('Technology name or slug prefix of at least 3 characters, such as aws.')
    })
  )
  .output(
    z.object({
      technologies: z.array(
        z.object({
          slug: z.string().describe('Accepted technology filter value.'),
          name: z.string().describe('Human-readable technology name.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).searchTechnologies(
      ctx.input.query
    );
    return {
      output: { technologies: result.data },
      message: `Found ${result.data.length} matching technologies.`
    };
  })
  .build();
