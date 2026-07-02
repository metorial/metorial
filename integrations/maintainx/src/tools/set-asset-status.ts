import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let setAssetStatus = SlateTool.create(spec, {
  name: 'Set Asset Status',
  key: 'set_asset_status',
  description: `Sets the operational status of an asset in MaintainX (Online, Offline, or Ignore). Can record planned or unplanned downtime with start/end times and descriptions.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      assetId: z.number().describe('ID of the asset'),
      status: z.enum(['ONLINE', 'OFFLINE', 'IGNORE']).describe('New operational status'),
      customStatusId: z
        .number()
        .optional()
        .describe('Custom status ID if using custom statuses'),
      downtimeType: z
        .enum(['PLANNED', 'UNPLANNED'])
        .optional()
        .describe('Type of downtime (for OFFLINE status)'),
      startedAt: z.string().optional().describe('Downtime start time in ISO 8601 format'),
      endedAt: z.string().optional().describe('Downtime end time in ISO 8601 format'),
      description: z
        .string()
        .optional()
        .describe('Description of the status change or downtime reason')
    })
  )
  .output(
    z.object({
      assetId: z.number().describe('Asset ID'),
      status: z.string().describe('New status'),
      statusRecordId: z.number().optional().describe('ID of the status record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createAssetStatus(ctx.input.assetId, {
      status: ctx.input.status,
      customStatusId: ctx.input.customStatusId,
      downtimeType: ctx.input.downtimeType,
      startedAt: ctx.input.startedAt,
      endedAt: ctx.input.endedAt,
      description: ctx.input.description
    });

    let record = result.assetStatus ?? result;

    return {
      output: {
        assetId: ctx.input.assetId,
        status: ctx.input.status,
        statusRecordId: record.id
      },
      message: `Set asset **#${ctx.input.assetId}** status to **${ctx.input.status}**${ctx.input.downtimeType ? ` (${ctx.input.downtimeType} downtime)` : ''}.`
    };
  })
  .build();
