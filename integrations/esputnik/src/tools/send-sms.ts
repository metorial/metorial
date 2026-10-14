import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getMessageResults } from '../lib/client';
import { messageResultSchema } from '../lib/schemas';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message to a single recipient by phone number. Optionally use a pre-configured message template.
If the phone number does not match an existing contact, a new contact will be created automatically.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe('Recipient phone number in international format (e.g., "+380501234567")'),
      text: z
        .string()
        .optional()
        .describe('SMS message text (required if not using a template)'),
      from: z.string().optional().describe('Sender name (alpha name)'),
      templateId: z.number().optional().describe('ID of a pre-configured SMS template to use'),
      contactId: z
        .number()
        .optional()
        .describe('eSputnik contact ID to associate the message with'),
      externalCustomerId: z
        .string()
        .optional()
        .describe('External customer ID to associate the message with')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the SMS was accepted for sending'),
      requestId: z.string().optional().describe('Use get_message_status to check delivery'),
      results: z.array(messageResultSchema).optional().describe('Provider queue results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.templateId === undefined && (!ctx.input.text || !ctx.input.from)) {
      throw createApiServiceError(
        'text and from are required when templateId is not provided.'
      );
    }
    let response: Awaited<ReturnType<Client['sendSms']>>;
    if (ctx.input.templateId !== undefined) {
      response = await client.smartSend(ctx.input.templateId, [
        {
          locator: ctx.input.phoneNumber,
          contactId: ctx.input.contactId,
          externalCustomerId: ctx.input.externalCustomerId,
          email: false,
          fromName: ctx.input.from
        }
      ]);
    } else {
      if (ctx.input.contactId !== undefined) {
        await client.updateContact(ctx.input.contactId, {
          externalCustomerId: ctx.input.externalCustomerId,
          channels: [{ type: 'sms', value: ctx.input.phoneNumber }]
        });
      } else if (ctx.input.externalCustomerId) {
        await client.addOrUpdateContact({
          externalCustomerId: ctx.input.externalCustomerId,
          channels: [{ type: 'sms', value: ctx.input.phoneNumber }]
        });
      }
      response = await client.sendSms({
        phoneNumbers: [ctx.input.phoneNumber],
        text: ctx.input.text,
        from: ctx.input.from
      });
    }
    let results = getMessageResults(response);
    if (!results.length)
      throw createApiServiceError(
        'eSputnik returned no SMS queue result. Check the account before retrying.'
      );
    let rejected = results.find(result => result.status === 'ERROR');
    if (rejected)
      throw createApiServiceError(
        `eSputnik rejected the SMS: ${rejected.message || rejected.status}`
      );

    return {
      output: { sent: true, requestId: results[0]?.requestId, results },
      message: `SMS accepted for sending to **${ctx.input.phoneNumber}**.`
    };
  })
  .build();
