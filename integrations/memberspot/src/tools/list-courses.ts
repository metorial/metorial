import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getMemberspotList } from '../lib/responses';
import { spec } from '../spec';

export let listCoursesTool = SlateTool.create(spec, {
  name: 'List Courses',
  key: 'list_courses',
  description:
    'Retrieve all courses and their IDs, names, and types for progress lookups and chapter access.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      courses: z
        .array(z.record(z.string(), z.any()))
        .describe('Provider course records with identifiers and metadata'),
      raw: z.any().optional().describe('Unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let raw = await new Client({ token: ctx.auth.token }).listCourses();
    let courses = getMemberspotList(raw, ['data']);
    return { output: { courses, raw }, message: `Retrieved **${courses.length}** courses.` };
  })
  .build();
