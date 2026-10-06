import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, invalid, pageInput } from '../lib/response';
import { spec } from '../spec';

let byteLimit = 32 * 1024 * 1024;
let cell = (value: string) =>
  `"${(/^[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
export let exportResponses = SlateTool.create(spec, {
  key: 'export_responses',
  name: 'Export Survey Responses',
  description:
    'Generate a downloadable JSON or CSV file locally from native response details. This is a bounded read, not a provider export job. CSV contains one row per response with native answer pages encoded as JSON. Files and survey design are not downloaded.',
  instructions: [
    'At most 100 pages, 10000 responses, and 32 MiB per file. A capped result is incomplete and reports the next page.',
    'Response access depends on granted scopes and plan; Basic accounts currently allow up to 25 response details per survey.',
    'Paging is not a snapshot: responses may change between requests. CSV guards cells against spreadsheet formulas.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      surveyId: id.describe('Survey ID from list_surveys.'),
      format: z.enum(['json', 'csv']).default('json'),
      startPage: pageInput,
      maxPages: z.number().int().min(1).max(100).default(10),
      status: z.enum(['completed', 'partial', 'overquota', 'disqualified']).optional(),
      simple: z.boolean().optional(),
      collectorIds: z.array(id).optional()
    })
  )
  .output(
    z.object({
      surveyId: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      responseCount: z.number(),
      pagesRead: z.number(),
      total: z.number(),
      complete: z.boolean(),
      truncated: z.boolean(),
      nextPage: z.number().optional(),
      byteLength: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let rows: Record<string, unknown>[] = [];
    let page = ctx.input.startPage ?? 1;
    let total = 0;
    let pagesRead = 0;
    let nextPage: number | undefined;
    let size = 0;
    for (let index = 0; index < ctx.input.maxPages; index++) {
      let result = await client.getResponsesBulk(ctx.input.surveyId, {
        page,
        perPage: 100,
        status: ctx.input.status,
        simple: ctx.input.simple,
        collectorIds: ctx.input.collectorIds
      });
      for (let response of result.data) {
        if (response.survey_id !== undefined && response.survey_id !== ctx.input.surveyId)
          throw invalid('A response belongs to a different survey; export stopped.');
        let value = { ...response };
        // Expiring delivery URLs are metadata, not file content, and are omitted from generated exports.
        let serialized = JSON.stringify(value, (key, item) =>
          ['download_url', 'human_download_url'].includes(key) ? undefined : item
        );
        size += Buffer.byteLength(serialized);
        if (size > byteLimit)
          throw invalid(
            'Response content exceeds the 32 MiB file limit. Retry with fewer pages or a narrower filter.'
          );
        rows.push(JSON.parse(serialized));
      }
      total = result.total;
      pagesRead++;
      nextPage = result.nextPage;
      if (nextPage === undefined) break;
      page = nextPage;
    }
    let complete = nextPage === undefined && (ctx.input.startPage ?? 1) === 1;
    let text =
      ctx.input.format === 'json'
        ? JSON.stringify(
            { surveyId: ctx.input.surveyId, complete, total, nextPage, responses: rows },
            null,
            2
          )
        : 'responseId,status,dateCreated,dateModified,collectorId,pagesJson\r\n' +
          rows
            .map(row =>
              [
                row.id,
                row.response_status,
                row.date_created,
                row.date_modified,
                row.collector_id,
                JSON.stringify(row.pages ?? [])
              ]
                .map(value => cell(value === undefined || value === null ? '' : String(value)))
                .join(',')
            )
            .join('\r\n');
    let content = Buffer.from(text);
    if (content.byteLength > byteLimit)
      throw invalid(
        'Generated file exceeds 32 MiB. Retry with fewer pages or a narrower filter.'
      );
    let mimeType = ctx.input.format === 'json' ? 'application/json' : 'text/csv';
    let filename = `survey-${ctx.input.surveyId}-responses.${ctx.input.format}`;
    await ctx.addAttachment({ type: 'content', content, filename, mimeType });
    return {
      output: {
        surveyId: ctx.input.surveyId,
        filename,
        mimeType,
        responseCount: rows.length,
        pagesRead,
        total,
        complete,
        truncated: nextPage !== undefined,
        nextPage,
        byteLength: content.byteLength
      },
      message: `Generated ${filename} with ${rows.length} responses.${complete ? '' : ' This file is incomplete; use the reported next page with the same filters, or start at page 1 for a complete traversal.'}`
    };
  })
  .build();
