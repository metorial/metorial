import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let classroomApiErrorMessage = (error: unknown, fallback: string) => {
  let message = (error as { response?: { data?: { error?: { message?: string } } } })?.response
    ?.data?.error?.message;
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return fallback;
};

let rubricLevelSchema = z.object({
  levelId: z.string().optional().describe('Level ID'),
  title: z
    .string()
    .optional()
    .describe('Title of this level (e.g., "Excellent", "Good", "Needs Improvement")'),
  description: z.string().optional().describe('Description of this level'),
  points: z.number().optional().describe('Points for this level')
});

let rubricCriterionSchema = z.object({
  criterionId: z.string().optional().describe('Criterion ID'),
  title: z.string().optional().describe('Title of the criterion'),
  description: z.string().optional().describe('Description of the criterion'),
  levels: z.array(rubricLevelSchema).optional().describe('Grading levels for this criterion')
});

let rubricSchema = z.object({
  rubricId: z.string().optional().describe('ID of the rubric'),
  courseId: z.string().optional().describe('Course ID'),
  courseWorkId: z.string().optional().describe('Coursework ID'),
  criteria: z.array(rubricCriterionSchema).optional().describe('Grading criteria'),
  creationTime: z.string().optional().describe('When the rubric was created'),
  updateTime: z.string().optional().describe('When the rubric was last updated')
});

export let manageRubrics = SlateTool.create(spec, {
  name: 'Manage Rubrics',
  key: 'manage_rubrics',
  description: `Create, list, update, or delete rubrics for coursework in Google Classroom. Rubrics define grading criteria with levels and point values, enabling structured grading of assignments.`,
  instructions: [
    'Each rubric belongs to a specific coursework item.',
    'Criteria have levels that define the grading scale (e.g., Excellent=4, Good=3, Fair=2, Poor=1).'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleClassroomActionScopes.manageRubrics)
  .input(
    z.object({
      courseId: z.string().describe('ID of the course'),
      courseWorkId: z.string().describe('ID of the coursework'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The action to perform'),
      rubricId: z.string().optional().describe('Rubric ID (required for get, update, delete)'),
      criteria: z
        .array(
          z.object({
            title: z.string().describe('Title of the criterion'),
            description: z.string().optional().describe('Description of the criterion'),
            levels: z
              .array(
                z.object({
                  title: z.string().describe('Title of the level'),
                  description: z.string().optional().describe('Description of the level'),
                  points: z.number().optional().describe('Points for the level')
                })
              )
              .describe('Grading levels')
          })
        )
        .optional()
        .describe('Grading criteria (for create/update)'),
      pageSize: z.number().optional().describe('Maximum results to return (for list)'),
      pageToken: z.string().optional().describe('Token for next page (for list)')
    })
  )
  .output(
    z.object({
      rubric: rubricSchema.optional().describe('The rubric'),
      rubrics: z.array(rubricSchema).optional().describe('List of rubrics'),
      nextPageToken: z.string().optional().describe('Token for the next page'),
      success: z.boolean().optional().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });
    let { courseId, courseWorkId, action, rubricId } = ctx.input;

    let mapRubric = (r: any) => ({
      rubricId: r.id,
      courseId: r.courseId,
      courseWorkId: r.courseWorkId,
      criteria: r.criteria,
      creationTime: r.creationTime,
      updateTime: r.updateTime
    });

    if (action === 'list') {
      let result = await client.listRubrics(
        courseId,
        courseWorkId,
        ctx.input.pageSize,
        ctx.input.pageToken
      );
      let rubrics = (result.rubrics || []).map(mapRubric);
      return {
        output: { rubrics, nextPageToken: result.nextPageToken, success: true },
        message: `Found **${rubrics.length}** rubric(s).`
      };
    }

    if (action === 'get') {
      if (!rubricId) throw new Error('rubricId is required');
      let result = await client.getRubric(courseId, courseWorkId, rubricId);
      return {
        output: { rubric: mapRubric(result), success: true },
        message: `Retrieved rubric \`${rubricId}\`.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.criteria) throw new Error('criteria is required for creating a rubric');
      let result: any;
      try {
        result = await client.createRubric(courseId, courseWorkId, {
          criteria: ctx.input.criteria
        });
      } catch (error) {
        throw new Error(classroomApiErrorMessage(error, 'Failed to create rubric.'));
      }
      return {
        output: { rubric: mapRubric(result), success: true },
        message: `Created rubric with **${ctx.input.criteria.length}** criteria.`
      };
    }

    if (action === 'update') {
      if (!rubricId) throw new Error('rubricId is required');
      if (!ctx.input.criteria) throw new Error('criteria is required for updating a rubric');
      let result = await client.updateRubric(
        courseId,
        courseWorkId,
        rubricId,
        { criteria: ctx.input.criteria },
        'criteria'
      );
      return {
        output: { rubric: mapRubric(result), success: true },
        message: `Updated rubric \`${rubricId}\`.`
      };
    }

    if (action === 'delete') {
      if (!rubricId) throw new Error('rubricId is required');
      await client.deleteRubric(courseId, courseWorkId, rubricId);
      return {
        output: { success: true },
        message: `Deleted rubric \`${rubricId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
