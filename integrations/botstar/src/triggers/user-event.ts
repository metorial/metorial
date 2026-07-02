import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let userEvent = SlateTrigger.create(spec, {
  name: 'User Event',
  key: 'user_event',
  description: `Triggers on user-related webhook events from BotStar: new subscriber, updated user attribute, new tag on user, new request for human takeover. Configure the webhook URL in Bot Builder > Integrations.`,
  instructions: [
    'In BotStar, go to Bot Builder > Integrations, select the event type, and paste the webhook URL.',
    'Supports both Live and Test environment modes.'
  ]
})
  .input(
    z.object({
      eventType: z.string().describe('Type of event'),
      eventId: z.string().describe('Unique ID for deduplication'),
      userId: z.string().optional().describe('ID of the affected user'),
      botId: z.string().optional().describe('ID of the bot'),
      userName: z.string().optional().describe('Name of the user'),
      environment: z.string().optional().describe('Environment mode (live or test)'),
      attribute: z.string().optional().describe('Attribute name (for attribute updates)'),
      attributeValue: z.any().optional().describe('Attribute value (for attribute updates)'),
      tag: z.string().optional().describe('Tag name (for new tag events)'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the affected user'),
      botId: z.string().optional().describe('ID of the bot'),
      userName: z.string().optional().describe('Name of the user'),
      environment: z.string().optional().describe('Environment mode'),
      attribute: z.string().optional().describe('Attribute name'),
      attributeValue: z.any().optional().describe('Attribute value'),
      tag: z.string().optional().describe('Tag name')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.type || data.event_type || 'unknown';
      let userId = data.user_id || data.userId || data.user?.id || '';
      let botId = data.bot_id || data.botId || data.bot?.id || '';
      let userName = data.user_name || data.userName || data.user?.name || '';
      let environment = data.environment || data.env || '';
      let attribute = data.attribute || data.attribute_name || '';
      let attributeValue = data.attribute_value || data.attributeValue;
      let tag = data.tag || data.tag_name || '';

      let eventId = data.id || data.event_id || `${eventType}-${userId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            userId,
            botId,
            userName,
            environment,
            attribute,
            attributeValue,
            tag,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        new_subscriber: 'user.subscribed',
        subscriber: 'user.subscribed',
        updated_user_attribute: 'user.attribute_updated',
        attribute_updated: 'user.attribute_updated',
        new_tag: 'user.tag_added',
        tag_added: 'user.tag_added',
        human_takeover: 'user.human_takeover_requested',
        request_human_takeover: 'user.human_takeover_requested'
      };

      let eventType = typeMap[ctx.input.eventType] || `user.${ctx.input.eventType}`;

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          userId: ctx.input.userId || '',
          botId: ctx.input.botId,
          userName: ctx.input.userName,
          environment: ctx.input.environment,
          attribute: ctx.input.attribute,
          attributeValue: ctx.input.attributeValue,
          tag: ctx.input.tag
        }
      };
    }
  })
  .build();
