import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let gradeColumnOutputSchema = z.object({
  columnId: z.string().describe('Grade column ID'),
  name: z.string().describe('Column name'),
  displayName: z.string().optional().describe('Display name'),
  description: z.string().optional().describe('Column description'),
  scorePossible: z.number().optional().describe('Maximum possible score'),
  gradingType: z.string().optional().describe('Grading type'),
  dueDate: z.string().optional().describe('Due date'),
  available: z.string().optional().describe('Availability status'),
  created: z.string().optional().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp')
});

let mapColumn = (c: any) => ({
  columnId: c.id,
  name: c.name,
  displayName: c.displayName,
  description: c.description,
  scorePossible: c.score?.possible,
  gradingType: c.grading?.type,
  dueDate: c.grading?.due,
  available: c.availability?.available,
  created: c.created,
  modified: c.modified
});

let gradeOutputSchema = z.object({
  userId: z.string().describe('User ID'),
  columnId: z.string().describe('Grade column ID'),
  score: z.number().optional().describe('Numeric score'),
  text: z.string().optional().describe('Text grade'),
  notes: z.string().optional().describe('Instructor notes'),
  feedback: z.string().optional().describe('Feedback for the student'),
  exempt: z.boolean().optional().describe('Whether the grade is exempt'),
  status: z.string().optional().describe('Grade status'),
  created: z.string().optional().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp')
});

let mapGrade = (g: any) => ({
  userId: g.userId,
  columnId: g.columnId,
  score: g.score,
  text: g.text,
  notes: g.notes,
  feedback: g.feedback,
  exempt: g.exempt,
  status: g.status,
  created: g.created,
  modified: g.modified
});

export let createGradeColumn = SlateTool.create(spec, {
  name: 'Create Grade Column',
  key: 'create_grade_column',
  description: `Create a new grade column in a course's gradebook. Configure scoring, grading type, and due date.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      name: z.string().describe('Column name'),
      displayName: z.string().optional().describe('Display name shown to students'),
      description: z.string().optional().describe('Column description'),
      externalId: z.string().optional().describe('External identifier'),
      scorePossible: z.number().optional().describe('Maximum possible score'),
      available: z.enum(['Yes', 'No']).optional().describe('Whether the column is visible'),
      gradingType: z.string().optional().describe('Grading type (e.g., "Attempts", "Manual")'),
      dueDate: z.string().optional().describe('Due date (ISO 8601)'),
      attemptsAllowed: z.number().optional().describe('Number of attempts allowed')
    })
  )
  .output(gradeColumnOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let column = await client.createGradeColumn(ctx.input.courseId, {
      name: ctx.input.name,
      displayName: ctx.input.displayName,
      description: ctx.input.description,
      externalId: ctx.input.externalId,
      score: ctx.input.scorePossible ? { possible: ctx.input.scorePossible } : undefined,
      availability: ctx.input.available ? { available: ctx.input.available } : undefined,
      grading:
        ctx.input.gradingType || ctx.input.dueDate || ctx.input.attemptsAllowed
          ? {
              type: ctx.input.gradingType,
              due: ctx.input.dueDate,
              attemptsAllowed: ctx.input.attemptsAllowed
            }
          : undefined
    });

    return {
      output: mapColumn(column),
      message: `Created grade column **${column.name}** in course **${ctx.input.courseId}**.`
    };
  })
  .build();

export let listGradeColumns = SlateTool.create(spec, {
  name: 'List Grade Columns',
  key: 'list_grade_columns',
  description: `List all grade columns in a course's gradebook.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      offset: z.number().optional().describe('Number of items to skip'),
      limit: z.number().optional().describe('Maximum results to return')
    })
  )
  .output(
    z.object({
      columns: z.array(gradeColumnOutputSchema),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let result = await client.listGradeColumns(ctx.input.courseId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let columns = (result.results || []).map(mapColumn);
    return {
      output: { columns, hasMore: !!result.paging?.nextPage },
      message: `Found **${columns.length}** grade column(s).`
    };
  })
  .build();

export let updateGradeColumn = SlateTool.create(spec, {
  name: 'Update Grade Column',
  key: 'update_grade_column',
  description: `Update a grade column's properties in a course gradebook.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      columnId: z.string().describe('Grade column ID'),
      name: z.string().optional().describe('New column name'),
      displayName: z.string().optional().describe('New display name'),
      description: z.string().optional().describe('New description'),
      scorePossible: z.number().optional().describe('New maximum possible score'),
      available: z.enum(['Yes', 'No']).optional().describe('Visibility status'),
      dueDate: z.string().optional().describe('New due date (ISO 8601)')
    })
  )
  .output(gradeColumnOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let column = await client.updateGradeColumn(ctx.input.courseId, ctx.input.columnId, {
      name: ctx.input.name,
      displayName: ctx.input.displayName,
      description: ctx.input.description,
      score: ctx.input.scorePossible ? { possible: ctx.input.scorePossible } : undefined,
      availability: ctx.input.available ? { available: ctx.input.available } : undefined,
      grading: ctx.input.dueDate ? { due: ctx.input.dueDate } : undefined
    });

    return {
      output: mapColumn(column),
      message: `Updated grade column **${column.name}**.`
    };
  })
  .build();

export let recordGrade = SlateTool.create(spec, {
  name: 'Record Grade',
  key: 'record_grade',
  description: `Record or update a student's grade for a specific grade column. Set the score, text grade, feedback, or exempt status.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      columnId: z.string().describe('Grade column ID'),
      userId: z.string().describe('User identifier'),
      score: z.number().optional().describe('Numeric score'),
      text: z.string().optional().describe('Text grade value'),
      notes: z.string().optional().describe('Instructor-only notes'),
      feedback: z.string().optional().describe('Feedback visible to the student'),
      exempt: z.boolean().optional().describe('Whether to mark the grade as exempt')
    })
  )
  .output(gradeOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let grade = await client.updateGrade(
      ctx.input.courseId,
      ctx.input.columnId,
      ctx.input.userId,
      {
        score: ctx.input.score,
        text: ctx.input.text,
        notes: ctx.input.notes,
        feedback: ctx.input.feedback,
        exempt: ctx.input.exempt
      }
    );

    return {
      output: mapGrade(grade),
      message: `Recorded grade for user **${ctx.input.userId}**: score **${grade.score ?? 'N/A'}**.`
    };
  })
  .build();

export let getGrade = SlateTool.create(spec, {
  name: 'Get Grade',
  key: 'get_grade',
  description: `Get a specific student's grade for a grade column.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      columnId: z.string().describe('Grade column ID'),
      userId: z.string().describe('User identifier')
    })
  )
  .output(gradeOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let grade = await client.getGrade(
      ctx.input.courseId,
      ctx.input.columnId,
      ctx.input.userId
    );

    return {
      output: mapGrade(grade),
      message: `Grade for user **${ctx.input.userId}**: score **${grade.score ?? 'N/A'}**.`
    };
  })
  .build();

export let listGrades = SlateTool.create(spec, {
  name: 'List Grades',
  key: 'list_grades',
  description: `List grades for a grade column (all students) or for a user (all columns). Provide columnId to get all student grades for a column, or userId to get all grades for a specific student.`,
  instructions: [
    'Provide either columnId or userId along with the courseId.',
    'If both columnId and userId are provided, columnId takes precedence (lists all students for that column).'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      columnId: z
        .string()
        .optional()
        .describe('Grade column ID — list all student grades for this column'),
      userId: z
        .string()
        .optional()
        .describe('User identifier — list all column grades for this user'),
      offset: z.number().optional().describe('Number of items to skip'),
      limit: z.number().optional().describe('Maximum results to return')
    })
  )
  .output(
    z.object({
      grades: z.array(gradeOutputSchema),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    if (!ctx.input.columnId && !ctx.input.userId) {
      throw new Error('Either columnId or userId must be provided.');
    }

    let result: any;
    if (ctx.input.columnId) {
      result = await client.listColumnGrades(ctx.input.courseId, ctx.input.columnId, {
        offset: ctx.input.offset,
        limit: ctx.input.limit
      });
    } else {
      result = await client.listUserGrades(ctx.input.courseId, ctx.input.userId!, {
        offset: ctx.input.offset,
        limit: ctx.input.limit
      });
    }

    let grades = (result.results || []).map(mapGrade);
    return {
      output: { grades, hasMore: !!result.paging?.nextPage },
      message: `Found **${grades.length}** grade(s).`
    };
  })
  .build();
