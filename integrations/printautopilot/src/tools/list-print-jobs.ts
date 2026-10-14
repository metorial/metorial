import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, decodePdf } from '../lib/client';
import { spec } from '../spec';

export let listPrintJobs = SlateTool.create(spec, {
  name: 'List Print Jobs',
  key: 'list_print_jobs',
  description:
    'Retrieves documents queued for the connected print app, grouped by printer and paper size. Includes document IDs for recording print results with finish_documents and downloadable PDF files.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      printJobs: z
        .array(z.any())
        .describe(
          'Queued print-job groups, including printer, paper size, and document metadata. Documents with invalid PDF content include a pdfError while retaining their IDs.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    ctx.progress('Fetching print jobs...');

    let printJobs = await client.getPrintJobs();
    let jobMetadata: unknown[] = [];
    for (let job of printJobs) {
      if (!isApiErrorRecord(job) || !Array.isArray(job.documents)) {
        jobMetadata.push(job);
        continue;
      }
      let documents: unknown[] = [];
      for (let document of job.documents) {
        if (!isApiErrorRecord(document)) {
          documents.push(document);
          continue;
        }
        let { base64 } = document;
        if (typeof base64 !== 'string' || !base64) {
          documents.push({
            ...document,
            pdfError: 'The queued document has no valid base64-encoded PDF content.'
          });
          continue;
        }
        let content: Buffer;
        try {
          content = decodePdf(base64).content;
        } catch (error) {
          documents.push({
            ...document,
            pdfError:
              error instanceof Error ? error.message : 'The queued PDF content is invalid.'
          });
          continue;
        }
        await ctx.addAttachment({
          type: 'content',
          content: new Response(new Uint8Array(content), {
            headers: { 'content-type': 'application/pdf' }
          }),
          filename:
            typeof document.file_name === 'string' && document.file_name
              ? document.file_name
              : `document-${document.id ?? 'queued'}.pdf`
        });
        documents.push(document);
      }
      jobMetadata.push({ ...job, documents });
    }

    return {
      output: {
        printJobs: jobMetadata
      },
      message: `Retrieved **${printJobs.length}** print job(s).`
    };
  })
  .build();
