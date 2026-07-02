import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

export let inboundSmsTrigger = SlateTrigger.create(spec, {
  name: 'Inbound SMS Received',
  key: 'inbound_sms',
  description:
    'Triggers when an SMS is received on one of your dedicated numbers. Registers an inbound automation rule that forwards incoming messages to a webhook URL.'
})
  .input(
    z.object({
      from: z.string().optional().describe('Sender phone number'),
      to: z.string().optional().describe('Recipient dedicated number'),
      messageId: z.string().optional().describe('Unique message identifier'),
      body: z.string().optional().describe('SMS message body'),
      timestamp: z
        .number()
        .optional()
        .describe('Unix timestamp of when the message was received'),
      originalMessage: z.any().optional().describe('Full raw message payload')
    })
  )
  .output(
    z.object({
      smsMessageId: z.string().describe('Unique identifier of the inbound SMS'),
      from: z.string().describe('Sender phone number'),
      to: z.string().describe('Receiving dedicated number'),
      body: z.string().describe('SMS message body'),
      timestamp: z.number().describe('Unix timestamp when the message was received')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ClickSendClient({
        username: ctx.auth.username,
        token: ctx.auth.token
      });

      let result = await client.createInboundSmsRule({
        dedicatedNumber: '',
        ruleType: 'url',
        action: 'URL',
        actionAddress: ctx.input.webhookBaseUrl,
        matchType: '0',
        enabled: 1
      });

      let ruleId = result.data?.inbound_rule_id || result.data?.receipt_rule_id;

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
        await client.deleteInboundSmsRule(ctx.input.registrationDetails.ruleId);
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
          // Might be form data
          let params = new URLSearchParams(text);
          data = {} as any;
          params.forEach((value, key) => {
            data[key] = value;
          });
        }
      }

      // ClickSend can send data in different formats depending on delivery method config
      // Normalize to a consistent structure
      let messages: any[] = [];
      if (Array.isArray(data)) {
        messages = data;
      } else if (data?.messages) {
        messages = Array.isArray(data.messages) ? data.messages : [data.messages];
      } else {
        messages = [data];
      }

      return {
        inputs: messages.map((msg: any) => ({
          from: msg.from || msg.from_number || '',
          to: msg.to || msg.to_number || msg.dedicated_number || '',
          messageId:
            msg.message_id ||
            msg.messageid ||
            `inbound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          body: msg.body || msg.message || '',
          timestamp:
            msg.timestamp || msg.date
              ? Number.parseInt(msg.date || msg.timestamp, 10)
              : Math.floor(Date.now() / 1000),
          originalMessage: msg
        }))
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'sms.received',
        id: ctx.input.messageId || `inbound-${Date.now()}`,
        output: {
          smsMessageId: ctx.input.messageId || '',
          from: ctx.input.from || '',
          to: ctx.input.to || '',
          body: ctx.input.body || '',
          timestamp: ctx.input.timestamp || Math.floor(Date.now() / 1000)
        }
      };
    }
  })
  .build();
