import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let listExtractionRuns = SlateTool.create(spec, {
  name: 'List AI Extraction Runs',
  key: 'list_extraction_runs',
  description: `List document intelligence (AI extraction) runs for a configured extraction. Returns extracted data points, approval status, and metadata. Extractions must be pre-configured in the Feathery dashboard.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      extractionId: z.string().describe('ID of the extraction configuration'),
      startTime: z.string().optional().describe('Filter runs after this datetime (ISO 8601)'),
      endTime: z.string().optional().describe('Filter runs before this datetime (ISO 8601)'),
      userId: z.string().optional().describe('Filter runs by user ID')
    })
  )
  .output(
    z.object({
      runs: z
        .array(
          z.object({
            runId: z.string().describe('Unique run identifier'),
            userId: z.string().optional().describe('Associated user ID'),
            fileName: z.string().optional().describe('Name of the processed file'),
            success: z.boolean().optional().describe('Whether the extraction succeeded'),
            approved: z
              .boolean()
              .optional()
              .describe('Whether the results have been approved'),
            approverEmail: z.string().optional().describe('Email of the approver'),
            extractedFields: z
              .array(z.any())
              .optional()
              .describe('Array of extracted data points'),
            createdAt: z.string().optional().describe('When the run was created'),
            updatedAt: z.string().optional().describe('When the run was last updated')
          })
        )
        .describe('List of extraction runs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listExtractionRuns(ctx.input.extractionId, {
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      userId: ctx.input.userId
    });

    let runs = Array.isArray(result) ? result : result.results || result.data || [];

    let mapped = runs.map((r: any) => ({
      runId: r.id,
      userId: r.user_id,
      fileName: r.file_name,
      success: r.success,
      approved: r.approved,
      approverEmail: r.approver,
      extractedFields: r.data,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return {
      output: { runs: mapped },
      message: `Found **${mapped.length}** extraction run(s) for extraction **${ctx.input.extractionId}**.`
    };
  })
  .build();
