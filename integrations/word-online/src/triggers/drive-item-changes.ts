import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let driveItemChanges = SlateTrigger.create(spec, {
  name: 'Drive Item Changes',
  key: 'drive_item_changes',
  description:
    'Triggers when files or folders are created, updated, or deleted in OneDrive or SharePoint. Uses Microsoft Graph webhook subscriptions with delta queries to detect specific changes.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change detected'),
      itemId: z.string().describe('The unique ID of the changed drive item'),
      name: z.string().describe('Name of the changed item'),
      isFolder: z.boolean().describe('Whether the item is a folder'),
      mimeType: z.string().optional().describe('MIME type of the file'),
      size: z.number().optional().describe('File size in bytes'),
      webUrl: z.string().optional().describe('URL to open in browser'),
      modifiedAt: z.string().optional().describe('ISO 8601 last modified timestamp'),
      modifiedBy: z.string().optional().describe('Display name of the last modifier'),
      parentPath: z.string().optional().describe('Path of the parent folder')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('The unique ID of the changed drive item'),
      name: z.string().describe('Name of the changed item'),
      changeType: z.string().describe('Type of change: "created", "updated", or "deleted"'),
      isFolder: z.boolean().describe('Whether the item is a folder'),
      mimeType: z.string().optional().describe('MIME type of the file'),
      size: z.number().optional().describe('File size in bytes'),
      webUrl: z.string().optional().describe('URL to open in browser'),
      modifiedAt: z.string().optional().describe('ISO 8601 last modified timestamp'),
      modifiedBy: z.string().optional().describe('Display name of the last modifier'),
      parentPath: z.string().optional().describe('Path of the parent folder')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        driveId: ctx.config.driveId,
        siteId: ctx.config.siteId
      });

      let drivePath = ctx.config.driveId
        ? `/drives/${ctx.config.driveId}`
        : ctx.config.siteId
          ? `/sites/${ctx.config.siteId}/drive`
          : '/me/drive';

      let resource = `${drivePath}/root`;

      // Create the subscription
      let subscription = await client.createSubscription(
        ctx.input.webhookBaseUrl,
        resource,
        'updated',
        4230 // ~2.9 days, max for drive items
      );

      // Initialize delta tracking - get current state so we only report future changes
      let deltaResult = await client.getDelta();

      return {
        registrationDetails: {
          subscriptionId: subscription.subscriptionId,
          deltaLink: deltaResult.deltaLink
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        driveId: ctx.config.driveId,
        siteId: ctx.config.siteId
      });

      if (ctx.input.registrationDetails?.subscriptionId) {
        await client.deleteSubscription(ctx.input.registrationDetails.subscriptionId);
      }
    },

    handleRequest: async ctx => {
      // Microsoft Graph sends a validation request when creating a subscription
      let url = new URL(ctx.request.url, 'https://placeholder.local');
      let validationToken = url.searchParams.get('validationToken');

      if (validationToken) {
        // Return empty inputs; the platform handles the validation response
        return {
          inputs: []
        };
      }

      // Parse the notification payload
      let body = (await ctx.request.json()) as any;
      let notifications = body?.value || [];

      if (notifications.length === 0) {
        return { inputs: [] };
      }

      // Use delta query to get the actual changes
      let client = new Client({
        token: ctx.auth.token,
        driveId: ctx.config.driveId,
        siteId: ctx.config.siteId
      });

      let deltaLink = ctx.state?.deltaLink;
      let deltaResult = await client.getDelta(deltaLink || undefined);

      let inputs = deltaResult.items.map(item => {
        // Determine change type based on item properties
        let changeType: 'created' | 'updated' | 'deleted' = 'updated';
        if ((item as any).deleted) {
          changeType = 'deleted';
        } else if (item.createdAt === item.modifiedAt) {
          changeType = 'created';
        }

        return {
          changeType,
          itemId: item.itemId,
          name: item.name,
          isFolder: item.isFolder,
          mimeType: item.mimeType,
          size: item.size,
          webUrl: item.webUrl,
          modifiedAt: item.modifiedAt,
          modifiedBy: item.modifiedBy,
          parentPath: item.parentPath
        };
      });

      return {
        inputs,
        updatedState: {
          deltaLink: deltaResult.deltaLink
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `drive_item.${ctx.input.changeType}`,
        id: `${ctx.input.itemId}-${ctx.input.modifiedAt || Date.now()}`,
        output: {
          itemId: ctx.input.itemId,
          name: ctx.input.name,
          changeType: ctx.input.changeType,
          isFolder: ctx.input.isFolder,
          mimeType: ctx.input.mimeType,
          size: ctx.input.size,
          webUrl: ctx.input.webUrl,
          modifiedAt: ctx.input.modifiedAt,
          modifiedBy: ctx.input.modifiedBy,
          parentPath: ctx.input.parentPath
        }
      };
    }
  })
  .build();
