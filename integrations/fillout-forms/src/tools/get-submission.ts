import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { documentContent, filename } from '../lib/documents';
import { submissionSchema } from '../lib/types';
import { httpsUrl } from '../lib/validation';
import { spec } from '../spec';

export let getSubmission = SlateTool.create(spec, {
  name: 'Get Submission',
  key: 'get_submission',
  description: `Retrieve a single submission by its ID, including all question responses, calculations, scheduling details, payment information, and quiz scores. Optionally includes an edit link and downloads generated documents from the exact submission.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('Form ID. Call list_forms to discover forms.'),
      submissionId: z.string().describe('Submission ID. Call list_submissions for this form.'),
      includeEditLink: z
        .boolean()
        .optional()
        .describe('Include an edit link for the submission'),
      downloadDocuments: z
        .boolean()
        .optional()
        .describe(
          'Download generated documents from this exact submission (at most 20 files, 64 MiB total).'
        ),
      documentIds: z
        .array(z.string())
        .max(20)
        .optional()
        .describe(
          'When downloading, select exact document IDs returned by get_submission; omit to download all generated documents.'
        )
    })
  )
  .output(submissionSchema)
  .handleInvocation(async ctx => {
    if (ctx.input.documentIds && !ctx.input.downloadDocuments)
      throw createApiServiceError(
        'Set downloadDocuments to true when selecting documentIds.',
        { parent: {} }
      );
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl || ctx.config.baseUrl
    });

    let result = await client.getSubmission(
      ctx.input.formId,
      ctx.input.submissionId,
      ctx.input.includeEditLink
    );

    let submission = result;
    if (ctx.input.downloadDocuments) {
      const documents = submission.documents ?? [];
      const selected = ctx.input.documentIds;
      if (
        selected &&
        (!selected.length ||
          new Set(selected).size !== selected.length ||
          selected.some(id => !documents.some(doc => doc.id === id)))
      )
        throw createApiServiceError(
          'Select distinct document IDs from this exact submission.',
          { parent: {} }
        );
      const files = documents.filter(doc => !selected || selected.includes(doc.id));
      if (
        !files.length ||
        files.length > 20 ||
        new Set(files.map(doc => doc.id)).size !== files.length
      )
        throw createApiServiceError(
          'No unambiguous document selection is available. Select at most 20 exact IDs from the submission.',
          { parent: {} }
        );
      for (const file of files) httpsUrl(file.url);
      let totalBytes = 0;
      for (const file of files) {
        const downloaded = await documentContent(
          file.url,
          [ctx.auth.token],
          64 * 1024 * 1024 - totalBytes
        );
        totalBytes += downloaded.content.byteLength;
        if (totalBytes > 64 * 1024 * 1024)
          throw createApiServiceError(
            'The selected documents exceed 64 MiB in total. Request fewer documents.',
            { parent: {} }
          );
        await ctx.addAttachment({
          type: 'content',
          content: new Response(new Uint8Array(downloaded.content)),
          mimeType: downloaded.mimeType,
          filename: filename(file.name)
        });
      }
    }

    return {
      output: submission,
      message: `Retrieved submission \`${submission.submissionId}\` submitted at ${submission.submissionTime}.`
    };
  })
  .build();
