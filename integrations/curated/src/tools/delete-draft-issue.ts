import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDraftIssue = SlateTool.create(spec, {
  name: 'Delete Draft Issue',
  key: 'delete_draft_issue',
  description: `Delete a draft newsletter issue. Only draft issues can be deleted; published issues cannot be removed via the API.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      publicationId: z.string().describe('ID of the publication'),
      issueId: z.string().describe('Database ID of the draft issue to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the draft issue was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteDraftIssue(ctx.input.publicationId, ctx.input.issueId);

    return {
      output: { deleted: true },
      message: `Deleted draft issue with ID **${ctx.input.issueId}**.`
    };
  })
  .build();
