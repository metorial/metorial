import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Sends a targeted message to an individual user via an API-triggered campaign. Supports **email**, **push notification**, **SMS**, **in-app**, and **web push** channels. Pass dynamic data fields for template personalization at send time.`,
  instructions: [
    'You must have a pre-existing API-triggered campaign in Iterable. Use the campaign ID from that campaign.',
    'Identify the recipient by email or userId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channel: z
        .enum(['email', 'push', 'sms', 'inApp', 'webPush'])
        .describe('Messaging channel to use'),
      campaignId: z.number().describe('ID of the API-triggered campaign to send'),
      recipientEmail: z.string().optional().describe('Email address of the recipient'),
      recipientUserId: z.string().optional().describe('User ID of the recipient'),
      sendAt: z
        .string()
        .optional()
        .describe('ISO 8601 datetime to schedule the send. If omitted, sends immediately.'),
      allowRepeatMarketingSends: z
        .boolean()
        .optional()
        .describe(
          'If true, allows sending marketing messages to users who have already received one in this campaign'
        ),
      templateFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Dynamic data fields passed to the template for personalization')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was sent/scheduled'),
      message: z.string().describe('Response message from Iterable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    let params = {
      campaignId: ctx.input.campaignId,
      recipientEmail: ctx.input.recipientEmail,
      recipientUserId: ctx.input.recipientUserId,
      dataFields: ctx.input.templateFields,
      sendAt: ctx.input.sendAt,
      allowRepeatMarketingSends: ctx.input.allowRepeatMarketingSends
    };

    let result: any;
    switch (ctx.input.channel) {
      case 'email':
        result = await client.sendEmail(params);
        break;
      case 'push':
        result = await client.sendPush(params);
        break;
      case 'sms':
        result = await client.sendSms(params);
        break;
      case 'inApp':
        result = await client.sendInApp(params);
        break;
      case 'webPush':
        result = await client.sendWebPush(params);
        break;
    }

    return {
      output: {
        success: result.code === 'Success',
        message: result.msg || `Message sent via ${ctx.input.channel}`
      },
      message: `Sent **${ctx.input.channel}** message via campaign **${ctx.input.campaignId}** to **${ctx.input.recipientEmail || ctx.input.recipientUserId}**.`
    };
  })
  .build();
