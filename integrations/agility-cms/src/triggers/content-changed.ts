import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let contentChanged = SlateTrigger.create(spec, {
  name: 'Content Changed',
  key: 'content_changed',
  description:
    'Triggers when content items or pages are published, saved, or go through workflow changes (approval requested, approved, declined) in Agility CMS.'
})
  .input(
    z.object({
      state: z.string().describe('Event state: "Published", "Saved", or a workflow state'),
      instanceGuid: z.string().describe('Instance GUID where the event occurred'),
      languageCode: z.string().describe('Locale of the affected content'),
      contentId: z.number().optional().describe('Content item ID (for content events)'),
      contentVersionId: z
        .number()
        .optional()
        .describe('Content version ID (for content events)'),
      referenceName: z
        .string()
        .optional()
        .describe('Content model reference name (for content events)'),
      pageId: z.number().optional().describe('Page ID (for page events)'),
      pageVersionId: z.number().optional().describe('Page version ID (for page events)'),
      changeDateUtc: z.string().describe('ISO 8601 timestamp of the change')
    })
  )
  .output(
    z.object({
      resourceType: z
        .enum(['content', 'page'])
        .describe('Whether the change affected a content item or a page'),
      resourceId: z.number().describe('ID of the affected content item or page'),
      versionId: z.number().describe('Version ID of the affected resource'),
      state: z.string().describe('The event state (Published, Saved, etc.)'),
      languageCode: z.string().describe('Locale of the content'),
      referenceName: z
        .string()
        .optional()
        .describe('Content model reference name (content events only)'),
      instanceGuid: z.string().describe('Instance GUID'),
      changeDateUtc: z.string().describe('ISO 8601 timestamp of the change')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new MgmtClient({
        token: ctx.auth.token,
        guid: ctx.config.guid,
        locale: ctx.config.locale,
        region: ctx.auth.region
      });

      let result = await client.saveWebhook({
        url: ctx.input.webhookBaseUrl,
        publishEvents: true,
        saveEvents: true,
        workFlowEvents: true
      });

      return {
        registrationDetails: {
          webhookId: result?.webhookID ?? result?.id ?? result
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new MgmtClient({
        token: ctx.auth.token,
        guid: ctx.config.guid,
        locale: ctx.config.locale,
        region: ctx.auth.region
      });

      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let isPageEvent = data.pageID !== undefined && data.pageID !== null;

      return {
        inputs: [
          {
            state: data.state || 'Unknown',
            instanceGuid: data.instanceGuid || '',
            languageCode: data.languageCode || '',
            contentId: isPageEvent ? undefined : data.contentID,
            contentVersionId: isPageEvent ? undefined : data.contentVersionID,
            referenceName: data.referenceName,
            pageId: isPageEvent ? data.pageID : undefined,
            pageVersionId: isPageEvent ? data.pageVersionID : undefined,
            changeDateUtc: data.changeDateUTC || new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let isPageEvent = ctx.input.pageId !== undefined;
      let resourceType: 'content' | 'page' = isPageEvent ? 'page' : 'content';
      let resourceId = isPageEvent ? ctx.input.pageId! : ctx.input.contentId!;
      let versionId = isPageEvent ? ctx.input.pageVersionId! : ctx.input.contentVersionId!;

      let stateMap: Record<string, string> = {
        Published: 'published',
        Saved: 'saved',
        Approved: 'approved',
        Declined: 'declined',
        AwaitingApproval: 'approval_requested'
      };
      let eventState = stateMap[ctx.input.state] || ctx.input.state.toLowerCase();

      return {
        type: `${resourceType}.${eventState}`,
        id: `${resourceType}-${resourceId}-v${versionId}-${ctx.input.changeDateUtc}`,
        output: {
          resourceType,
          resourceId,
          versionId,
          state: ctx.input.state,
          languageCode: ctx.input.languageCode,
          referenceName: ctx.input.referenceName,
          instanceGuid: ctx.input.instanceGuid,
          changeDateUtc: ctx.input.changeDateUtc
        }
      };
    }
  })
  .build();
