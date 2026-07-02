import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let materialSchema = z
  .object({
    driveFile: z
      .object({
        driveFile: z
          .object({
            driveId: z.string().optional().describe('Drive file ID'),
            title: z.string().optional().describe('Title of the Drive file'),
            alternateLink: z.string().optional().describe('URL to the file')
          })
          .optional(),
        shareMode: z
          .enum(['STUDENT_COPY', 'VIEW', 'EDIT'])
          .optional()
          .describe('Share mode for the file')
      })
      .optional(),
    youtubeVideo: z
      .object({
        id: z.string().optional().describe('YouTube video ID'),
        title: z.string().optional().describe('Title of the video'),
        alternateLink: z.string().optional().describe('URL to the video')
      })
      .optional(),
    link: z
      .object({
        url: z.string().optional().describe('URL of the link'),
        title: z.string().optional().describe('Title of the link')
      })
      .optional(),
    form: z
      .object({
        formUrl: z.string().optional().describe('URL of the Google Form'),
        title: z.string().optional().describe('Title of the form'),
        responseUrl: z.string().optional().describe('URL to the form responses')
      })
      .optional()
  })
  .describe('Material attached to coursework');

export let createCoursework = SlateTool.create(spec, {
  name: 'Create Coursework',
  key: 'create_coursework',
  description: `Create an assignment, quiz, or other coursework in a Google Classroom course. Supports attaching materials (Drive files, YouTube videos, links, forms), setting due dates, and assigning to specific students.`,
  instructions: [
    'Set workType to ASSIGNMENT for assignments, SHORT_ANSWER_QUESTION or MULTIPLE_CHOICE_QUESTION for questions.',
    'Due date and time use UTC. Set dueDate and dueTime separately.',
    'To assign to specific students, set assigneeMode to INDIVIDUAL_STUDENTS and provide individualStudentIds.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleClassroomActionScopes.createCoursework)
  .input(
    z.object({
      courseId: z.string().describe('ID of the course'),
      title: z.string().describe('Title of the coursework'),
      description: z.string().optional().describe('Description of the coursework'),
      workType: z
        .enum(['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION'])
        .describe('Type of coursework'),
      state: z
        .enum(['PUBLISHED', 'DRAFT'])
        .optional()
        .describe('State of the coursework. Defaults to DRAFT.'),
      maxPoints: z.number().optional().describe('Maximum points for the coursework'),
      dueDate: z
        .object({
          year: z.number(),
          month: z.number(),
          day: z.number()
        })
        .optional()
        .describe('Due date in UTC (year, month, day)'),
      dueTime: z
        .object({
          hours: z.number().optional(),
          minutes: z.number().optional()
        })
        .optional()
        .describe('Due time in UTC (hours, minutes)'),
      topicId: z.string().optional().describe('Topic ID to associate with this coursework'),
      materials: z.array(materialSchema).optional().describe('Materials to attach'),
      assigneeMode: z
        .enum(['ALL_STUDENTS', 'INDIVIDUAL_STUDENTS'])
        .optional()
        .describe('Whether to assign to all students or specific students'),
      individualStudentIds: z
        .array(z.string())
        .optional()
        .describe('Student IDs to assign to (when assigneeMode is INDIVIDUAL_STUDENTS)'),
      multipleChoiceQuestion: z
        .object({
          choices: z.array(z.string()).describe('Choices for the multiple choice question')
        })
        .optional()
        .describe(
          'Multiple choice question options (when workType is MULTIPLE_CHOICE_QUESTION)'
        )
    })
  )
  .output(
    z.object({
      courseWorkId: z.string().optional().describe('ID of the created coursework'),
      courseId: z.string().optional().describe('Course ID'),
      title: z.string().optional().describe('Title of the coursework'),
      state: z.string().optional().describe('State of the coursework'),
      workType: z.string().optional().describe('Type of coursework'),
      maxPoints: z.number().optional().describe('Maximum points'),
      alternateLink: z.string().optional().describe('URL to the coursework'),
      creationTime: z.string().optional().describe('When the coursework was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });

    let courseWork: Record<string, any> = {
      title: ctx.input.title,
      workType: ctx.input.workType
    };

    if (ctx.input.description) courseWork.description = ctx.input.description;
    if (ctx.input.state) courseWork.state = ctx.input.state;
    if (ctx.input.maxPoints !== undefined) courseWork.maxPoints = ctx.input.maxPoints;
    if (ctx.input.dueDate) courseWork.dueDate = ctx.input.dueDate;
    if (ctx.input.dueTime) courseWork.dueTime = ctx.input.dueTime;
    if (ctx.input.topicId) courseWork.topicId = ctx.input.topicId;
    if (ctx.input.materials) courseWork.materials = ctx.input.materials;
    if (ctx.input.multipleChoiceQuestion)
      courseWork.multipleChoiceQuestion = ctx.input.multipleChoiceQuestion;

    if (ctx.input.assigneeMode) {
      courseWork.assigneeMode = ctx.input.assigneeMode;
      if (ctx.input.assigneeMode === 'INDIVIDUAL_STUDENTS' && ctx.input.individualStudentIds) {
        courseWork.individualStudentsOptions = {
          studentIds: ctx.input.individualStudentIds
        };
      }
    }

    let result = await client.createCourseWork(ctx.input.courseId, courseWork);

    return {
      output: {
        courseWorkId: result.id,
        courseId: result.courseId,
        title: result.title,
        state: result.state,
        workType: result.workType,
        maxPoints: result.maxPoints,
        alternateLink: result.alternateLink,
        creationTime: result.creationTime
      },
      message: `Created ${result.workType} **${result.title}** (${result.state}).`
    };
  })
  .build();
