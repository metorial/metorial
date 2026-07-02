import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getBulkJob = SlateTool.create(spec, {
  name: 'Get Bulk Job',
  key: 'get_bulk_job',
  description: `Get the status and details of a bulk sending job, including document completion counts and the resulting documents. Optionally retrieve the blank CSV template for a given template.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      bulkJobId: z.string().optional().describe('ID of the bulk job to retrieve status for'),
      templateHash: z
        .string()
        .optional()
        .describe('Template hash to get blank CSV headers from (alternative to bulkJobId)'),
      includeDocuments: z
        .boolean()
        .optional()
        .describe('Include resulting documents in the response'),
      documentLimit: z
        .number()
        .optional()
        .describe('Max number of documents to include (default 100)'),
      documentOffset: z.number().optional().describe('Offset for document pagination')
    })
  )
  .output(
    z.object({
      bulkJobId: z.string().optional().describe('Bulk job ID'),
      status: z.string().optional().describe('Job status'),
      documentCount: z.number().optional().describe('Total document count'),
      completedDocuments: z.number().optional().describe('Number of completed documents'),
      cancelledDocuments: z.number().optional().describe('Number of cancelled documents'),
      inProgressDocuments: z.number().optional().describe('Number of in-progress documents'),
      createdAt: z.string().optional().describe('Job creation timestamp'),
      csvTemplate: z
        .string()
        .optional()
        .describe('Blank CSV template headers for the specified template'),
      documents: z
        .array(
          z.object({
            documentHash: z.string().describe('Document hash'),
            title: z.string().optional().describe('Document title'),
            isCompleted: z.boolean().describe('Whether the document is completed')
          })
        )
        .optional()
        .describe('Resulting documents from the bulk job')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let output: Record<string, any> = {};

    if (ctx.input.templateHash) {
      let csv = await client.getBulkCsvTemplate(ctx.input.templateHash);
      output.csvTemplate = csv;
    }

    if (ctx.input.bulkJobId) {
      let status = await client.getBulkJobStatus(ctx.input.bulkJobId);
      output.bulkJobId = ctx.input.bulkJobId;
      output.status = status.status || undefined;
      output.documentCount = status.document_count ?? undefined;
      output.completedDocuments = status.completed_documents ?? undefined;
      output.cancelledDocuments = status.cancelled_documents ?? undefined;
      output.inProgressDocuments = status.in_progress_documents ?? undefined;
      output.createdAt = status.bulk_job_created_at ?? undefined;

      if (ctx.input.includeDocuments) {
        let docsResult = await client.getBulkJobDocuments(
          ctx.input.bulkJobId,
          ctx.input.documentLimit,
          ctx.input.documentOffset
        );
        let docs = docsResult.data || docsResult || [];
        output.documents = (Array.isArray(docs) ? docs : []).map((d: any) => ({
          documentHash: d.document_hash,
          title: d.title || undefined,
          isCompleted: d.is_completed === 1 || d.is_completed === true
        }));
      }
    }

    let message = ctx.input.bulkJobId
      ? `Bulk job "${ctx.input.bulkJobId}" — ${output.completedDocuments ?? 0}/${output.documentCount ?? 0} completed.`
      : `Retrieved CSV template for template "${ctx.input.templateHash}".`;

    return { output: output as any, message };
  })
  .build();
