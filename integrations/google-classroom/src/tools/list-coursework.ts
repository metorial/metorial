import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let courseWorkSchema = z.object({
  courseWorkId: z.string().optional().describe('ID of the coursework'),
  courseId: z.string().optional().describe('Course ID'),
  title: z.string().optional().describe('Title of the coursework'),
  description: z.string().optional().describe('Description'),
  state: z.string().optional().describe('State (PUBLISHED, DRAFT, DELETED)'),
  workType: z
    .string()
    .optional()
    .describe('Type (ASSIGNMENT, SHORT_ANSWER_QUESTION, MULTIPLE_CHOICE_QUESTION)'),
  maxPoints: z.number().optional().describe('Maximum points'),
  dueDate: z.any().optional().describe('Due date'),
  dueTime: z.any().optional().describe('Due time'),
  topicId: z.string().optional().describe('Associated topic ID'),
  alternateLink: z.string().optional().describe('URL to the coursework'),
  creationTime: z.string().optional().describe('When the coursework was created'),
  updateTime: z.string().optional().describe('When the coursework was last updated')
});

export let listCoursework = SlateTool.create(spec, {
  name: 'List Coursework',
  key: 'list_coursework',
  description: `List coursework (assignments, questions) in a Google Classroom course. Can filter by state and order results. Returns coursework metadata including title, type, points, and due dates.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleClassroomActionScopes.listCoursework)
  .input(
    z.object({
      courseId: z.string().describe('ID of the course'),
      courseWorkStates: z
        .array(z.enum(['PUBLISHED', 'DRAFT', 'DELETED']))
        .optional()
        .describe('Filter by coursework states'),
      orderBy: z
        .string()
        .optional()
        .describe('Order by field (e.g., "dueDate asc", "updateTime desc")'),
      pageSize: z.number().optional().describe('Maximum number of items to return'),
      pageToken: z.string().optional().describe('Token for next page')
    })
  )
  .output(
    z.object({
      courseWork: z.array(courseWorkSchema).describe('List of coursework items'),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });

    let result = await client.listCourseWork(ctx.input.courseId, {
      courseWorkStates: ctx.input.courseWorkStates,
      orderBy: ctx.input.orderBy,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let items = (result.courseWork || []).map((cw: any) => ({
      courseWorkId: cw.id,
      courseId: cw.courseId,
      title: cw.title,
      description: cw.description,
      state: cw.state,
      workType: cw.workType,
      maxPoints: cw.maxPoints,
      dueDate: cw.dueDate,
      dueTime: cw.dueTime,
      topicId: cw.topicId,
      alternateLink: cw.alternateLink,
      creationTime: cw.creationTime,
      updateTime: cw.updateTime
    }));

    return {
      output: {
        courseWork: items,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${items.length}** coursework item(s) in course \`${ctx.input.courseId}\`.`
    };
  })
  .build();
