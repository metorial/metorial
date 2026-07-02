import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS text message directly to a phone number via Amazon SNS. The phone number must be in E.164 format (e.g., +14155552671). Supports message attributes for SMS-specific settings like sender ID and message type.`,
  constraints: [
    'SMS messages are limited to 140 bytes per message, 1,600 characters total per publish.',
    'SMS is supported in 200+ countries.',
    'Phone number must be in E.164 format.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format (e.g., +14155552671)'),
      message: z.string().describe('The SMS message text'),
      senderIdName: z
        .string()
        .optional()
        .describe('Custom sender ID (supported in some countries)'),
      messageType: z
        .enum(['Promotional', 'Transactional'])
        .optional()
        .describe('SMS message type affecting delivery priority and cost')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique identifier assigned to the sent message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let messageAttributes: Record<string, { dataType: string; stringValue: string }> = {};
    if (ctx.input.senderIdName) {
      messageAttributes['AWS.SNS.SMS.SenderID'] = {
        dataType: 'String',
        stringValue: ctx.input.senderIdName
      };
    }
    if (ctx.input.messageType) {
      messageAttributes['AWS.SNS.SMS.SMSType'] = {
        dataType: 'String',
        stringValue: ctx.input.messageType
      };
    }

    let result = await client.publish({
      phoneNumber: ctx.input.phoneNumber,
      message: ctx.input.message,
      messageAttributes:
        Object.keys(messageAttributes).length > 0 ? messageAttributes : undefined
    });

    return {
      output: { messageId: result.messageId },
      message: `Sent SMS to \`${ctx.input.phoneNumber}\` — message ID: \`${result.messageId}\``
    };
  })
  .build();
