import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient, type SmsAlertResponse } from '../lib/client';
import { groupIdSchema } from '../lib/schemas';
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
    'To send to a contact group, use groupId from manage_groups action list, or groupName, and leave mobileNumbers empty.'
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
      groupId: groupIdSchema,
      groupName: z
        .string()
        .optional()
        .describe(
          'Name of a contact group to discover and message. Alternatively use groupId from manage_groups action list.'
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
        .describe(
          'HTTP or HTTPS callback URL for delivery reports. Previously URL-encoded values are also accepted.'
        ),
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
    let client = new SmsAlertClient(ctx.auth);
    let senderId = ctx.input.senderId || ctx.config.senderId;

    if (!senderId) {
      throw createApiServiceError(
        'Sender ID is required. Set it in the configuration or provide it in the input.'
      );
    }

    let result: SmsAlertResponse;

    if ((ctx.input.groupName || ctx.input.groupId) && ctx.input.mobileNumbers) {
      throw createApiServiceError(
        'Provide either a contact group or mobile numbers, not both.'
      );
    }

    if (ctx.input.groupName || ctx.input.groupId) {
      ctx.info(`Sending SMS to group: ${ctx.input.groupName}`);
      result = await client.sendSmsToGroup({
        sender: senderId,
        groupName: ctx.input.groupName,
        groupId: ctx.input.groupId,
        text: ctx.input.message,
        route: ctx.input.route,
        dlrUrl: ctx.input.dlrUrl,
        reference: ctx.input.reference
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
      throw createApiServiceError('Provide mobileNumbers, groupId, or groupName.');
    }

    let target =
      ctx.input.groupName || ctx.input.groupId
        ? `group **${ctx.input.groupName || ctx.input.groupId}**`
        : `**${ctx.input.mobileNumbers}**`;

    return {
      output: {
        status: result.status || 'unknown',
        description: result.description ?? result
      },
      message: `SMS sent to ${target} with status: **${result.status || 'unknown'}**`
    };
  })
  .build();
