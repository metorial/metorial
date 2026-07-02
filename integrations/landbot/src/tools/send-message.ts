import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChatClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessageTool = SlateTool.create(spec, {
  name: 'Send Chat Message',
  key: 'send_message',
  description: `Send a message to a customer via a chat channel. Supports sending **text**, **image**, and **location** messages. Requires the channel-specific auth token and the customer's token.`,
  instructions: [
    'The channelToken is the auth token generated for the specific channel (found in channel configuration), not the account API token.',
    'Set messageType to "text" for plain text, "image" for image URLs, or "location" for map locations.'
  ],
  constraints: [
    'The channelToken must be the channel-specific token, not the account-level API token.'
  ]
})
  .input(
    z.object({
      channelToken: z
        .string()
        .describe('Channel-specific auth token (from the channel Hook URL configuration)'),
      customerToken: z.string().describe('Token identifying the target customer'),
      messageType: z.enum(['text', 'image', 'location']).describe('Type of message to send'),
      text: z
        .string()
        .optional()
        .describe('Text content (required when messageType is "text")'),
      imageUrl: z
        .string()
        .optional()
        .describe('URL of the image (required when messageType is "image")'),
      latitude: z
        .string()
        .optional()
        .describe('Latitude coordinate (required when messageType is "location")'),
      longitude: z
        .string()
        .optional()
        .describe('Longitude coordinate (required when messageType is "location")'),
      address: z.string().optional().describe('Display address for the location (optional)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was sent successfully'),
      response: z.record(z.string(), z.any()).optional().describe('Response data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let chatClient = new ChatClient(ctx.input.channelToken);
    let response: any;

    if (ctx.input.messageType === 'text') {
      if (!ctx.input.text) throw new Error('text is required when messageType is "text"');
      response = await chatClient.sendTextMessage(ctx.input.customerToken, ctx.input.text);
    } else if (ctx.input.messageType === 'image') {
      if (!ctx.input.imageUrl)
        throw new Error('imageUrl is required when messageType is "image"');
      response = await chatClient.sendImageMessage(
        ctx.input.customerToken,
        ctx.input.imageUrl
      );
    } else if (ctx.input.messageType === 'location') {
      if (!ctx.input.latitude || !ctx.input.longitude)
        throw new Error('latitude and longitude are required when messageType is "location"');
      response = await chatClient.sendLocationMessage(
        ctx.input.customerToken,
        ctx.input.latitude,
        ctx.input.longitude,
        ctx.input.address
      );
    }

    return {
      output: {
        success: true,
        response
      },
      message: `Sent **${ctx.input.messageType}** message to customer.`
    };
  });
