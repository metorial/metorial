import { SlateTool } from 'slates';
import { z } from 'zod';
import { SatisMeterClient } from '../lib/client';
import { projectIdSchema, resolveProject } from '../lib/contracts';
import { spec } from '../spec';

export const getSurveyTool = SlateTool.create(spec, {
  name: 'Get Survey',
  key: 'get_survey',
  description:
    'Retrieve exact survey metadata within a project, including its ID, name, type and state. Use List Surveys to discover IDs. Question IDs for inserting responses must come from the dashboard.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      surveyId: z.string().describe('Exact survey ID from List Surveys')
    })
  )
  .output(
    z.object({
      surveyId: z.string(),
      name: z.string().optional(),
      type: z.string().optional(),
      state: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const survey = await new SatisMeterClient(ctx.auth.token, ctx.auth.writeKey).getSurvey(
      resolveProject(ctx.input.projectId, ctx.config),
      ctx.input.surveyId
    );
    return {
      output: {
        surveyId: survey.id,
        name: survey.name,
        type: survey.type,
        state: survey.state
      },
      message: 'Retrieved the selected survey.'
    };
  })
  .build();
