import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { driveItemOutputSchema, mapDriveItem } from '../lib/schemas';
import { spec } from '../spec';

export let driveItemChanges = SlateTrigger.create(spec, {
  name: 'File Changes',
  key: 'file_changes',
  description:
    'Receive notifications when files (including PowerPoint presentations) are created, updated, or deleted within a subscribed folder in OneDrive or SharePoint.'
})
  .input(
    z.object({
      resourceId: z.string().describe('ID of the changed resource'),
      subscriptionId: z
        .string()
        .describe('ID of the subscription that triggered this notification'),
      changeType: z.string().describe('Type of change detected'),
      tenantId: z.string().optional().describe('Azure AD tenant ID from the notification'),
      clientState: z.string().optional().describe('Client state value for verification'),
      changedItem: z.any().optional().describe('Drive item data if available from delta query')
    })
  )
  .output(driveItemOutputSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GraphClient(ctx.auth.token);

      // Default to monitoring the user's OneDrive root
      let resource = '/me/drive/root';

      // Calculate expiration (max 30 days for OneDrive, we'll use 3 days to be safe)
      let expiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

      // Generate a client state for verification
      let clientState = `slates_${Date.now()}`;

      let subscription = await client.createSubscription({
        resource,
        changeType: 'updated',
        notificationUrl: ctx.input.webhookBaseUrl,
        expirationDateTime: expiration,
        clientState
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.id,
          resource: subscription.resource,
          expirationDateTime: subscription.expirationDateTime,
          clientState
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GraphClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { subscriptionId: string };

      if (details?.subscriptionId) {
        await client.deleteSubscription(details.subscriptionId);
      }
    },

    handleRequest: async ctx => {
      let url = ctx.request.url;

      // Handle Microsoft Graph validation request
      // When creating a subscription, Graph sends a validation token that must be echoed back
      if (ctx.request.method === 'POST' || ctx.request.method === 'GET') {
        let parsedUrl = new URL(url, 'https://placeholder.com');
        let validationToken = parsedUrl.searchParams.get('validationToken');
        if (validationToken) {
          // Return empty inputs - this is just a validation handshake
          return {
            inputs: []
          };
        }
      }

      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body?.value || !Array.isArray(body.value)) {
        return { inputs: [] };
      }

      let inputs = body.value.map((notification: any) => ({
        resourceId: notification.resource || '',
        subscriptionId: notification.subscriptionId || '',
        changeType: notification.changeType || 'updated',
        tenantId: notification.tenantId,
        clientState: notification.clientState
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let client = new GraphClient(ctx.auth.token);

      // Fetch the current state of the changed item
      // Graph notifications only include the resource path, not the full item data
      let item: any;
      try {
        // The resourceId from notifications is typically like "Users/{userId}/drive/root"
        // We need to fetch the delta to get actual changed items
        let deltaResult = await client.getDelta({});

        // Find the most recently changed item
        if (deltaResult.items.length > 0) {
          item = deltaResult.items[0];
        }
      } catch {
        // If delta fails, try to get item directly
        // resourceId might be a path we can use
      }

      // If we couldn't fetch item data, return minimal output
      if (!item) {
        return {
          type: `drive_item.${ctx.input.changeType}`,
          id: `${ctx.input.subscriptionId}_${ctx.input.resourceId}_${Date.now()}`,
          output: {
            itemId: ctx.input.resourceId,
            name: 'Unknown',
            isFolder: false
          }
        };
      }

      let output = mapDriveItem(item);

      return {
        type: `drive_item.${ctx.input.changeType}`,
        id: `${ctx.input.subscriptionId}_${output.itemId}_${item.lastModifiedDateTime || Date.now()}`,
        output
      };
    }
  })
  .build();
