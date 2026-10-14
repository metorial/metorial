import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ChatClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessageTool = SlateTool.create(spec, {
  name: 'Submit APIchat Message',
  key: 'send_message',
  description: `Submit an incoming customer message to an APIchat channel so the bot can respond. Supports **text**, **image**, and **location** messages. An unknown customer token creates a customer. Use send_customer_text to send an outbound message to an existing customer.`,
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
      address: z
        .string()
        .optional()
        .describe('Caption or address text for the location (optional)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was sent successfully'),
      response: z.record(z.string(), z.any()).optional().describe('Response data from the API')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.customerToken.trim()) {
      throw createApiServiceError('A non-empty customer token is required.');
    }
    let chatClient = new ChatClient(ctx.input.channelToken);
    let response: any;

    if (ctx.input.messageType === 'text') {
      if (!ctx.input.text)
        throw createApiServiceError('text is required when messageType is "text"');
      response = await chatClient.sendTextMessage(ctx.input.customerToken, ctx.input.text);
    } else if (ctx.input.messageType === 'image') {
      if (!ctx.input.imageUrl)
        throw createApiServiceError('imageUrl is required when messageType is "image"');
      response = await chatClient.sendImageMessage(
        ctx.input.customerToken,
        ctx.input.imageUrl
      );
    } else if (ctx.input.messageType === 'location') {
      if (!ctx.input.latitude || !ctx.input.longitude)
        throw createApiServiceError(
          'latitude and longitude are required when messageType is "location"'
        );
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
      message: `Submitted **${ctx.input.messageType}** customer message to APIchat.`
    };
  });
