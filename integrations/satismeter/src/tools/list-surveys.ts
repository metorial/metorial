import { SlateTool } from 'slates';
import { z } from 'zod';
import { SatisMeterClient } from '../lib/client';
import { spec } from '../spec';

export let listSurveysTool = SlateTool.create(spec, {
  name: 'List Surveys',
  key: 'list_surveys',
  description: `Retrieve all surveys (campaigns) for the configured project. Returns each survey's ID, name, type, and state. Use this to discover available surveys before fetching responses or statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      surveys: z
        .array(
          z.object({
            surveyId: z.string().describe('Unique identifier of the survey'),
            name: z.string().optional().describe('Name of the survey'),
            type: z.string().optional().describe('Survey type (e.g., NPS, CSAT, CES)'),
            state: z.string().optional().describe('Current state of the survey')
          })
        )
        .describe('List of surveys in the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SatisMeterClient(ctx.auth.token, ctx.auth.writeKey);
    let result = await client.listSurveys(ctx.config.projectId);

    let surveys = (result?.data || []).map((s: any) => ({
      surveyId: s.id,
      name: s.name,
      type: s.type,
      state: s.state
    }));

    return {
      output: { surveys },
      message: `Found **${surveys.length}** survey(s) in the project.`
    };
  })
  .build();
