import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let changedItemSchema = z.object({
  itemId: z.string().describe('Unique ID of the changed item'),
  name: z.string().describe('Name of the file or folder'),
  isFolder: z.boolean().describe('Whether this item is a folder'),
  isDeleted: z.boolean().describe('Whether the item was deleted'),
  size: z.number().describe('Size in bytes'),
  webUrl: z.string().describe('URL to view in a browser'),
  mimeType: z.string().optional().describe('MIME type (files only)'),
  createdDateTime: z.string().optional().describe('ISO 8601 creation timestamp'),
  lastModifiedDateTime: z.string().optional().describe('ISO 8601 last modified timestamp'),
  lastModifiedByName: z.string().optional().describe('Display name of last modifier'),
  parentPath: z.string().optional().describe('Path of the parent folder'),
  driveId: z.string().optional().describe('ID of the drive containing this item')
});

export let driveItemChangesTrigger = SlateTrigger.create(spec, {
  name: 'Drive Item Changes',
  key: 'drive_item_changes',
  description:
    'Triggers when files or folders are created, modified, or deleted in a OneDrive or SharePoint drive. Uses Microsoft Graph webhooks for real-time notification and delta queries to detect the specific changes.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'modified', 'deleted'])
        .describe('Type of change detected'),
      itemId: z.string().describe('ID of the changed item'),
      driveItem: z.any().describe('Full drive item data from the delta query')
    })
  )
  .output(changedItemSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // Generate a random client state for verification
      let clientState = `slates-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

      // Subscription expiration: max ~30 days (42300 minutes)
      let expirationDate = new Date(Date.now() + 42300 * 60 * 1000);

      let subscription = await client.createSubscription({
        notificationUrl: ctx.input.webhookBaseUrl,
        resource: '/me/drive/root',
        changeType: 'updated',
        expirationDateTime: expirationDate.toISOString(),
        clientState
      });

      // Get the initial delta token to track only future changes
      let initialDelta = await client.getDelta({});
      let deltaLink = initialDelta.deltaLink;

      // If we got a nextLink, we need to page through to get the deltaLink
      let nextLink = initialDelta.nextLink;
      while (nextLink && !deltaLink) {
        let nextPage = await client.getDelta({ deltaLink: nextLink });
        deltaLink = nextPage.deltaLink;
        nextLink = nextPage.nextLink;
      }

      return {
        registrationDetails: {
          subscriptionId: subscription.id,
          clientState,
          expirationDateTime: subscription.expirationDateTime
        },
        state: {
          deltaLink
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      // Handle validation token (Microsoft Graph sends this during subscription creation)
      let url = new URL(ctx.request.url);
      let validationToken = url.searchParams.get('validationToken');
      if (validationToken) {
        // Return empty inputs; the platform handles the response
        return { inputs: [] };
      }

      let body = (await ctx.request.json()) as {
        value?: Array<{ clientState?: string; resource?: string; subscriptionId?: string }>;
      };
      if (!body?.value?.length) {
        return { inputs: [] };
      }

      // Use delta query to find actual changes
      let client = new Client({ token: ctx.auth.token });
      let deltaLink = ctx.state?.deltaLink;

      let allChangedItems: Array<{
        changeType: 'created' | 'modified' | 'deleted';
        itemId: string;
        driveItem: any;
      }> = [];

      let deltaResult = await client.getDelta({ deltaLink });
      let items = deltaResult.value;

      for (let item of items) {
        let changeType: 'created' | 'modified' | 'deleted';
        if (item.deleted) {
          changeType = 'deleted';
        } else if (!deltaLink) {
          // First delta call - treat everything as created
          changeType = 'created';
        } else {
          // Heuristic: if created and modified times are very close, treat as created
          let created = new Date(item.createdDateTime).getTime();
          let modified = new Date(item.lastModifiedDateTime).getTime();
          changeType = Math.abs(modified - created) < 5000 ? 'created' : 'modified';
        }

        allChangedItems.push({
          changeType,
          itemId: item.id,
          driveItem: item
        });
      }

      // Follow nextLink pages
      let nextLink = deltaResult.nextLink;
      while (nextLink) {
        let nextPage = await client.getDelta({ deltaLink: nextLink });
        for (let item of nextPage.value) {
          let changeType: 'created' | 'modified' | 'deleted' = item.deleted
            ? 'deleted'
            : 'modified';
          allChangedItems.push({ changeType, itemId: item.id, driveItem: item });
        }
        nextLink = nextPage.nextLink;
        if (nextPage.deltaLink) {
          deltaResult.deltaLink = nextPage.deltaLink;
        }
      }

      return {
        inputs: allChangedItems,
        updatedState: {
          deltaLink: deltaResult.deltaLink || deltaLink
        }
      };
    },

    handleEvent: async ctx => {
      let item = ctx.input.driveItem;
      let isDeleted = !!item?.deleted;

      return {
        type: `drive_item.${ctx.input.changeType}`,
        id: `${ctx.input.itemId}-${item?.lastModifiedDateTime || Date.now()}`,
        output: {
          itemId: ctx.input.itemId,
          name: item?.name || 'Unknown',
          isFolder: !!item?.folder,
          isDeleted,
          size: item?.size || 0,
          webUrl: item?.webUrl || '',
          mimeType: item?.file?.mimeType,
          createdDateTime: item?.createdDateTime,
          lastModifiedDateTime: item?.lastModifiedDateTime,
          lastModifiedByName: item?.lastModifiedBy?.user?.displayName,
          parentPath: item?.parentReference?.path,
          driveId: item?.parentReference?.driveId
        }
      };
    }
  })
  .build();
