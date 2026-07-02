import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageNotifications = SlateTool.create(spec, {
  name: 'Manage Pub/Sub Notifications',
  key: 'manage_notifications',
  description: `List, create, or delete Pub/Sub notification configurations on a Cloud Storage bucket. Notifications deliver event messages to a Pub/Sub topic when objects are created, updated, deleted, or archived.`,
  instructions: [
    'The Pub/Sub topic must already exist and the Cloud Storage service agent must have the roles/pubsub.publisher role on it.',
    'Topic format: "projects/{project}/topics/{topic}".'
  ],
  constraints: ['Maximum 100 notification configurations per bucket.']
})
  .scopes(googleCloudStorageActionScopes.manageNotifications)
  .input(
    z.object({
      bucketName: z.string().describe('Name of the bucket'),
      action: z.enum(['list', 'create', 'delete']).describe('Operation to perform'),
      topic: z
        .string()
        .optional()
        .describe(
          'Pub/Sub topic in format "projects/{project}/topics/{topic}" (required for create)'
        ),
      eventTypes: z
        .array(
          z.enum([
            'OBJECT_FINALIZE',
            'OBJECT_METADATA_UPDATE',
            'OBJECT_DELETE',
            'OBJECT_ARCHIVE'
          ])
        )
        .optional()
        .describe('Event types to listen for. Defaults to all types.'),
      objectNamePrefix: z
        .string()
        .optional()
        .describe('Only send notifications for objects with this name prefix'),
      payloadFormat: z
        .enum(['JSON_API_V1', 'NONE'])
        .optional()
        .describe('Notification payload format. Defaults to JSON_API_V1.'),
      customAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value attributes included in every notification message'),
      notificationId: z
        .string()
        .optional()
        .describe('ID of the notification to delete (required for delete)')
    })
  )
  .output(
    z.object({
      notifications: z
        .array(
          z.object({
            notificationId: z.string(),
            topic: z.string(),
            eventTypes: z.array(z.string()).optional(),
            objectNamePrefix: z.string().optional(),
            payloadFormat: z.string().optional()
          })
        )
        .optional(),
      created: z
        .object({
          notificationId: z.string(),
          topic: z.string(),
          eventTypes: z.array(z.string()).optional(),
          payloadFormat: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    if (ctx.input.action === 'list') {
      let result = await client.listNotifications(ctx.input.bucketName);
      let notifications = (result.items || []).map((n: any) => ({
        notificationId: n.id,
        topic: n.topic,
        eventTypes: n.event_types,
        objectNamePrefix: n.object_name_prefix,
        payloadFormat: n.payload_format
      }));

      return {
        output: { notifications },
        message: `Found **${notifications.length}** notification configuration(s) on bucket **${ctx.input.bucketName}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.topic) {
        throw new Error('topic is required for "create" action');
      }
      let result = await client.createNotification(ctx.input.bucketName, {
        topic: ctx.input.topic,
        eventTypes: ctx.input.eventTypes,
        objectNamePrefix: ctx.input.objectNamePrefix,
        payloadFormat: ctx.input.payloadFormat,
        customAttributes: ctx.input.customAttributes
      });

      return {
        output: {
          created: {
            notificationId: result.id,
            topic: result.topic,
            eventTypes: result.event_types,
            payloadFormat: result.payload_format
          }
        },
        message: `Created notification **${result.id}** on bucket **${ctx.input.bucketName}** → topic **${result.topic}**.`
      };
    }

    // delete
    if (!ctx.input.notificationId) {
      throw new Error('notificationId is required for "delete" action');
    }
    await client.deleteNotification(ctx.input.bucketName, ctx.input.notificationId);
    return {
      output: { deleted: true },
      message: `Deleted notification **${ctx.input.notificationId}** from bucket **${ctx.input.bucketName}**.`
    };
  })
  .build();
