import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FluxguardClient } from '../lib/client';
import { spec } from '../spec';

export let pageChangeTrigger = SlateTrigger.create(spec, {
  name: 'Page Change Detected',
  key: 'page_change_detected',
  description:
    'Triggered when Fluxguard detects a change on a monitored web page. Includes change details, AI analysis, and links to screenshots and diffs.'
})
  .input(
    z.object({
      url: z.string().describe('The monitored page URL where changes occurred'),
      capturedAt: z.string().describe('Timestamp of version capture'),
      comparisonType: z
        .string()
        .describe('Type of comparison: html, visual, text, or network'),
      statusCode: z.number().describe('HTTP response code'),
      aiFlagged: z.string().optional().describe('AI assessment: warning or serenity'),
      summary: z.string().optional().describe('AI-generated text summary'),
      diffSummary: z.string().optional().describe('AI-generated diff summary'),
      siteId: z.string().describe('ID of the site'),
      siteName: z.string().optional().describe('Name of the site'),
      sessionId: z.string().describe('ID of the session'),
      sessionName: z.string().optional().describe('Name of the session'),
      pageId: z.string().describe('ID of the page'),
      pageName: z.string().optional().describe('Name of the page'),
      diffUrl: z.string().optional().describe('Link to view changes in Fluxguard console'),
      fileBaseUrl: z.string().optional().describe('S3 base URL for accessing captured files'),
      files: z.any().optional().describe('References to captured and diff files'),
      rawPayload: z.any().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      url: z.string().describe('The monitored page URL where changes occurred'),
      capturedAt: z.string().describe('Timestamp of version capture'),
      comparisonType: z.string().describe('Type of comparison performed'),
      statusCode: z.number().describe('HTTP response code of the crawl'),
      aiFlagged: z.string().optional().describe('AI assessment: warning or serenity'),
      summary: z.string().optional().describe('AI-generated summary of the changes'),
      diffSummary: z.string().optional().describe('AI-generated diff summary'),
      siteId: z.string().describe('ID of the site'),
      siteName: z.string().optional().describe('Name of the site'),
      sessionId: z.string().describe('ID of the session'),
      sessionName: z.string().optional().describe('Name of the session'),
      pageId: z.string().describe('ID of the page'),
      pageName: z.string().optional().describe('Name of the page'),
      diffUrl: z.string().optional().describe('Link to view changes in Fluxguard console'),
      fileBaseUrl: z.string().optional().describe('S3 base URL for accessing captured files'),
      files: z
        .any()
        .optional()
        .describe('References to captured and diff files (HTML, screenshots, etc.)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FluxguardClient(ctx.auth.token);
      let result = await client.createWebhook(ctx.input.webhookBaseUrl);

      return {
        registrationDetails: {
          webhookId: result.id ?? result.webhookId ?? ''
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FluxguardClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let siteData = data.site ?? {};
      let sessionData = data.session ?? {};
      let pageData = data.page ?? {};

      return {
        inputs: [
          {
            url: data.url ?? '',
            capturedAt: data.capturedAt ?? '',
            comparisonType: data.comparisonType ?? 'unknown',
            statusCode: data.statusCode ?? 0,
            aiFlagged: data.aiFlagged ?? undefined,
            summary: data.summary ?? undefined,
            diffSummary: data.diffSummary ?? undefined,
            siteId: siteData.id ?? siteData.siteId ?? '',
            siteName: siteData.name ?? siteData.siteName ?? undefined,
            sessionId: sessionData.id ?? sessionData.sessionId ?? '',
            sessionName: sessionData.name ?? sessionData.sessionName ?? undefined,
            pageId: pageData.id ?? pageData.pageId ?? '',
            pageName: pageData.name ?? pageData.pageName ?? undefined,
            diffUrl: data.diffUrl ?? undefined,
            fileBaseUrl: data.fileBaseUrl ?? undefined,
            files: data.files ?? undefined,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventId = `${ctx.input.pageId}-${ctx.input.capturedAt}-${ctx.input.comparisonType}`;

      return {
        type: 'page.change_detected',
        id: eventId,
        output: {
          url: ctx.input.url,
          capturedAt: ctx.input.capturedAt,
          comparisonType: ctx.input.comparisonType,
          statusCode: ctx.input.statusCode,
          aiFlagged: ctx.input.aiFlagged,
          summary: ctx.input.summary,
          diffSummary: ctx.input.diffSummary,
          siteId: ctx.input.siteId,
          siteName: ctx.input.siteName,
          sessionId: ctx.input.sessionId,
          sessionName: ctx.input.sessionName,
          pageId: ctx.input.pageId,
          pageName: ctx.input.pageName,
          diffUrl: ctx.input.diffUrl,
          fileBaseUrl: ctx.input.fileBaseUrl,
          files: ctx.input.files
        }
      };
    }
  })
  .build();
