import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReviewUrl = SlateTool.create(spec, {
  name: 'Get Review URL',
  key: 'get_review_url',
  description: `Generate a shareable review URL for a document. This URL allows external users to view and review the document in the Docsumo web interface without needing a Docsumo account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('Unique identifier of the document')
    })
  )
  .output(
    z.object({
      docId: z.string().describe('Document ID'),
      reviewUrl: z.string().describe('Shareable review URL for the document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let reviewUrl = await client.getReviewUrl(ctx.input.docId);

    return {
      output: {
        docId: ctx.input.docId,
        reviewUrl
      },
      message: `Review URL for document **${ctx.input.docId}**: ${reviewUrl}`
    };
  })
  .build();
