import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createService = SlateTool.create(spec, {
  name: 'Create Service',
  key: 'create_service',
  description: `Create a new scanning service in CodeREADr. A service defines a workflow for how app users capture and validate barcode data. Configure the validation method, postback URLs, duplicate handling, and scheduling.`,
  instructions: [
    'Database-type services require a databaseId.',
    'Postback-type services require a postbackUrl.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      validationMethod: z
        .enum([
          'record',
          'ondevicerecord',
          'database',
          'ondevicedatabase',
          'postback',
          'webview'
        ])
        .describe('How scans are validated'),
      name: z.string().optional().describe('Name of the service'),
      description: z
        .string()
        .optional()
        .describe('Service description or URL for webview services'),
      databaseId: z
        .string()
        .optional()
        .describe('Database ID for database-type validation services'),
      postbackUrl: z
        .string()
        .optional()
        .describe('URL to receive scan data for postback-type services'),
      duplicateValue: z
        .string()
        .optional()
        .describe('Duplicate scan handling (e.g., "1" to allow, "0" to prevent)'),
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
      uploadEmailFormat: z.string().optional().describe('Format of email delivery'),
      postbackReceiverOnly: z.string().optional().describe('Set to "1" for receiver-only mode')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('ID of the newly created service')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let serviceId = await client.createService({
      validationMethod: ctx.input.validationMethod,
      name: ctx.input.name,
      description: ctx.input.description,
      databaseId: ctx.input.databaseId,
      postbackUrl: ctx.input.postbackUrl,
      duplicateValue: ctx.input.duplicateValue,
      deviceDuplicateValue: ctx.input.deviceDuplicateValue,
      periodStartDate: ctx.input.periodStartDate,
      periodStartTime: ctx.input.periodStartTime,
      periodEndDate: ctx.input.periodEndDate,
      periodEndTime: ctx.input.periodEndTime,
      uploadEmail: ctx.input.uploadEmail,
      uploadEmailFormat: ctx.input.uploadEmailFormat,
      postbackReceiverOnly: ctx.input.postbackReceiverOnly
    });

    return {
      output: { serviceId },
      message: `Created service **${ctx.input.name || serviceId}** (ID: ${serviceId}) with validation method **${ctx.input.validationMethod}**.`
    };
  })
  .build();
