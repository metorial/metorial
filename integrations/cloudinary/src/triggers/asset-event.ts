import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let assetEvent = SlateTrigger.create(spec, {
  name: 'Asset Event',
  key: 'asset_event',
  description:
    'Triggers when an asset event occurs in Cloudinary, such as uploads, deletions, renames, tag changes, metadata updates, moderation results, and more.'
})
  .input(
    z.object({
      notificationType: z.string().describe('Type of notification event from Cloudinary.'),
      publicId: z.string().optional().describe('Public ID of the affected asset.'),
      assetId: z.string().optional().describe('Immutable asset ID of the affected asset.'),
      resourceType: z.string().optional().describe('Resource type of the affected asset.'),
      notificationId: z.string().describe('Unique identifier for deduplication.'),
      rawPayload: z.any().describe('Full raw webhook payload from Cloudinary.')
    })
  )
  .output(
    z.object({
      publicId: z.string().optional().describe('Public ID of the affected asset.'),
      assetId: z.string().optional().describe('Immutable asset ID.'),
      resourceType: z.string().optional().describe('Resource type (image, video, raw).'),
      format: z.string().optional().describe('File format.'),
      secureUrl: z.string().optional().describe('HTTPS delivery URL.'),
      bytes: z.number().optional().describe('File size in bytes.'),
      width: z.number().optional().describe('Width in pixels.'),
      height: z.number().optional().describe('Height in pixels.'),
      createdAt: z.string().optional().describe('Creation timestamp.'),
      tags: z.array(z.string()).optional().describe('Tags on the asset.'),
      version: z.number().optional().describe('Asset version number.'),
      folder: z.string().optional().describe('Folder path.'),
      displayName: z.string().optional().describe('Display name.'),
      moderationStatus: z.string().optional().describe('Moderation status if applicable.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let trigger = await client.createTrigger(ctx.input.webhookBaseUrl, 'all');

      return {
        registrationDetails: {
          triggerId: trigger.triggerId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let triggerId = ctx.input.registrationDetails?.triggerId;
      if (triggerId) {
        await client.deleteTrigger(triggerId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Cloudinary webhook signature verification
      let signature = ctx.request.headers.get('x-cld-signature');
      let timestamp = ctx.request.headers.get('x-cld-timestamp');
      if (signature && timestamp) {
        ctx.info(`Received webhook with signature ${signature} at timestamp ${timestamp}`);
      }

      let notificationType = body.notification_type || 'unknown';
      let publicId = body.public_id || body.public_ids?.[0];
      let assetId = body.asset_id;
      let resourceType = body.resource_type;

      // Generate a unique notification ID for deduplication
      let notificationId = `${notificationType}_${publicId || assetId || ''}_${timestamp || Date.now()}`;

      return {
        inputs: [
          {
            notificationType,
            publicId,
            assetId,
            resourceType,
            notificationId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload;
      let notificationType = ctx.input.notificationType;

      // Map Cloudinary notification_type to our event type format
      let eventTypeMap: Record<string, string> = {
        upload: 'asset.uploaded',
        delete: 'asset.deleted',
        rename: 'asset.renamed',
        display_name: 'asset.display_name_changed',
        move: 'asset.moved',
        tags: 'asset.tags_changed',
        context: 'asset.context_changed',
        structured_metadata: 'asset.metadata_changed',
        access_control: 'asset.access_control_changed',
        related_assets: 'asset.related_assets_changed',
        version_restore: 'asset.version_restored',
        moderation: 'asset.moderation_changed',
        eager: 'asset.eager_completed',
        explode: 'asset.explode_completed',
        multi: 'asset.multi_completed',
        create_folder: 'folder.created',
        delete_folder: 'folder.deleted'
      };

      let eventType = eventTypeMap[notificationType] || `asset.${notificationType}`;

      return {
        type: eventType,
        id: ctx.input.notificationId,
        output: {
          publicId: payload.public_id ?? ctx.input.publicId,
          assetId: payload.asset_id ?? ctx.input.assetId,
          resourceType: payload.resource_type ?? ctx.input.resourceType,
          format: payload.format,
          secureUrl: payload.secure_url,
          bytes: payload.bytes,
          width: payload.width,
          height: payload.height,
          createdAt: payload.created_at,
          tags: payload.tags,
          version: payload.version,
          folder: payload.folder ?? payload.asset_folder,
          displayName: payload.display_name,
          moderationStatus: payload.moderation_status
        }
      };
    }
  })
  .build();
