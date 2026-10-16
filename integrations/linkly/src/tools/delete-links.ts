import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLinks = SlateTool.create(spec, {
  name: 'Delete Links',
  key: 'delete_links',
  description: `Deletes one or more shortened links by their IDs. Deleted links stop redirecting.`,
  constraints: ['Links stop redirecting immediately after deletion.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      linkIds: z.array(z.number()).min(1).describe('Array of link IDs to delete')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of links deleted'),
      deletedLinkIds: z.array(z.number()).describe('IDs of deleted links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let linkIds = [...new Set(ctx.input.linkIds)];
    if (linkIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
      throw createApiServiceError('linkIds must contain positive integer link IDs.');
    }
    let deletedLinkIds: number[] = [];
    for (let [index, linkId] of linkIds.entries()) {
      try {
        await client.deleteLink(linkId);
        deletedLinkIds.push(linkId);
      } catch (error) {
        let failure = buildApiServiceError(error, {
          providerLabel: 'Linkly',
          reason: 'linkly_api_error',
          operation: 'delete link'
        });
        let unattemptedLinkIds = linkIds.slice(index + 1);
        failure.data.deletedCount = deletedLinkIds.length;
        failure.data.deletedLinkIds = [...deletedLinkIds];
        failure.data.failedLinkId = linkId;
        failure.data.unattemptedLinkIds = unattemptedLinkIds;
        failure.data.failedLinkOutcome = 'unconfirmed';
        failure.data.message += ` Confirmed deleted IDs: ${deletedLinkIds.join(', ') || 'none'}. Failed request for link ID: ${linkId}. Unattempted IDs: ${unattemptedLinkIds.join(', ') || 'none'}. Verify the failed link before retrying; exclude confirmed deleted IDs.`;
        failure.message = failure.data.message;
        throw failure;
      }
    }

    return {
      output: {
        deletedCount: linkIds.length,
        deletedLinkIds: linkIds
      },
      message: `Deleted **${linkIds.length}** link(s): ${linkIds.join(', ')}`
    };
  })
  .build();
