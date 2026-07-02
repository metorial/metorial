import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let alertWebhook = SlateTrigger.create(spec, {
  name: 'Alert Webhook',
  key: 'alert_webhook',
  description: `Receives webhook notifications from Metabase alerts. Triggers when alert conditions are met on a question's results — such as when results exist, a time series crosses a goal, or a progress bar reaches its target.
Configure the webhook URL in Metabase Admin Settings > Notification Channels.`
})
  .input(
    z.object({
      alertId: z.number().optional().describe('ID of the alert that triggered'),
      cardId: z.number().optional().describe('ID of the question/card'),
      cardName: z.string().optional().describe('Name of the question/card'),
      creatorId: z.number().optional().describe('ID of the alert creator'),
      rawData: z.any().optional().describe('The raw data from the question results'),
      visualization: z.string().optional().describe('Base64-encoded PNG visualization'),
      payload: z.any().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      alertId: z.number().optional().describe('ID of the alert that triggered'),
      cardId: z
        .number()
        .optional()
        .describe('ID of the question/card associated with the alert'),
      cardName: z.string().optional().describe('Name of the question/card'),
      creatorId: z.number().optional().describe('ID of the user who created the alert'),
      hasData: z.boolean().describe('Whether the alert payload contains result data'),
      hasVisualization: z
        .boolean()
        .describe('Whether the alert payload contains a visualization image')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let alertId = body?.alert_id ?? body?.id;
      let card = body?.card ?? body?.question ?? {};
      let cardId = card?.id ?? body?.card_id ?? body?.question_id;
      let cardName = card?.name ?? body?.card_name ?? body?.question_name;
      let creatorId = body?.creator?.id ?? body?.creator_id;
      let rawData = body?.raw_data ?? body?.data ?? body?.results;
      let visualization = body?.visualization ?? body?.image;

      return {
        inputs: [
          {
            alertId,
            cardId,
            cardName,
            creatorId,
            rawData,
            visualization,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventId = ctx.input.alertId
        ? `alert-${ctx.input.alertId}-${Date.now()}`
        : `webhook-${Date.now()}`;

      return {
        type: 'alert.triggered',
        id: eventId,
        output: {
          alertId: ctx.input.alertId,
          cardId: ctx.input.cardId,
          cardName: ctx.input.cardName,
          creatorId: ctx.input.creatorId,
          hasData: ctx.input.rawData != null,
          hasVisualization: ctx.input.visualization != null
        }
      };
    }
  })
  .build();
