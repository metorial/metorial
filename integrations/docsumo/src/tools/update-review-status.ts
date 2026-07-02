import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateReviewStatus = SlateTool.create(spec, {
  name: 'Update Review Status',
  key: 'update_review_status',
  description: `Change the review status of a document. Available actions:
- **review**: Start reviewing the document (sets status to "reviewing")
- **skip**: Skip the review process (sets status to "review_skipped")
- **finish**: Complete the review and mark as processed (sets status to "processed")`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('Unique identifier of the document'),
      action: z
        .enum(['review', 'skip', 'finish'])
        .describe(
          'Review action to perform: "review" to start, "skip" to skip, "finish" to complete'
        )
    })
  )
  .output(
    z.object({
      docId: z.string().describe('Document ID that was updated'),
      action: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.updateReviewStatus(ctx.input.docId, ctx.input.action);

    let actionLabels: Record<string, string> = {
      review: 'started review',
      skip: 'skipped review',
      finish: 'finished review (processed)'
    };

    return {
      output: {
        docId: ctx.input.docId,
        action: ctx.input.action
      },
      message: `Document **${ctx.input.docId}** — ${actionLabels[ctx.input.action]}.`
    };
  })
  .build();
