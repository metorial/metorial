import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let eventDataSchema = z.object({
  eventType: z.string().describe('Azure Event Grid event type'),
  eventId: z.string().describe('Unique event ID'),
  eventTime: z.string().describe('Time the event was generated'),
  subject: z.string().describe('Event subject (resource path)'),
  topic: z.string().describe('Event Grid topic'),
  api: z.string().describe('API operation that triggered the event'),
  blobUrl: z.string().describe('Full URL of the affected blob'),
  contentType: z.string().describe('Content type of the blob'),
  contentLength: z.number().describe('Size of the blob in bytes'),
  blobType: z.string().describe('Type of the blob'),
  sequencer: z.string().describe('Opaque value for ordering events')
});

export let blobEvents = SlateTrigger.create(spec, {
  name: 'Blob Events',
  key: 'blob_events',
  description:
    'Receives Azure Event Grid notifications for blob lifecycle events including creation, deletion, tier changes, and renames. Requires an Azure Event Grid subscription pointing to the webhook URL.'
})
  .input(eventDataSchema)
  .output(
    z.object({
      containerName: z.string().describe('Name of the container'),
      blobName: z.string().describe('Name/path of the affected blob'),
      blobUrl: z.string().describe('Full URL of the affected blob'),
      contentType: z.string().describe('Content type of the blob'),
      contentLength: z.number().describe('Size of the blob in bytes'),
      blobType: z.string().describe('Type of the blob'),
      api: z.string().describe('API operation that triggered the event'),
      eventTime: z.string().describe('Time the event was generated'),
      sequencer: z.string().describe('Opaque value for ordering events')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let _contentType = ctx.request.headers.get('content-type') ?? '';

      // Handle Event Grid subscription validation (CloudEvents or EventGrid schema)
      let body = (await ctx.request.json()) as any;

      // Azure Event Grid sends an array of events (EventGrid schema)
      // or it may send a CloudEvents batch
      let events: any[] = Array.isArray(body) ? body : [body];

      // Handle subscription validation handshake
      if (
        events.length > 0 &&
        events[0]?.eventType === 'Microsoft.EventGrid.SubscriptionValidationEvent'
      ) {
        // This is handled by the platform - return empty inputs
        // The validation response needs to be returned as a response
        return {
          inputs: [],
          response: new Response(
            JSON.stringify({
              validationResponse: events[0]?.data?.validationCode
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        };
      }

      // CloudEvents validation: check for WebHook-Request-Origin header
      let webhookOrigin = ctx.request.headers.get('webhook-request-origin');
      if (ctx.request.method === 'OPTIONS' && webhookOrigin) {
        return {
          inputs: [],
          response: new Response(null, {
            status: 200,
            headers: {
              'WebHook-Allowed-Origin': webhookOrigin,
              'WebHook-Allowed-Rate': '*'
            }
          })
        };
      }

      let inputs = events
        .filter((event: any) => {
          let eventType = event.eventType ?? event.type ?? '';
          return eventType.startsWith('Microsoft.Storage.');
        })
        .map((event: any) => {
          let data = event.data ?? {};
          let subject = event.subject ?? '';

          // Extract container name and blob name from subject
          // Subject format: /blobServices/default/containers/{container}/blobs/{blob}
          let _containerName = '';
          let _blobName = '';
          let containerMatch = subject.match(/\/containers\/([^/]+)/);
          let blobMatch = subject.match(/\/blobs\/(.+)$/);
          if (containerMatch) _containerName = containerMatch[1];
          if (blobMatch) _blobName = blobMatch[1];

          return {
            eventType: event.eventType ?? event.type ?? '',
            eventId: event.id ?? '',
            eventTime: event.eventTime ?? event.time ?? '',
            subject,
            topic: event.topic ?? '',
            api: data.api ?? '',
            blobUrl: data.url ?? data.blobUrl ?? '',
            contentType: data.contentType ?? '',
            contentLength: data.contentLength ?? 0,
            blobType: data.blobType ?? '',
            sequencer: data.sequencer ?? ''
          };
        });

      return { inputs };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      // Extract container and blob name from subject
      let containerName = '';
      let blobName = '';
      let containerMatch = input.subject.match(/\/containers\/([^/]+)/);
      let blobMatch = input.subject.match(/\/blobs\/(.+)$/);
      if (containerMatch) containerName = containerMatch[1]!;
      if (blobMatch) blobName = blobMatch[1]!;

      // Map Azure event types to simple event types
      let typeMap: Record<string, string> = {
        'Microsoft.Storage.BlobCreated': 'blob.created',
        'Microsoft.Storage.BlobDeleted': 'blob.deleted',
        'Microsoft.Storage.BlobTierChanged': 'blob.tier_changed',
        'Microsoft.Storage.BlobRenamed': 'blob.renamed',
        'Microsoft.Storage.DirectoryCreated': 'directory.created',
        'Microsoft.Storage.DirectoryRenamed': 'directory.renamed',
        'Microsoft.Storage.DirectoryDeleted': 'directory.deleted',
        'Microsoft.Storage.LifecyclePolicyCompleted': 'lifecycle_policy.completed'
      };

      let eventType =
        typeMap[input.eventType] ??
        input.eventType.toLowerCase().replace('microsoft.storage.', '');

      return {
        type: eventType,
        id: input.eventId,
        output: {
          containerName,
          blobName,
          blobUrl: input.blobUrl,
          contentType: input.contentType,
          contentLength: input.contentLength,
          blobType: input.blobType,
          api: input.api,
          eventTime: input.eventTime,
          sequencer: input.sequencer
        }
      };
    }
  })
  .build();
