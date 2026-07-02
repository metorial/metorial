import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let assetsWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Assets Webhook',
  key: 'assets_webhook',
  description:
    'Receives webhook notifications about asset report generation status, including when a report is ready (PRODUCT_READY) or has encountered an error (ERROR).'
})
  .input(
    z.object({
      webhookType: z.string().describe('Webhook type (ASSETS)'),
      webhookCode: z.string().describe('Webhook code (PRODUCT_READY or ERROR)'),
      assetReportId: z.string().optional().describe('Asset report ID'),
      environment: z.string().optional().describe('Plaid environment'),
      error: z.any().nullable().optional().describe('Error details if applicable')
    })
  )
  .output(
    z.object({
      assetReportId: z.string().optional().describe('Asset report ID'),
      webhookCode: z.string().describe('PRODUCT_READY or ERROR'),
      hasError: z.boolean().describe('Whether the report generation failed'),
      environment: z.string().optional().describe('Plaid environment')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.webhook_type !== 'ASSETS') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            webhookType: data.webhook_type,
            webhookCode: data.webhook_code,
            assetReportId: data.asset_report_id,
            environment: data.environment,
            error: data.error ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `assets.${ctx.input.webhookCode.toLowerCase()}`,
        id: `assets-${ctx.input.assetReportId ?? 'unknown'}-${ctx.input.webhookCode}-${Date.now()}`,
        output: {
          assetReportId: ctx.input.assetReportId,
          webhookCode: ctx.input.webhookCode,
          hasError: ctx.input.error != null || ctx.input.webhookCode === 'ERROR',
          environment: ctx.input.environment
        }
      };
    }
  })
  .build();
