import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearoutClient } from '../lib/client';
import { spec } from '../spec';

export let manageBulkVerification = SlateTool.create(spec, {
  name: 'Manage Bulk Verification',
  key: 'manage_bulk_verification',
  description: `Manage bulk email verification lists. Supports checking progress of a running verification, downloading completed results, cancelling an in-progress verification, or removing a completed list.
Use **checkProgress** to poll for completion status and percentage. Use **downloadResult** to get a download URL once processing completes. Use **cancel** to stop a running verification. Use **remove** to permanently delete a list.`,
  instructions: [
    'Use "checkProgress" regularly to monitor bulk verification jobs until they complete.',
    'Only use "downloadResult" after the list reaches completed status.',
    'Cancelling a list charges credits for already-verified emails; unverified emails are marked as Unknown.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['checkProgress', 'downloadResult', 'cancel', 'remove'])
        .describe('Action to perform on the bulk verification list'),
      listId: z.string().describe('ID of the bulk verification list')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('API response status'),
      progressStatus: z
        .string()
        .optional()
        .describe('Current progress status of the list (e.g., running, completed)'),
      percentage: z.number().optional().describe('Completion percentage (0-100)'),
      downloadUrl: z.string().optional().describe('Signed URL to download results'),
      listId: z.string().optional().describe('List ID'),
      rawResponse: z.record(z.string(), z.unknown()).optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearoutClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result: Record<string, unknown>;
    let message: string;

    switch (ctx.input.action) {
      case 'checkProgress': {
        result = await client.bulkVerifyProgress(ctx.input.listId);
        let data = (result.data ?? result) as Record<string, unknown>;
        let progressStatus = String(data.progress_status ?? 'unknown');
        let percentage = data.percentage as number | undefined;
        message = `Bulk verification list **${ctx.input.listId}** — Status: **${progressStatus}**${percentage !== undefined ? `, Progress: **${percentage}%**` : ''}`;
        return {
          output: {
            status: result.status as string | undefined,
            progressStatus,
            percentage,
            listId: ctx.input.listId,
            rawResponse: result
          },
          message
        };
      }
      case 'downloadResult': {
        result = await client.downloadResult(ctx.input.listId);
        let data = (result.data ?? result) as Record<string, unknown>;
        let downloadUrl = data.url as string | undefined;
        message = downloadUrl
          ? `Download ready for list **${ctx.input.listId}**.`
          : `Download result requested for list **${ctx.input.listId}**.`;
        return {
          output: {
            status: result.status as string | undefined,
            downloadUrl,
            listId: ctx.input.listId,
            rawResponse: result
          },
          message
        };
      }
      case 'cancel': {
        result = await client.cancelVerifyList(ctx.input.listId);
        message = `Cancellation requested for list **${ctx.input.listId}**. May take up to 15 minutes.`;
        return {
          output: {
            status: result.status as string | undefined,
            listId: ctx.input.listId,
            rawResponse: result
          },
          message
        };
      }
      case 'remove': {
        result = await client.removeVerifyList(ctx.input.listId);
        message = `List **${ctx.input.listId}** has been removed.`;
        return {
          output: {
            status: result.status as string | undefined,
            listId: ctx.input.listId,
            rawResponse: result
          },
          message
        };
      }
    }
  })
  .build();
