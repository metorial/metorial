import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let listSurveyHistory = SlateTool.create(spec, {
  name: 'List Survey History',
  key: 'list_survey_history',
  description:
    'Retrieve a paginated change log for a Refiner survey. Each version includes its UUID, action, timestamp, and full survey configuration and question snapshot. Call list_surveys to discover survey UUIDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      surveyUuid: z
        .string()
        .min(1)
        .describe('Survey UUID. Call list_surveys to discover survey UUIDs.'),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1'),
      pageLength: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of versions per page (default 100, maximum 1000)')
    })
  )
  .output(
    z.object({
      surveyUuid: z.string().describe('UUID of the survey'),
      versions: z.array(
        z.object({
          versionUuid: z.string().describe('UUID of this survey version'),
          action: z.string().describe('Action that produced this version'),
          createdAt: z.string().describe('Timestamp of the change'),
          snapshot: z
            .record(z.string(), z.unknown())
            .describe('Survey configuration, questions, and other metadata at this version')
        })
      ),
      pagination: z.object({
        itemsCount: z.number(),
        currentPage: z.number(),
        lastPage: z.number(),
        pageLength: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let result = await new RefinerClient({ token: ctx.auth.token }).listFormHistory(
      ctx.input.surveyUuid,
      {
        page: ctx.input.page,
        pageLength: ctx.input.pageLength
      }
    );
    return {
      output: {
        surveyUuid: ctx.input.surveyUuid,
        versions: result.items.map(item => ({
          versionUuid: item.uuid,
          action: item.action,
          createdAt: item.created_at,
          snapshot: item.snapshot
        })),
        pagination: {
          itemsCount: result.pagination.items_count,
          currentPage: result.pagination.current_page,
          lastPage: result.pagination.last_page,
          pageLength: result.pagination.page_length
        }
      },
      message: `Retrieved **${result.items.length}** survey versions (page ${result.pagination.current_page} of ${result.pagination.last_page}).`
    };
  })
  .build();
