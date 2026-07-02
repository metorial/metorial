import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let courseAvailabilitySchema = z
  .object({
    available: z
      .enum(['Yes', 'No', 'Disabled', 'Term'])
      .optional()
      .describe('Whether the course is available'),
    duration: z
      .object({
        type: z
          .enum(['Continuous', 'DateRange', 'FixedNumDays', 'Term'])
          .optional()
          .describe('Duration type'),
        start: z.string().optional().describe('Start date (ISO 8601)'),
        end: z.string().optional().describe('End date (ISO 8601)')
      })
      .optional()
      .describe('Duration settings')
  })
  .optional();

let courseEnrollmentSchema = z
  .object({
    type: z
      .enum(['InstructorLed', 'SelfEnrollment', 'EmailEnrollment'])
      .optional()
      .describe('Enrollment type'),
    accessCode: z.string().optional().describe('Access code for self-enrollment')
  })
  .optional();

export let createCourse = SlateTool.create(spec, {
  name: 'Create Course',
  key: 'create_course',
  description: `Create a new course in Blackboard Learn. Specify a unique course ID (the human-readable identifier) and a name. Optionally configure availability, enrollment settings, terms, and guest access.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      courseId: z.string().describe('Unique course identifier (e.g., "CS101-2024")'),
      name: z.string().describe('Display name of the course'),
      description: z.string().optional().describe('Course description (HTML supported)'),
      organization: z
        .boolean()
        .optional()
        .describe('If true, creates an organization instead of a course'),
      termId: z.string().optional().describe('Term ID to associate with the course'),
      availability: courseAvailabilitySchema,
      enrollment: courseEnrollmentSchema,
      allowGuests: z.boolean().optional().describe('Whether guests can access the course')
    })
  )
  .output(
    z.object({
      courseId: z.string().describe('Unique course identifier'),
      internalId: z.string().describe('Blackboard internal ID'),
      name: z.string().describe('Course name'),
      description: z.string().optional().describe('Course description'),
      organization: z.boolean().describe('Whether this is an organization'),
      created: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let course = await client.createCourse({
      courseId: ctx.input.courseId,
      name: ctx.input.name,
      description: ctx.input.description,
      organization: ctx.input.organization,
      termId: ctx.input.termId,
      availability: ctx.input.availability,
      enrollment: ctx.input.enrollment,
      allowGuests: ctx.input.allowGuests
    });

    return {
      output: {
        courseId: course.courseId,
        internalId: course.id,
        name: course.name,
        description: course.description,
        organization: course.organization,
        created: course.created
      },
      message: `Created course **${course.name}** (${course.courseId}).`
    };
  })
  .build();

export let getCourse = SlateTool.create(spec, {
  name: 'Get Course',
  key: 'get_course',
  description: `Retrieve details for a specific course. Accepts the course's internal ID, external ID (prefixed with \`externalId:\`), or course ID (prefixed with \`courseId:\`).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z
        .string()
        .describe('Course identifier — internal ID, "externalId:XXX", or "courseId:XXX"')
    })
  )
  .output(
    z.object({
      courseId: z.string().describe('Course identifier'),
      internalId: z.string().describe('Internal ID'),
      name: z.string().describe('Course name'),
      description: z.string().optional().describe('Course description'),
      organization: z.boolean().describe('Whether this is an organization'),
      termId: z.string().optional().describe('Associated term ID'),
      availability: z.any().optional().describe('Availability settings'),
      enrollment: z.any().optional().describe('Enrollment settings'),
      created: z.string().optional().describe('Creation timestamp'),
      modified: z.string().optional().describe('Last modified timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let course = await client.getCourse(ctx.input.courseId);

    return {
      output: {
        courseId: course.courseId,
        internalId: course.id,
        name: course.name,
        description: course.description,
        organization: course.organization,
        termId: course.termId,
        availability: course.availability,
        enrollment: course.enrollment,
        created: course.created,
        modified: course.modified
      },
      message: `Retrieved course **${course.name}** (${course.courseId}).`
    };
  })
  .build();

export let updateCourse = SlateTool.create(spec, {
  name: 'Update Course',
  key: 'update_course',
  description: `Update an existing course's properties such as name, description, availability, enrollment settings, and term association. Only provided fields will be changed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      courseId: z
        .string()
        .describe('Course identifier — internal ID, "externalId:XXX", or "courseId:XXX"'),
      name: z.string().optional().describe('New display name'),
      description: z.string().optional().describe('New description (HTML supported)'),
      termId: z.string().optional().describe('New term ID'),
      availability: courseAvailabilitySchema,
      enrollment: courseEnrollmentSchema,
      allowGuests: z.boolean().optional().describe('Whether guests can access the course')
    })
  )
  .output(
    z.object({
      courseId: z.string().describe('Course identifier'),
      internalId: z.string().describe('Internal ID'),
      name: z.string().describe('Updated course name'),
      modified: z.string().optional().describe('Last modified timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { courseId, ...updateData } = ctx.input;
    let course = await client.updateCourse(courseId, updateData);

    return {
      output: {
        courseId: course.courseId,
        internalId: course.id,
        name: course.name,
        modified: course.modified
      },
      message: `Updated course **${course.name}** (${course.courseId}).`
    };
  })
  .build();

export let deleteCourse = SlateTool.create(spec, {
  name: 'Delete Course',
  key: 'delete_course',
  description: `Permanently delete a course from Blackboard Learn. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      courseId: z
        .string()
        .describe('Course identifier — internal ID, "externalId:XXX", or "courseId:XXX"')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the course was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    await client.deleteCourse(ctx.input.courseId);

    return {
      output: { deleted: true },
      message: `Deleted course **${ctx.input.courseId}**.`
    };
  })
  .build();

export let listCourses = SlateTool.create(spec, {
  name: 'List Courses',
  key: 'list_courses',
  description: `List courses in Blackboard Learn with optional filtering by availability, term, and data source. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Number of items to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of results to return (max 200)'),
      availability: z
        .enum(['Yes', 'No', 'Disabled', 'Term'])
        .optional()
        .describe('Filter by availability status'),
      termId: z.string().optional().describe('Filter by term ID'),
      dataSourceId: z.string().optional().describe('Filter by data source ID'),
      sort: z.string().optional().describe('Sort field (e.g., "courseId", "name", "created")')
    })
  )
  .output(
    z.object({
      courses: z.array(
        z.object({
          courseId: z.string(),
          internalId: z.string(),
          name: z.string(),
          organization: z.boolean(),
          termId: z.string().optional(),
          created: z.string().optional(),
          modified: z.string().optional()
        })
      ),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let result = await client.listCourses({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      availability: ctx.input.availability,
      termId: ctx.input.termId,
      dataSourceId: ctx.input.dataSourceId,
      sort: ctx.input.sort
    });

    let courses = (result.results || []).map(c => ({
      courseId: c.courseId,
      internalId: c.id,
      name: c.name,
      organization: c.organization,
      termId: c.termId,
      created: c.created,
      modified: c.modified
    }));

    return {
      output: {
        courses,
        hasMore: !!result.paging?.nextPage
      },
      message: `Found **${courses.length}** course(s).${result.paging?.nextPage ? ' More results available.' : ''}`
    };
  })
  .build();
