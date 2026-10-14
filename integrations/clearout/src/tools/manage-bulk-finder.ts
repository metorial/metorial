import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ClearoutClient } from '../lib/client';
import { spec } from '../spec';

export let manageBulkFinder = SlateTool.create(spec, {
  name: 'Manage Bulk Finder',
  key: 'manage_bulk_finder',
  description: `Manage bulk email finder lists. Supports checking progress, downloading results, cancelling a running job, or permanently removing a list.
Use start_bulk_finder to upload a CSV first. Use **checkProgress** to poll for completion status and percentage. Use **downloadResult** to download results once processing completes.`,
  instructions: [
    'Use "checkProgress" regularly to monitor bulk finder jobs until they complete.',
    'Only use "downloadResult" after the list reaches completed status.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['checkProgress', 'downloadResult', 'cancel', 'remove'])
        .describe('Action to perform on the bulk finder list'),
      listId: z.string().describe('ID returned by start_bulk_finder'),
      ignoreResult: z
        .boolean()
        .optional()
        .describe(
          'For remove only: allow deletion while a result download is in progress (default false).'
        )
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('API response status'),
      progressStatus: z
        .string()
        .optional()
        .describe('Current progress status (e.g., running, completed)'),
      percentage: z.number().optional().describe('Completion percentage (0-100)'),
      downloadUrl: z.string().optional().describe('Signed URL to download results'),
      confidenceLevel: z
        .string()
        .optional()
        .describe('Confidence level of the finder results'),
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
        result = await client.bulkFinderProgress(ctx.input.listId);
        let data = (result.data ?? result) as Record<string, unknown>;
        let progressStatus = String(data.progress_status ?? 'unknown');
        let percentage = data.percentage as number | undefined;
        message = `Bulk finder list **${ctx.input.listId}** — Status: **${progressStatus}**${percentage !== undefined ? `, Progress: **${percentage}%**` : ''}`;
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
        result = await client.downloadFinderResult(ctx.input.listId);
        let data = (result.data ?? result) as Record<string, unknown>;
        let downloadUrl = data.url as string | undefined;
        let confidenceLevel = data.confidence_level as string | undefined;
        if (!downloadUrl)
          throw createApiServiceError(
            'Clearout did not return a download URL. Check progress and request results again after completion.'
          );
        await ctx.addAttachment({ type: 'url', url: downloadUrl, mimeType: 'text/csv' });
        message = `Download ready for finder list **${ctx.input.listId}**${confidenceLevel ? ` (confidence: ${confidenceLevel})` : ''}.`;
        return {
          output: {
            status: result.status as string | undefined,
            downloadUrl,
            confidenceLevel,
            listId: ctx.input.listId,
            rawResponse: result
          },
          message
        };
      }
      case 'cancel':
      case 'remove': {
        result =
          ctx.input.action === 'cancel'
            ? await client.cancelFinderList(ctx.input.listId)
            : await client.removeFinderList(ctx.input.listId, ctx.input.ignoreResult);
        return {
          output: {
            status: result.status as string | undefined,
            listId: ctx.input.listId,
            rawResponse: result
          },
          message:
            ctx.input.action === 'cancel'
              ? `Cancellation requested for finder list **${ctx.input.listId}**.`
              : `Finder list **${ctx.input.listId}** has been removed.`
        };
      }
    }
  })
  .build();
