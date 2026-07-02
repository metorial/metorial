import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCourses = SlateTool.create(spec, {
  name: 'List Courses',
  key: 'list_courses',
  description: `Retrieve a paginated list of courses from Coassemble. Supports filtering by user identifier, client identifier, and title. Can also include soft-deleted courses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      identifier: z
        .string()
        .optional()
        .describe('Filter courses by the creator user identifier'),
      clientIdentifier: z.string().optional().describe('Filter courses by client identifier'),
      title: z.string().optional().describe('Case-insensitive title filter'),
      page: z.number().optional().describe('Page number for pagination (starts at 0)'),
      length: z.number().optional().describe('Number of results per page'),
      includeDeleted: z
        .boolean()
        .optional()
        .describe('Include soft-deleted courses in results')
    })
  )
  .output(
    z.object({
      courses: z.array(z.record(z.string(), z.any())).describe('List of course objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    let result = await client.listCourses({
      identifier: ctx.input.identifier,
      clientIdentifier: ctx.input.clientIdentifier,
      title: ctx.input.title,
      page: ctx.input.page,
      length: ctx.input.length,
      deleted: ctx.input.includeDeleted
    });

    let courses = Array.isArray(result) ? result : (result?.data ?? [result]);

    return {
      output: { courses },
      message: `Retrieved ${courses.length} course(s).`
    };
  })
  .build();
