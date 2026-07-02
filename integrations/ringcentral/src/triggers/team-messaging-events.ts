import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let teamMessagingEvents = SlateTrigger.create(spec, {
  name: 'Team Messaging Events',
  key: 'team_messaging_events',
  description: 'Triggers when team messaging posts are created or updated.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier (uuid from the webhook payload)'),
      postId: z.string().describe('The ID of the post'),
      chatId: z.string().describe('The ID of the chat (group) where the post was made'),
      text: z.string().describe('The text content of the post'),
      creatorId: z.string().describe('The ID of the user who created the post'),
      creationTime: z.string().describe('ISO 8601 timestamp when the post was created'),
      eventType: z.string().describe('The type of event (e.g., PostAdded, PostChanged)')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('The ID of the post'),
      chatId: z.string().describe('The ID of the chat (group) where the post was made'),
      text: z.string().describe('The text content of the post'),
      creatorId: z.string().describe('The ID of the user who created the post'),
      creationTime: z.string().describe('ISO 8601 timestamp when the post was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

      let result = await client.createSubscription(
        ['/restapi/v1.0/glip/posts'],
        ctx.input.webhookBaseUrl
      );

      return {
        registrationDetails: {
          subscriptionId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
      await client.deleteSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      // RingCentral sends a Validation-Token header for webhook URL verification
      let validationToken = ctx.request.headers.get('Validation-Token');
      if (validationToken) {
        return {
          inputs: [],
          response: new Response('', {
            status: 200,
            headers: { 'Validation-Token': validationToken }
          })
        };
      }

      let body = (await ctx.request.json()) as any;

      let postBody = body.body;
      if (!postBody?.id) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventId: body.uuid || '',
            postId: postBody.id || '',
            chatId: postBody.groupId || '',
            text: postBody.text || '',
            creatorId: postBody.creatorId || '',
            creationTime: postBody.creationTime || '',
            eventType: postBody.eventType || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        PostAdded: 'team_post.created',
        PostChanged: 'team_post.updated'
      };

      let type =
        typeMap[ctx.input.eventType] || `team_post.${ctx.input.eventType.toLowerCase()}`;

      return {
        type,
        id: ctx.input.eventId,
        output: {
          postId: ctx.input.postId,
          chatId: ctx.input.chatId,
          text: ctx.input.text,
          creatorId: ctx.input.creatorId,
          creationTime: ctx.input.creationTime
        }
      };
    }
  })
  .build();
