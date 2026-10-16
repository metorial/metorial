import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'who_am_i',
  description:
    'Get the Blackboard Learn user represented by the current connection, including the user ID, profile, and roles.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ user: z.unknown() }))
  .handleInvocation(async ctx => ({
    output: { user: await createClient(ctx).getUser('me') },
    message: 'Retrieved the current Blackboard Learn user.'
  }))
  .build();

let pageInput = z.object({
  offset: z
    .number()
    .optional()
    .describe('Number of results to skip (whole number, zero or greater)'),
  limit: z.number().optional().describe('Maximum results to return (positive whole number)')
});

export let listDataSources = SlateTool.create(spec, {
  name: 'List Data Sources',
  key: 'list_data_sources',
  description:
    'Discover data source IDs and names used by user, course, and enrollment records.',
  tags: { readOnly: true }
})
  .input(pageInput)
  .output(z.object({ dataSources: z.array(z.unknown()), hasMore: z.boolean() }))
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listDataSources(ctx.input);
    return {
      output: { dataSources: result.results, hasMore: !!result.paging?.nextPage },
      message: `Found ${result.results.length} data sources.`
    };
  })
  .build();

export let listCalendars = SlateTool.create(spec, {
  name: 'List Calendars',
  key: 'list_calendars',
  description: 'Discover available calendars and their IDs before creating calendar items.',
  tags: { readOnly: true }
})
  .input(pageInput)
  .output(
    z.object({
      calendars: z.array(z.object({ id: z.string(), name: z.string() })),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listCalendars(ctx.input);
    return {
      output: { calendars: result.results, hasMore: !!result.paging?.nextPage },
      message: `Found ${result.results.length} calendars.`
    };
  })
  .build();

let columnInput = z.object({
  courseId: z.string().describe('Course ID. Call list_courses to discover courses.'),
  columnId: z
    .string()
    .describe('Grade column ID. Call list_grade_columns to discover columns.')
});

export let getGradeColumn = SlateTool.create(spec, {
  name: 'Get Grade Column',
  key: 'get_grade_column',
  description:
    'Get a grade column and its complete provider settings, including scoring, availability, and grading configuration.',
  tags: { readOnly: true }
})
  .input(columnInput)
  .output(z.object({ column: z.unknown() }))
  .handleInvocation(async ctx => ({
    output: {
      column: await createClient(ctx).getGradeColumn(ctx.input.courseId, ctx.input.columnId)
    },
    message: 'Retrieved the grade column.'
  }))
  .build();

export let deleteGradeColumn = SlateTool.create(spec, {
  name: 'Delete Grade Column',
  key: 'delete_grade_column',
  description: 'Permanently delete a grade column and its associated grades from a course.',
  tags: { readOnly: false, destructive: true }
})
  .input(columnInput)
  .output(z.object({ deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await createClient(ctx).deleteGradeColumn(ctx.input.courseId, ctx.input.columnId);
    return { output: { deleted: true }, message: 'Deleted the grade column.' };
  })
  .build();
