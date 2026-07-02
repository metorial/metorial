import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

let surveySchema = z.object({
  surveyId: z.string().describe('Chameleon microsurvey ID'),
  name: z.string().optional().describe('Microsurvey name'),
  position: z.number().optional().describe('Display order'),
  segmentId: z.string().optional().describe('Associated segment ID'),
  publishedAt: z.string().nullable().optional().describe('Publication timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  tagIds: z.array(z.string()).optional().describe('Associated tag IDs'),
  stats: z
    .object({
      startedCount: z.number().optional(),
      completedCount: z.number().optional(),
      exitedCount: z.number().optional(),
      lastStartedAt: z.string().nullable().optional(),
      lastCompletedAt: z.string().nullable().optional(),
      lastExitedAt: z.string().nullable().optional()
    })
    .optional()
    .describe('Microsurvey interaction statistics')
});

let mapSurvey = (survey: Record<string, unknown>) => ({
  surveyId: survey.id as string,
  name: survey.name as string | undefined,
  position: survey.position as number | undefined,
  segmentId: survey.segment_id as string | undefined,
  publishedAt: survey.published_at as string | null | undefined,
  createdAt: survey.created_at as string | undefined,
  updatedAt: survey.updated_at as string | undefined,
  tagIds: survey.tag_ids as string[] | undefined,
  stats: survey.stats
    ? {
        startedCount: (survey.stats as Record<string, unknown>).started_count as
          | number
          | undefined,
        completedCount: (survey.stats as Record<string, unknown>).completed_count as
          | number
          | undefined,
        exitedCount: (survey.stats as Record<string, unknown>).exited_count as
          | number
          | undefined,
        lastStartedAt: (survey.stats as Record<string, unknown>).last_started_at as
          | string
          | null
          | undefined,
        lastCompletedAt: (survey.stats as Record<string, unknown>).last_completed_at as
          | string
          | null
          | undefined,
        lastExitedAt: (survey.stats as Record<string, unknown>).last_exited_at as
          | string
          | null
          | undefined
      }
    : undefined
});

export let listMicrosurveys = SlateTool.create(spec, {
  name: 'List Microsurveys',
  key: 'list_microsurveys',
  description: `List all microsurveys in your Chameleon account, or retrieve a specific microsurvey by ID.
Returns microsurvey details including name, status, segment targeting, and response statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      surveyId: z
        .string()
        .optional()
        .describe('Chameleon microsurvey ID to retrieve a specific microsurvey'),
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Number of microsurveys to return (1-500, default 50)'),
      before: z.string().optional().describe('Pagination cursor for older items'),
      after: z.string().optional().describe('Pagination cursor for newer items')
    })
  )
  .output(
    z.object({
      survey: surveySchema.optional().describe('Single microsurvey (when fetching by ID)'),
      surveys: z.array(surveySchema).optional().describe('Array of microsurveys'),
      cursor: z
        .object({
          limit: z.number().optional(),
          before: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    if (ctx.input.surveyId) {
      let result = await client.getSurvey(ctx.input.surveyId);
      let survey = result.survey || result;
      return {
        output: { survey: mapSurvey(survey) },
        message: `Retrieved microsurvey **${survey.name || survey.id}**.`
      };
    }

    let result = await client.listSurveys({
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after
    });

    let surveys = (result.surveys || []).map(mapSurvey);
    return {
      output: { surveys, cursor: result.cursor },
      message: `Returned **${surveys.length}** microsurveys.`
    };
  })
  .build();
