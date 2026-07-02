import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getResponses = SlateTool.create(spec, {
  name: 'Get Responses',
  key: 'get_responses',
  description: `Retrieve survey responses with full answer details. Returns expanded responses including all page, question, and answer data. Supports filtering by date range, status, and collector. Use **simple** mode to include human-readable question/answer text alongside IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      surveyId: z.string().describe('ID of the survey'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      status: z
        .enum(['completed', 'partial', 'overquota', 'disqualified'])
        .optional()
        .describe('Filter by response status'),
      startCreatedAt: z
        .string()
        .optional()
        .describe('Filter responses created after this date (YYYY-MM-DDTHH:MM:SS)'),
      endCreatedAt: z
        .string()
        .optional()
        .describe('Filter responses created before this date (YYYY-MM-DDTHH:MM:SS)'),
      startModifiedAt: z
        .string()
        .optional()
        .describe('Filter responses modified after this date'),
      endModifiedAt: z
        .string()
        .optional()
        .describe('Filter responses modified before this date'),
      sortBy: z.enum(['date_modified']).optional().describe('Sort field'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      simple: z
        .boolean()
        .optional()
        .describe('If true, includes question/answer text alongside IDs for easier reading'),
      collectorIds: z.array(z.string()).optional().describe('Filter by specific collector IDs')
    })
  )
  .output(
    z.object({
      responses: z.array(
        z.object({
          responseId: z.string(),
          status: z.string().optional(),
          dateCreated: z.string().optional(),
          dateModified: z.string().optional(),
          collectorId: z.string().optional(),
          totalTime: z.number().optional(),
          ipAddress: z.string().optional(),
          pages: z.array(z.any()).optional()
        })
      ),
      page: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let result = await client.getResponsesBulk(ctx.input.surveyId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      status: ctx.input.status,
      startCreatedAt: ctx.input.startCreatedAt,
      endCreatedAt: ctx.input.endCreatedAt,
      startModifiedAt: ctx.input.startModifiedAt,
      endModifiedAt: ctx.input.endModifiedAt,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      simple: ctx.input.simple,
      collectorIds: ctx.input.collectorIds
    });

    let responses = (result.data || []).map((r: any) => ({
      responseId: r.id,
      status: r.response_status,
      dateCreated: r.date_created,
      dateModified: r.date_modified,
      collectorId: r.collector_id,
      totalTime: r.total_time,
      ipAddress: r.ip_address,
      pages: r.pages
    }));

    return {
      output: {
        responses,
        page: result.page || 1,
        total: result.total || responses.length
      },
      message: `Retrieved **${responses.length}** responses (${result.total || responses.length} total) for survey \`${ctx.input.surveyId}\`.`
    };
  })
  .build();

export let getResponse = SlateTool.create(spec, {
  name: 'Get Response',
  key: 'get_response',
  description: `Retrieve a single survey response with full details including all answers, timestamps, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      surveyId: z.string().describe('ID of the survey'),
      responseId: z.string().describe('ID of the specific response to retrieve')
    })
  )
  .output(
    z.object({
      responseId: z.string(),
      status: z.string().optional(),
      dateCreated: z.string().optional(),
      dateModified: z.string().optional(),
      collectorId: z.string().optional(),
      totalTime: z.number().optional(),
      ipAddress: z.string().optional(),
      editUrl: z.string().optional(),
      analyzeUrl: z.string().optional(),
      customVariables: z.record(z.string(), z.string()).optional(),
      pages: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let r = await client.getResponse(ctx.input.surveyId, ctx.input.responseId);

    return {
      output: {
        responseId: r.id,
        status: r.response_status,
        dateCreated: r.date_created,
        dateModified: r.date_modified,
        collectorId: r.collector_id,
        totalTime: r.total_time,
        ipAddress: r.ip_address,
        editUrl: r.edit_url,
        analyzeUrl: r.analyze_url,
        customVariables: r.custom_variables,
        pages: r.pages
      },
      message: `Retrieved response \`${r.id}\` — status: **${r.response_status}**, total time: ${r.total_time || 0}s.`
    };
  })
  .build();
