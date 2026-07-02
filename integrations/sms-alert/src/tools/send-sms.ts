import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send SMS messages to one or more recipients, or to an entire contact group.
Supports both transactional and promotional routes. You can send the same message to multiple recipients by providing comma-separated mobile numbers.
Optionally specify a delivery report callback URL to receive delivery status updates.`,
  instructions: [
    'Mobile numbers can include country code (e.g., 918010551055) or be without it.',
    'For multiple recipients, provide comma-separated numbers in the mobileNumbers field.',
    'To send to a contact group instead, use the groupName field and leave mobileNumbers empty.'
  ],
  constraints: ['Sender ID must be pre-approved and assigned to your SMS Alert account.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      senderId: z
        .string()
        .optional()
        .describe(
          'Sender ID to display on recipient devices. Falls back to the configured default sender ID.'
        ),
      mobileNumbers: z
        .string()
        .optional()
        .describe(
          'Recipient mobile number(s), comma-separated for multiple recipients (e.g., "918010551055,918010551056").'
        ),
      groupName: z
        .string()
        .optional()
        .describe(
          'Name of a contact group to send the SMS to. Use this instead of mobileNumbers to message an entire group.'
        ),
      message: z.string().describe('SMS message text to send.'),
      route: z
        .string()
        .optional()
        .describe(
          'SMS route (e.g., "transactional", "promotional", "demo"). Leave empty to use account default.'
        ),
      dlrUrl: z
        .string()
        .optional()
        .describe('URL-encoded callback URL to receive delivery report notifications.'),
      reference: z
        .string()
        .optional()
        .describe('Your custom reference identifier to correlate delivery reports.')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe('Status of the API response (e.g., "success" or "failure").'),
      description: z
        .any()
        .describe(
          'Detailed response from SMS Alert API including message IDs and delivery details.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient({ token: ctx.auth.token });
    let senderId = ctx.input.senderId || ctx.config.senderId;

    if (!senderId) {
      throw new Error(
        'Sender ID is required. Set it in the configuration or provide it in the input.'
      );
    }

    let result: any;

    if (ctx.input.groupName) {
      ctx.info(`Sending SMS to group: ${ctx.input.groupName}`);
      result = await client.sendSmsToGroup({
        sender: senderId,
        groupName: ctx.input.groupName,
        text: ctx.input.message,
        route: ctx.input.route
      });
    } else if (ctx.input.mobileNumbers) {
      ctx.info(`Sending SMS to: ${ctx.input.mobileNumbers}`);
      result = await client.sendSms({
        sender: senderId,
        mobileNo: ctx.input.mobileNumbers,
        text: ctx.input.message,
        route: ctx.input.route,
        dlrUrl: ctx.input.dlrUrl,
        reference: ctx.input.reference
      });
    } else {
      throw new Error('Either mobileNumbers or groupName must be provided.');
    }

    let target = ctx.input.groupName
      ? `group **${ctx.input.groupName}**`
      : `**${ctx.input.mobileNumbers}**`;

    return {
      output: {
        status: result.status || 'unknown',
        description: result.description || result
      },
      message: `SMS sent to ${target} with status: **${result.status || 'unknown'}**`
    };
  })
  .build();
