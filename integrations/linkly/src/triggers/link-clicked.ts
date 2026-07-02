import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let linkClicked = SlateTrigger.create(spec, {
  name: 'Link Clicked',
  key: 'link_clicked',
  description:
    'Fires when a tracked Linkly short link is clicked. Provides full click details including geolocation, device, browser, referrer, and link metadata.'
})
  .input(
    z.object({
      event: z.string().describe('Event type (always "click")'),
      timestamp: z.string().describe('ISO 8601 timestamp of the click'),
      linkId: z.number().describe('ID of the clicked link'),
      linkName: z.string().optional().nullable().describe('Name of the clicked link'),
      linkUrl: z.string().describe('Destination URL of the link'),
      linkFullUrl: z.string().describe('Full short URL'),
      linkDomain: z.string().optional().nullable().describe('Custom domain'),
      linkSlug: z.string().optional().nullable().describe('URL slug'),
      linkWorkspaceId: z.number().optional().nullable().describe('Workspace ID'),
      country: z
        .string()
        .optional()
        .nullable()
        .describe('Two-letter country code of the visitor'),
      isEuCountry: z
        .boolean()
        .optional()
        .nullable()
        .describe('Whether the visitor is from an EU country'),
      platform: z.string().optional().nullable().describe('Visitor platform/OS'),
      browserName: z.string().optional().nullable().describe('Visitor browser'),
      referer: z.string().optional().nullable().describe('Referrer URL'),
      isp: z.string().optional().nullable().describe('Visitor ISP'),
      botName: z
        .string()
        .optional()
        .nullable()
        .describe('Bot name if the click was from a bot'),
      destination: z
        .string()
        .optional()
        .nullable()
        .describe('Final destination URL after redirect rules'),
      clickParams: z
        .any()
        .optional()
        .nullable()
        .describe('Query parameters passed with the click')
    })
  )
  .output(
    z.object({
      linkId: z.number().describe('ID of the clicked link'),
      linkName: z.string().optional().nullable().describe('Name of the clicked link'),
      linkUrl: z.string().describe('Destination URL'),
      linkFullUrl: z.string().describe('Full short URL'),
      linkDomain: z.string().optional().nullable().describe('Custom domain'),
      linkSlug: z.string().optional().nullable().describe('URL slug'),
      linkWorkspaceId: z.number().optional().nullable().describe('Workspace ID'),
      clickedAt: z.string().describe('ISO 8601 timestamp of the click'),
      country: z.string().optional().nullable().describe('Two-letter country code'),
      isEuCountry: z.boolean().optional().nullable().describe('Whether visitor is from EU'),
      platform: z.string().optional().nullable().describe('Visitor platform/OS'),
      browserName: z.string().optional().nullable().describe('Visitor browser'),
      referer: z.string().optional().nullable().describe('Referrer URL'),
      isp: z.string().optional().nullable().describe('Visitor ISP'),
      botName: z.string().optional().nullable().describe('Bot name if click was from a bot'),
      destination: z.string().optional().nullable().describe('Final destination URL'),
      clickParams: z
        .any()
        .optional()
        .nullable()
        .describe('Query parameters passed with the click')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.auth.workspaceId
      });

      let result = await client.createWorkspaceWebhook(ctx.input.webhookBaseUrl);

      return {
        registrationDetails: {
          webhookId: result.id ? String(result.id) : ctx.input.webhookBaseUrl,
          webhookUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.auth.workspaceId
      });

      let hookId =
        ctx.input.registrationDetails?.webhookId || ctx.input.registrationDetails?.webhookUrl;
      if (hookId) {
        await client.deleteWorkspaceWebhook(hookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let link = data.link || {};
      let click = data.click || {};

      return {
        inputs: [
          {
            event: data.event || 'click',
            timestamp: data.timestamp || new Date().toISOString(),
            linkId: link.id,
            linkName: link.name,
            linkUrl: link.url || link.destination,
            linkFullUrl: link.full_url,
            linkDomain: link.domain,
            linkSlug: link.slug,
            linkWorkspaceId: link.workspace_id,
            country: click.country,
            isEuCountry: click.is_eu_country,
            platform: click.platform,
            browserName: click.browser_name,
            referer: click.referer,
            isp: click.isp,
            botName: click.bot_name,
            destination: click.destination,
            clickParams: click.params
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: 'link.clicked',
        id: `${input.linkId}-${input.timestamp}`,
        output: {
          linkId: input.linkId,
          linkName: input.linkName,
          linkUrl: input.linkUrl,
          linkFullUrl: input.linkFullUrl,
          linkDomain: input.linkDomain,
          linkSlug: input.linkSlug,
          linkWorkspaceId: input.linkWorkspaceId,
          clickedAt: input.timestamp,
          country: input.country,
          isEuCountry: input.isEuCountry,
          platform: input.platform,
          browserName: input.browserName,
          referer: input.referer,
          isp: input.isp,
          botName: input.botName,
          destination: input.destination,
          clickParams: input.clickParams
        }
      };
    }
  })
  .build();
