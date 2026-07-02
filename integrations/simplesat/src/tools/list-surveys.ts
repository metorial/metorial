import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSurveys = SlateTool.create(spec, {
  name: 'List Surveys',
  key: 'list_surveys',
  description: `Retrieve all surveys configured in your Simplesat account. Returns survey details including name, brand, metric type (CSAT, NPS, CES, 5-star), and survey token.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of surveys'),
      surveys: z.array(
        z.object({
          surveyId: z.number().describe('Unique survey ID'),
          name: z.string().describe('Survey name'),
          brandName: z.string().describe('Brand name associated with the survey'),
          metric: z.string().describe('Survey metric type (e.g. CSAT, NPS, CES)'),
          surveyType: z.string().describe('Type of the survey'),
          surveyToken: z.string().describe('Unique survey token for API operations')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSurveys({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let surveys = result.results.map(s => ({
      surveyId: s.id,
      name: s.name,
      brandName: s.brand_name,
      metric: s.metric,
      surveyType: s.survey_type,
      surveyToken: s.survey_token
    }));

    return {
      output: {
        totalCount: result.count,
        surveys
      },
      message: `Found **${result.count}** survey(s). Returned **${surveys.length}** on this page.`
    };
  })
  .build();
