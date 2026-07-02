import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { snsServiceError } from '../lib/errors';
import { spec } from '../spec';

let smsTypeSchema = z.enum(['Promotional', 'Transactional']);

export let updateSmsSettings = SlateTool.create(spec, {
  name: 'Update SMS Settings',
  key: 'update_sms_settings',
  description: `Update default SNS SMS account settings such as monthly spend limit, default sender ID, default SMS type, delivery status logging, and usage report bucket.`,
  instructions: [
    'Only provide settings you want to change.',
    'These settings apply at the AWS account and region level for SNS SMS sending.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      monthlySpendLimit: z.string().optional().describe('Monthly SMS spend limit in USD'),
      deliveryStatusIAMRole: z
        .string()
        .optional()
        .describe('IAM role ARN that lets SNS write SMS delivery logs to CloudWatch Logs'),
      deliveryStatusSuccessSamplingRate: z
        .string()
        .optional()
        .describe('0-100 percentage of successful SMS deliveries to log'),
      defaultSenderID: z
        .string()
        .optional()
        .describe('Default SMS sender ID, 1-11 alphanumeric characters where supported'),
      defaultSMSType: smsTypeSchema
        .optional()
        .describe('Default SMS message type for cost/reliability optimization'),
      usageReportS3Bucket: z
        .string()
        .optional()
        .describe('S3 bucket name for daily SNS SMS usage reports')
    })
  )
  .output(
    z.object({
      updatedAttributes: z.array(z.string()).describe('SMS settings changed by this request')
    })
  )
  .handleInvocation(async ctx => {
    let attributes: Record<string, string> = {};
    if (ctx.input.monthlySpendLimit !== undefined) {
      attributes.MonthlySpendLimit = ctx.input.monthlySpendLimit;
    }
    if (ctx.input.deliveryStatusIAMRole !== undefined) {
      attributes.DeliveryStatusIAMRole = ctx.input.deliveryStatusIAMRole;
    }
    if (ctx.input.deliveryStatusSuccessSamplingRate !== undefined) {
      attributes.DeliveryStatusSuccessSamplingRate =
        ctx.input.deliveryStatusSuccessSamplingRate;
    }
    if (ctx.input.defaultSenderID !== undefined) {
      attributes.DefaultSenderID = ctx.input.defaultSenderID;
    }
    if (ctx.input.defaultSMSType !== undefined) {
      attributes.DefaultSMSType = ctx.input.defaultSMSType;
    }
    if (ctx.input.usageReportS3Bucket !== undefined) {
      attributes.UsageReportS3Bucket = ctx.input.usageReportS3Bucket;
    }

    let updatedAttributes = Object.keys(attributes);
    if (updatedAttributes.length === 0) {
      throw snsServiceError('Provide at least one SMS setting to update.');
    }

    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    await client.setSMSAttributes(attributes);

    return {
      output: { updatedAttributes },
      message: `Updated SMS settings: ${updatedAttributes.join(', ')}`
    };
  })
  .build();
