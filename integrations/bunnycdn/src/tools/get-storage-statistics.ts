import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoreClient } from '../lib/client';
import { spec } from '../spec';

export let getStorageStatistics = SlateTool.create(spec, {
  name: 'Get Storage Statistics',
  key: 'get_storage_statistics',
  description:
    'Retrieve storage usage and file count charts for an Edge Storage zone. By default, returns statistics for the last 30 days.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      storageZoneId: z.number().int().positive().describe('Storage zone ID'),
      dateFrom: z.string().optional().describe('Start date in ISO 8601 format'),
      dateTo: z.string().optional().describe('End date in ISO 8601 format')
    })
  )
  .output(
    z.object({
      storageUsedChart: z
        .record(z.string(), z.number())
        .optional()
        .describe('Storage used in bytes by date'),
      fileCountChart: z
        .record(z.string(), z.number())
        .optional()
        .describe('File count by date')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new CoreClient({ token: ctx.auth.token }).getStorageStatistics(
      ctx.input.storageZoneId,
      {
        dateFrom: ctx.input.dateFrom,
        dateTo: ctx.input.dateTo
      }
    );
    return {
      output: {
        storageUsedChart: result.StorageUsedChart ?? undefined,
        fileCountChart: result.FileCountChart ?? undefined
      },
      message: `Retrieved storage statistics for zone **${ctx.input.storageZoneId}**.`
    };
  })
  .build();
