import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let membershipOutputSchema = z.object({
  userId: z.string().describe('User ID'),
  courseId: z.string().describe('Course ID'),
  courseRoleId: z
    .string()
    .optional()
    .describe('Role in the course (e.g., Instructor, Student)'),
  available: z.string().optional().describe('Availability status'),
  created: z.string().optional().describe('Enrollment creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp'),
  lastAccessed: z.string().optional().describe('Last accessed timestamp')
});

let mapMembership = (m: any) => ({
  userId: m.userId,
  courseId: m.courseId,
  courseRoleId: m.courseRoleId,
  available: m.availability?.available,
  created: m.created,
  modified: m.modified,
  lastAccessed: m.lastAccessed
});

export let enrollUser = SlateTool.create(spec, {
  name: 'Enroll User in Course',
  key: 'enroll_user',
  description: `Enroll a user in a course with a specified role. If the user is already enrolled, their enrollment will be updated.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z
        .string()
        .describe('Course identifier — internal ID, "externalId:XXX", or "courseId:XXX"'),
      userId: z
        .string()
        .describe('User identifier — internal ID, "externalId:XXX", or "userName:XXX"'),
      courseRoleId: z
        .enum([
          'Instructor',
          'BbFacilitator',
          'TeachingAssistant',
          'CourseBuilder',
          'Grader',
          'Student',
          'Guest'
        ])
        .optional()
        .describe('Course role to assign (defaults to Student)'),
      available: z.enum(['Yes', 'No']).optional().describe('Whether the enrollment is active'),
      dataSourceId: z.string().optional().describe('Data source ID')
    })
  )
  .output(membershipOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let membership = await client.createCourseMembership(
      ctx.input.courseId,
      ctx.input.userId,
      {
        courseRoleId: ctx.input.courseRoleId,
        availability: ctx.input.available ? { available: ctx.input.available } : undefined,
        dataSourceId: ctx.input.dataSourceId
      }
    );

    return {
      output: mapMembership(membership),
      message: `Enrolled user **${ctx.input.userId}** in course **${ctx.input.courseId}** as **${membership.courseRoleId || 'Student'}**.`
    };
  })
  .build();

export let unenrollUser = SlateTool.create(spec, {
  name: 'Unenroll User from Course',
  key: 'unenroll_user',
  description: `Remove a user's enrollment from a course. This removes the user from the course roster.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      userId: z.string().describe('User identifier')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the user was unenrolled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    await client.deleteCourseMembership(ctx.input.courseId, ctx.input.userId);

    return {
      output: { removed: true },
      message: `Unenrolled user **${ctx.input.userId}** from course **${ctx.input.courseId}**.`
    };
  })
  .build();

export let listEnrollments = SlateTool.create(spec, {
  name: 'List Enrollments',
  key: 'list_enrollments',
  description: `List course enrollments. Provide a courseId to list all users in a course, or a userId to list all courses a user is enrolled in.`,
  instructions: [
    'Provide either courseId or userId — if both are provided, courseId takes precedence and lists users in that course.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().optional().describe('Course identifier to list members of'),
      userId: z.string().optional().describe('User identifier to list enrolled courses for'),
      role: z.string().optional().describe('Filter by role (only when listing by courseId)'),
      offset: z.number().optional().describe('Number of items to skip'),
      limit: z.number().optional().describe('Maximum results to return')
    })
  )
  .output(
    z.object({
      enrollments: z.array(membershipOutputSchema),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    if (!ctx.input.courseId && !ctx.input.userId) {
      throw new Error('Either courseId or userId must be provided.');
    }

    let result: any;
    if (ctx.input.courseId) {
      result = await client.listCourseMemberships(ctx.input.courseId, {
        offset: ctx.input.offset,
        limit: ctx.input.limit,
        role: ctx.input.role
      });
    } else {
      result = await client.listUserMemberships(ctx.input.userId!, {
        offset: ctx.input.offset,
        limit: ctx.input.limit
      });
    }

    let enrollments = (result.results || []).map(mapMembership);

    return {
      output: { enrollments, hasMore: !!result.paging?.nextPage },
      message: `Found **${enrollments.length}** enrollment(s).`
    };
  })
  .build();

export let getEnrollment = SlateTool.create(spec, {
  name: 'Get Enrollment',
  key: 'get_enrollment',
  description: `Get the enrollment details for a specific user in a specific course.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      userId: z.string().describe('User identifier')
    })
  )
  .output(membershipOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let membership = await client.getCourseMembership(ctx.input.courseId, ctx.input.userId);

    return {
      output: mapMembership(membership),
      message: `User **${ctx.input.userId}** is enrolled in course **${ctx.input.courseId}** as **${membership.courseRoleId || 'Student'}**.`
    };
  })
  .build();

export let updateEnrollment = SlateTool.create(spec, {
  name: 'Update Enrollment',
  key: 'update_enrollment',
  description: `Update a user's enrollment in a course — change their role, availability, or data source.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      userId: z.string().describe('User identifier'),
      courseRoleId: z
        .enum([
          'Instructor',
          'BbFacilitator',
          'TeachingAssistant',
          'CourseBuilder',
          'Grader',
          'Student',
          'Guest'
        ])
        .optional()
        .describe('New course role'),
      available: z.enum(['Yes', 'No']).optional().describe('Whether the enrollment is active'),
      dataSourceId: z.string().optional().describe('Data source ID')
    })
  )
  .output(membershipOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let membership = await client.updateCourseMembership(
      ctx.input.courseId,
      ctx.input.userId,
      {
        courseRoleId: ctx.input.courseRoleId,
        availability: ctx.input.available ? { available: ctx.input.available } : undefined,
        dataSourceId: ctx.input.dataSourceId
      }
    );

    return {
      output: mapMembership(membership),
      message: `Updated enrollment for user **${ctx.input.userId}** in course **${ctx.input.courseId}**.`
    };
  })
  .build();
