import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let getSmsStatus = SlateTool.create(spec, {
  name: 'Get SMS Status',
  key: 'get_sms_status',
  description: `Retrieve SNS SMS account settings, SMS sandbox status, and the current page of phone numbers that are opted out of SMS delivery.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      attributeNames: z
        .array(
          z.enum([
            'MonthlySpendLimit',
            'DeliveryStatusIAMRole',
            'DeliveryStatusSuccessSamplingRate',
            'DefaultSenderID',
            'DefaultSMSType',
            'UsageReportS3Bucket'
          ])
        )
        .optional()
        .describe('Specific SMS attribute names to retrieve. Omit to return all settings.'),
      optedOutNextToken: z
        .string()
        .optional()
        .describe('Pagination token for opted-out phone numbers')
    })
  )
  .output(
    z.object({
      attributes: z
        .record(z.string(), z.string())
        .describe('Current SNS SMS account settings'),
      isInSandbox: z
        .boolean()
        .describe('Whether the AWS account is in the SNS SMS sandbox in this region'),
      optedOutPhoneNumbers: z
        .array(z.string())
        .describe('Phone numbers opted out of SMS delivery from this AWS account'),
      optedOutNextToken: z
        .string()
        .optional()
        .describe('Token for the next opted-out phone number page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let [attributes, sandbox, optedOut] = await Promise.all([
      client.getSMSAttributes(ctx.input.attributeNames),
      client.getSMSSandboxAccountStatus(),
      client.listPhoneNumbersOptedOut(ctx.input.optedOutNextToken)
    ]);

    return {
      output: {
        attributes,
        isInSandbox: sandbox.isInSandbox,
        optedOutPhoneNumbers: optedOut.phoneNumbers,
        optedOutNextToken: optedOut.nextToken
      },
      message: `Retrieved SMS settings and ${optedOut.phoneNumbers.length} opted-out phone number(s)`
    };
  })
  .build();
