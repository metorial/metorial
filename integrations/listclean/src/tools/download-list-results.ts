import { SlateTool } from 'slates';
import { z } from 'zod';
import { LISTCLEAN_BASE_URL } from '../lib/client';
import { verificationListIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let downloadListResults = SlateTool.create(spec, {
  name: 'Download List Results',
  key: 'download_list_results',
  description:
    'Download a CSV file of clean, dirty, or unknown addresses from a completed verification list. Get the list ID from list_verification_lists or verify_email_batch. Download each type separately to retrieve all results.',
  instructions: ['Use get_verification_list to confirm that the list status is COMPLETED.'],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      listId: verificationListIdSchema,
      type: z.enum(['clean', 'dirty', 'unknown']).describe('Result category to download')
    })
  )
  .output(
    z.object({
      listId: z.string(),
      type: z.string(),
      mimeType: z.string().describe('File media type')
    })
  )
  .handleInvocation(async ctx => {
    await ctx.addAttachment({
      type: 'url',
      url: `${LISTCLEAN_BASE_URL}/downloads/${encodeURIComponent(ctx.input.listId)}/${ctx.input.type}`,
      headers: { 'X-Auth-Token': ctx.auth.token },
      mimeType: 'text/csv'
    });
    return {
      output: { listId: ctx.input.listId, type: ctx.input.type, mimeType: 'text/csv' },
      message: `Prepared **${ctx.input.type}** CSV results for list **${ctx.input.listId}**.`
    };
  })
  .build();
