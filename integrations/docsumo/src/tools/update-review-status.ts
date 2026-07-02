import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { docsumoServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateReviewStatus = SlateTool.create(spec, {
  name: 'Update Review Status',
  key: 'update_review_status',
  description: `Change the review status of a document. Available actions:
- **start**: Start reviewing the document
- **skip**: Skip the review process
- **end**: Complete the review and mark the document as processed`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('Unique identifier of the document'),
      action: z
        .enum(['start', 'skip', 'end'])
        .describe(
          'Review action to perform: "start" to begin review, "skip" to skip review, "end" to complete review'
        ),
      forced: z
        .boolean()
        .optional()
        .describe('Force the status change even if the document has validation errors'),
      strict: z
        .boolean()
        .optional()
        .describe('When action is "end", fail if validation errors remain in document fields')
    })
  )
  .output(
    z.object({
      docId: z.string().describe('Document ID that was updated'),
      action: z.string().describe('Action that was performed'),
      status: z.string().describe('Docsumo response status'),
      statusCode: z.number().describe('Docsumo response status code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.strict !== undefined && ctx.input.action !== 'end') {
      throw docsumoServiceError('strict can only be used when action is "end".');
    }

    let result = await client.updateReviewStatus({
      docId: ctx.input.docId,
      action: ctx.input.action,
      forced: ctx.input.forced,
      strict: ctx.input.strict
    });

    let actionLabels: Record<string, string> = {
      start: 'started review',
      skip: 'skipped review',
      end: 'finished review'
    };

    return {
      output: {
        docId: ctx.input.docId,
        action: ctx.input.action,
        status: result.status,
        statusCode: result.statusCode
      },
      message: `Document **${ctx.input.docId}** — ${actionLabels[ctx.input.action]}.`
    };
  })
  .build();
