import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleFormsClient } from '../lib/client';
import { googleFormsActionScopes } from '../scopes';
import { spec } from '../spec';

let watchSchema = z.object({
  watchId: z.string().optional().describe('Unique ID of the watch'),
  eventType: z.string().optional().describe('Event type: SCHEMA or RESPONSES'),
  topicName: z.string().optional().describe('Cloud Pub/Sub topic name'),
  createTime: z.string().optional().describe('When the watch was created (ISO 8601)'),
  expireTime: z.string().optional().describe('When the watch expires (ISO 8601)'),
  state: z.string().optional().describe('Watch state: ACTIVE or SUSPENDED'),
  errorType: z.string().optional().describe('Error type if the watch is in an error state')
});

export let manageWatches = SlateTool.create(spec, {
  name: 'Manage Watches',
  key: 'manage_watches',
  description: `Creates, lists, renews, or deletes push notification watches on a Google Form. Watches deliver notifications to a Google Cloud Pub/Sub topic when form events occur.

Supports two event types: **SCHEMA** (form structure/settings changes) and **RESPONSES** (new or updated response submissions).`,
  instructions: [
    'Set action to "create" to subscribe to events. Requires a Cloud Pub/Sub topic name and event type.',
    'Set action to "list" to see all watches on a form.',
    'Set action to "renew" to extend a watch for another 7 days before it expires.',
    'Set action to "delete" to remove a watch.'
  ],
  constraints: [
    'Watches expire after 7 days and must be renewed.',
    'Each form is limited to one watch per event type per Cloud Console project.',
    'The Cloud Pub/Sub topic must grant publish permissions to the Google Forms service account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleFormsActionScopes.manageWatches)
  .input(
    z.object({
      formId: z.string().describe('The ID of the Google Form'),
      action: z
        .enum(['create', 'list', 'renew', 'delete'])
        .describe('The watch operation to perform'),
      eventType: z
        .enum(['SCHEMA', 'RESPONSES'])
        .optional()
        .describe('Event type for creating a watch (required for "create")'),
      topicName: z
        .string()
        .optional()
        .describe(
          'Full Cloud Pub/Sub topic name, e.g. "projects/my-project/topics/my-topic" (required for "create")'
        ),
      watchId: z
        .string()
        .optional()
        .describe('The watch ID (required for "renew" and "delete")')
    })
  )
  .output(
    z.object({
      watch: watchSchema.optional().describe('The created, renewed, or deleted watch'),
      watches: z.array(watchSchema).optional().describe('List of watches (for "list" action)'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleFormsClient(ctx.auth.token);
    let { formId, action, eventType, topicName, watchId } = ctx.input;

    let mapWatch = (w: any) => ({
      watchId: w.id,
      eventType: w.eventType,
      topicName: w.target?.topic?.topicName,
      createTime: w.createTime,
      expireTime: w.expireTime,
      state: w.state,
      errorType: w.errorType
    });

    if (action === 'create') {
      if (!eventType) throw new Error('eventType is required when creating a watch');
      if (!topicName) throw new Error('topicName is required when creating a watch');

      let watch = await client.createWatch(formId, eventType, topicName);

      return {
        output: {
          watch: mapWatch(watch),
          action: 'create'
        },
        message: `Created **${eventType}** watch on form \`${formId}\` delivering to \`${topicName}\`. Expires at ${watch.expireTime || 'unknown'}.`
      };
    }

    if (action === 'list') {
      let watches = await client.listWatches(formId);

      return {
        output: {
          watches: watches.map(mapWatch),
          action: 'list'
        },
        message: `Found ${watches.length} watch(es) on form \`${formId}\`.`
      };
    }

    if (action === 'renew') {
      if (!watchId) throw new Error('watchId is required when renewing a watch');

      let watch = await client.renewWatch(formId, watchId);

      return {
        output: {
          watch: mapWatch(watch),
          action: 'renew'
        },
        message: `Renewed watch \`${watchId}\` on form \`${formId}\`. New expiration: ${watch.expireTime || 'unknown'}.`
      };
    }

    if (action === 'delete') {
      if (!watchId) throw new Error('watchId is required when deleting a watch');

      await client.deleteWatch(formId, watchId);

      return {
        output: {
          watch: { watchId },
          action: 'delete'
        },
        message: `Deleted watch \`${watchId}\` from form \`${formId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
