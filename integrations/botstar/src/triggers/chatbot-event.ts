import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let chatbotEvent = SlateTrigger.create(spec, {
  name: 'Chatbot Event',
  key: 'chatbot_event',
  description: `Triggers on chatbot flow events from BotStar: new checkpoint record, user capture response. These events fire when users interact with specific blocks in the chatbot flow. Configure in Bot Builder > Integrations.`,
  instructions: [
    'In BotStar, go to Bot Builder > Integrations, select the event type, and paste the webhook URL.',
    'For checkpoint events, configure which specific checkpoint to listen to.',
    'Supports both Live and Test environment modes.'
  ]
})
  .input(
    z.object({
      eventType: z.string().describe('Type of event'),
      eventId: z.string().describe('Unique ID for deduplication'),
      userId: z.string().optional().describe('ID of the user'),
      botId: z.string().optional().describe('ID of the bot'),
      userName: z.string().optional().describe('Name of the user'),
      environment: z.string().optional().describe('Environment mode (live or test)'),
      checkpointName: z.string().optional().describe('Name of the checkpoint'),
      checkpointData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Data collected at the checkpoint'),
      captureResponse: z.string().optional().describe('User capture response text'),
      blockId: z.string().optional().describe('Block ID where the event occurred'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the user'),
      botId: z.string().optional().describe('ID of the bot'),
      userName: z.string().optional().describe('Name of the user'),
      environment: z.string().optional().describe('Environment mode'),
      checkpointName: z.string().optional().describe('Name of the checkpoint'),
      checkpointData: z.record(z.string(), z.any()).optional().describe('Collected data'),
      captureResponse: z.string().optional().describe('User response text'),
      blockId: z.string().optional().describe('Block ID')
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
      let checkpointName =
        data.checkpoint_name || data.checkpointName || data.checkpoint || '';
      let checkpointData = data.checkpoint_data || data.checkpointData || data.data || {};
      let captureResponse =
        data.capture_response || data.captureResponse || data.response || '';
      let blockId = data.block_id || data.blockId || '';

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
            checkpointName,
            checkpointData: typeof checkpointData === 'object' ? checkpointData : {},
            captureResponse,
            blockId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        new_checkpoint_record: 'chatbot.checkpoint_recorded',
        checkpoint: 'chatbot.checkpoint_recorded',
        checkpoint_record: 'chatbot.checkpoint_recorded',
        user_capture_response: 'chatbot.capture_response',
        capture_response: 'chatbot.capture_response'
      };

      let eventType = typeMap[ctx.input.eventType] || `chatbot.${ctx.input.eventType}`;

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          userId: ctx.input.userId || '',
          botId: ctx.input.botId,
          userName: ctx.input.userName,
          environment: ctx.input.environment,
          checkpointName: ctx.input.checkpointName,
          checkpointData: ctx.input.checkpointData,
          captureResponse: ctx.input.captureResponse,
          blockId: ctx.input.blockId
        }
      };
    }
  })
  .build();
