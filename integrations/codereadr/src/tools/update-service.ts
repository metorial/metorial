import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateService = SlateTool.create(spec, {
  name: 'Update Service',
  key: 'update_service',
  description: `Update an existing scanning service's configuration. Only provided fields will be updated; omitted fields remain unchanged. Supports changing name, validation method, postback settings, scheduling, and duplicate handling.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service to update'),
      name: z.string().optional().describe('New name for the service'),
      description: z.string().optional().describe('New description or URL'),
      validationMethod: z
        .enum([
          'record',
          'ondevicerecord',
          'database',
          'ondevicedatabase',
          'postback',
          'webview'
        ])
        .optional()
        .describe('New validation method'),
      databaseId: z.string().optional().describe('Database ID for database-type validation'),
      postbackUrl: z.string().optional().describe('URL to receive scan data'),
      duplicateValue: z.string().optional().describe('Duplicate scan handling'),
      deviceDuplicateValue: z.string().optional().describe('Device-level duplicate handling'),
      periodStartDate: z
        .string()
        .optional()
        .describe('Service activation start date (YYYY-MM-DD)'),
      periodStartTime: z
        .string()
        .optional()
        .describe('Service activation start time (HH:mm:ss)'),
      periodEndDate: z
        .string()
        .optional()
        .describe('Service deactivation end date (YYYY-MM-DD)'),
      periodEndTime: z
        .string()
        .optional()
        .describe('Service deactivation end time (HH:mm:ss)'),
      uploadEmail: z.string().optional().describe('Email address for scan delivery'),
      postbackReceiverOnly: z.string().optional().describe('Set to "1" for receiver-only mode')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('ID of the updated service')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.updateService(ctx.input.serviceId, {
      name: ctx.input.name,
      description: ctx.input.description,
      validationMethod: ctx.input.validationMethod,
      databaseId: ctx.input.databaseId,
      postbackUrl: ctx.input.postbackUrl,
      duplicateValue: ctx.input.duplicateValue,
      deviceDuplicateValue: ctx.input.deviceDuplicateValue,
      periodStartDate: ctx.input.periodStartDate,
      periodStartTime: ctx.input.periodStartTime,
      periodEndDate: ctx.input.periodEndDate,
      periodEndTime: ctx.input.periodEndTime,
      uploadEmail: ctx.input.uploadEmail,
      postbackReceiverOnly: ctx.input.postbackReceiverOnly
    });

    return {
      output: { serviceId: ctx.input.serviceId },
      message: `Updated service **${ctx.input.serviceId}** successfully.`
    };
  })
  .build();
