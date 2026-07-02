import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSurveys = SlateTool.create(spec, {
  name: 'List Surveys',
  key: 'list_surveys',
  description: `List all surveys in your Formbricks environment. Returns survey metadata including name, status, type, question count, and response count. Use to browse available surveys or find a specific survey by name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of surveys to return'),
      offset: z.number().optional().describe('Number of surveys to skip for pagination')
    })
  )
  .output(
    z.object({
      surveys: z.array(
        z.object({
          surveyId: z.string().describe('Unique survey identifier'),
          name: z.string().describe('Survey name'),
          status: z.string().describe('Survey status (draft, inProgress, paused, completed)'),
          type: z.string().describe('Survey type (link or app)'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let surveys = await client.listSurveys({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = surveys.map((s: any) => ({
      surveyId: s.id,
      name: s.name ?? '',
      status: s.status ?? '',
      type: s.type ?? '',
      createdAt: s.createdAt ?? '',
      updatedAt: s.updatedAt ?? ''
    }));

    return {
      output: { surveys: mapped },
      message: `Found **${mapped.length}** survey(s).`
    };
  })
  .build();
