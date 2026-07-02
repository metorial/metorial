import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

export let smsDeliveryReceiptTrigger = SlateTrigger.create(spec, {
  name: 'SMS Delivery Receipt',
  key: 'sms_delivery_receipt',
  description:
    'Triggers when the delivery status of a sent SMS changes. Registers a delivery receipt automation rule that forwards status updates to a webhook URL.'
})
  .input(
    z.object({
      messageId: z.string().optional().describe('Unique message identifier'),
      status: z.string().optional().describe('Delivery status'),
      statusCode: z.string().optional().describe('Delivery status code'),
      to: z.string().optional().describe('Recipient phone number'),
      from: z.string().optional().describe('Sender number or ID'),
      timestamp: z.number().optional().describe('Unix timestamp of the status update'),
      customString: z
        .string()
        .optional()
        .describe('Custom tracking string if provided during send'),
      originalPayload: z.any().optional().describe('Full raw receipt payload')
    })
  )
  .output(
    z.object({
      smsMessageId: z.string().describe('Unique identifier of the SMS'),
      to: z.string().describe('Recipient phone number'),
      from: z.string().describe('Sender number or ID'),
      status: z.string().describe('Current delivery status'),
      statusCode: z.string().describe('Delivery status code'),
      timestamp: z.number().describe('Unix timestamp of the status update'),
      customString: z.string().optional().describe('Custom tracking string if provided')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ClickSendClient({
        username: ctx.auth.username,
        token: ctx.auth.token
      });

      let result = await client.createSmsDeliveryReceiptRule({
        ruleType: 'url',
        action: 'URL',
        actionAddress: ctx.input.webhookBaseUrl,
        matchType: '0',
        enabled: 1
      });

      let ruleId = result.data?.receipt_rule_id || result.data?.inbound_rule_id;

      return {
        registrationDetails: {
          ruleId: ruleId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ClickSendClient({
        username: ctx.auth.username,
        token: ctx.auth.token
      });

      if (ctx.input.registrationDetails?.ruleId) {
        await client.deleteSmsDeliveryReceiptRule(ctx.input.registrationDetails.ruleId);
      }
    },

    handleRequest: async ctx => {
      let data: any;

      let contentType = ctx.request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await ctx.request.json();
      } else {
        let text = await ctx.request.text();
        try {
          data = JSON.parse(text);
        } catch {
          let params = new URLSearchParams(text);
          data = {};
          params.forEach((value, key) => {
            (data as any)[key] = value;
          });
        }
      }

      let receipts: any[] = [];
      if (Array.isArray(data)) {
        receipts = data;
      } else if (data?.receipts) {
        receipts = Array.isArray(data.receipts) ? data.receipts : [data.receipts];
      } else {
        receipts = [data];
      }

      return {
        inputs: receipts.map((receipt: any) => ({
          messageId:
            receipt.message_id ||
            receipt.messageid ||
            `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: receipt.status || receipt.status_text || '',
          statusCode: receipt.status_code?.toString() || '',
          to: receipt.to || receipt.recipient || '',
          from: receipt.from || receipt.sender || '',
          timestamp: receipt.timestamp
            ? Number.parseInt(receipt.timestamp, 10)
            : Math.floor(Date.now() / 1000),
          customString: receipt.custom_string || undefined,
          originalPayload: receipt
        }))
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'sms.delivery_receipt',
        id: ctx.input.messageId || `receipt-${Date.now()}`,
        output: {
          smsMessageId: ctx.input.messageId || '',
          to: ctx.input.to || '',
          from: ctx.input.from || '',
          status: ctx.input.status || '',
          statusCode: ctx.input.statusCode || '',
          timestamp: ctx.input.timestamp || Math.floor(Date.now() / 1000),
          customString: ctx.input.customString || undefined
        }
      };
    }
  })
  .build();
