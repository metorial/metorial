import { SlateTool } from 'slates';
import { z } from 'zod';
import { MopinionClient } from '../lib/client';
import { spec } from '../spec';

export let getFeedback = SlateTool.create(spec, {
  name: 'Get Feedback',
  key: 'get_feedback',
  description: `Retrieve feedback entries from a Mopinion report or dataset. Supports filtering by date, rating, NPS, CES, GCR, and tags. Supports pagination with page and limit parameters.`,
  instructions: [
    'Provide either a reportId or datasetId to fetch feedback from.',
    'Filter values use Mopinion filter syntax - e.g., for NPS use values like ">8" for promoters.',
    'Maximum limit is 100 results per request. Use page parameter for pagination.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportId: z.number().optional().describe('Report ID to retrieve feedback from'),
      datasetId: z.number().optional().describe('Dataset ID to retrieve feedback from'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      limit: z.number().optional().describe('Maximum number of results per page (max 100)'),
      filterDate: z.string().optional().describe('Filter by date (e.g., "2024-01-01")'),
      filterRating: z.string().optional().describe('Filter by numeric rating'),
      filterNps: z.string().optional().describe('Filter by NPS score (0-10)'),
      filterCes: z.string().optional().describe('Filter by CES score (1-5)'),
      filterCesInverse: z.string().optional().describe('Filter by inverse CES score'),
      filterGcr: z.string().optional().describe('Filter by GCR (no, partly, yes)'),
      filterTags: z.string().optional().describe('Filter by tags')
    })
  )
  .output(
    z.object({
      feedbackEntries: z
        .array(
          z.object({
            feedbackId: z.number().describe('Unique feedback entry ID'),
            created: z.string().describe('Timestamp when feedback was submitted'),
            datasetId: z.number().optional().describe('Dataset ID this feedback belongs to'),
            reportId: z.number().optional().describe('Report ID this feedback belongs to'),
            tags: z.array(z.string()).optional().describe('Tags assigned to this feedback'),
            fields: z
              .array(
                z.object({
                  key: z.string().describe('Field key/identifier'),
                  label: z.string().describe('Field label/question'),
                  value: z.any().describe('Field value/answer')
                })
              )
              .optional()
              .describe('Feedback field values')
          })
        )
        .describe('List of feedback entries'),
      totalCount: z.number().optional().describe('Total number of matching feedback entries'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MopinionClient({
      publicKey: ctx.auth.publicKey,
      signatureToken: ctx.auth.signatureToken
    });

    if (!ctx.input.reportId && !ctx.input.datasetId) {
      throw new Error('Either reportId or datasetId must be provided');
    }

    let pagination = {
      page: ctx.input.page,
      limit: ctx.input.limit
    };

    let filters = {
      date: ctx.input.filterDate,
      rating: ctx.input.filterRating,
      nps: ctx.input.filterNps,
      ces: ctx.input.filterCes,
      cesInverse: ctx.input.filterCesInverse,
      gcr: ctx.input.filterGcr,
      tags: ctx.input.filterTags
    };

    let result: any;

    if (ctx.input.reportId) {
      result = await client.getReportFeedback(ctx.input.reportId, pagination, filters);
    } else {
      result = await client.getDatasetFeedback(ctx.input.datasetId!, pagination, filters);
    }

    let entries = Array.isArray(result) ? result : result.data || [];
    let meta = result._meta || {};

    let feedbackEntries = entries.map((entry: any) => ({
      feedbackId: entry.id,
      created: entry.created || '',
      datasetId: entry.datasetId ?? entry.dataset_id,
      reportId: entry.reportId ?? entry.report_id,
      tags: entry.tags || [],
      fields: (entry.fields || []).map((f: any) => ({
        key: f.key || '',
        label: f.label || '',
        value: f.value
      }))
    }));

    return {
      output: {
        feedbackEntries,
        totalCount: meta.total,
        hasMore: meta.hasMore ?? meta.has_more
      },
      message: `Retrieved **${feedbackEntries.length}** feedback entries${meta.total ? ` out of ${meta.total} total` : ''}.`
    };
  })
  .build();
