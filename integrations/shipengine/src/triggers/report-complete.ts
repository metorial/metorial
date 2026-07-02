import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reportCompleteTrigger = SlateTrigger.create(spec, {
  name: 'Report Complete',
  key: 'report_complete',
  description:
    'Fires when a requested report has finished generating and is ready for download.'
})
  .input(
    z.object({
      resourceUrl: z.string().optional().describe('URL to the report resource'),
      reportId: z.string().optional().describe('Report ID'),
      reportType: z.string().optional().describe('Report type'),
      status: z.string().optional().describe('Report status'),
      rawPayload: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('Report ID'),
      reportType: z.string().optional().describe('Type of report'),
      status: z.string().describe('Report status'),
      downloadUrl: z.string().optional().describe('URL to download the report')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        event: 'report_complete',
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          webhookId: webhook.webhook_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let reportData = data?.data ?? data ?? {};

      return {
        inputs: [
          {
            resourceUrl: data?.resource_url ?? '',
            reportId: reportData.report_id ?? reportData.id ?? '',
            reportType: reportData.report_type ?? reportData.type,
            status: reportData.status ?? 'complete',
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'report.complete',
        id: `report-${ctx.input.reportId ?? ''}-${Date.now()}`,
        output: {
          reportId: ctx.input.reportId ?? '',
          reportType: ctx.input.reportType,
          status: ctx.input.status ?? 'complete',
          downloadUrl: ctx.input.resourceUrl
        }
      };
    }
  })
  .build();
