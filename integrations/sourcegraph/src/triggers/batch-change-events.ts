import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let batchChangeEvents = SlateTrigger.create(spec, {
  name: 'Batch Change Events',
  key: 'batch_change_events',
  description:
    'Triggered when batch changes or their changesets are created, updated, closed, or deleted via Sourcegraph outgoing webhooks.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (e.g., batch_change:apply, changeset:update)'),
      eventId: z.string().describe('Unique identifier for this event'),
      batchChangeName: z.string().optional(),
      batchChangeId: z.string().optional(),
      batchChangeState: z.string().optional(),
      batchChangeUrl: z.string().optional(),
      namespace: z.string().optional(),
      changesetId: z.string().optional(),
      changesetTitle: z.string().optional(),
      changesetState: z.string().optional(),
      changesetExternalUrl: z.string().optional(),
      repositoryName: z.string().optional(),
      error: z.string().optional()
    })
  )
  .output(
    z.object({
      batchChangeName: z.string().optional().describe('Name of the batch change'),
      batchChangeId: z.string().optional().describe('GraphQL ID of the batch change'),
      batchChangeState: z.string().optional().describe('Current state of the batch change'),
      batchChangeUrl: z.string().optional().describe('URL to the batch change on Sourcegraph'),
      namespace: z.string().optional().describe('Owner namespace'),
      changesetId: z
        .string()
        .optional()
        .describe('GraphQL ID of the changeset (for changeset events)'),
      changesetTitle: z.string().optional().describe('Title of the changeset PR/MR'),
      changesetState: z.string().optional().describe('State of the changeset'),
      changesetExternalUrl: z
        .string()
        .optional()
        .describe('URL of the PR/MR on the code host'),
      repositoryName: z.string().optional().describe('Repository for the changeset'),
      error: z.string().optional().describe('Error message (for update_error events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Sourcegraph webhook payloads mirror GraphQL types
      // Determine event type from the payload structure
      let eventType = '';
      let inputs: any[] = [];

      if (body.batch_change || body.batchChange) {
        let bc = body.batch_change || body.batchChange;

        // Determine specific event type
        if (body.action === 'apply' || body.event === 'batch_change:apply') {
          eventType = 'batch_change:apply';
        } else if (body.action === 'close' || body.event === 'batch_change:close') {
          eventType = 'batch_change:close';
        } else if (body.action === 'delete' || body.event === 'batch_change:delete') {
          eventType = 'batch_change:delete';
        } else {
          eventType = body.event || body.action || 'batch_change:update';
        }

        inputs.push({
          eventType,
          eventId: `${eventType}-${bc.id || bc.name}-${Date.now()}`,
          batchChangeName: bc.name,
          batchChangeId: bc.id,
          batchChangeState: bc.state,
          batchChangeUrl: bc.url,
          namespace: bc.namespace?.username || bc.namespace?.name
        });
      } else if (body.changeset) {
        let cs = body.changeset;
        let isError =
          body.event === 'changeset:update_error' || body.action === 'update_error';
        eventType = isError ? 'changeset:update_error' : 'changeset:update';

        inputs.push({
          eventType,
          eventId: `${eventType}-${cs.id || cs.externalID}-${Date.now()}`,
          changesetId: cs.id,
          changesetTitle: cs.title,
          changesetState: cs.state,
          changesetExternalUrl: cs.externalURL?.url,
          repositoryName: cs.repository?.name,
          batchChangeId: cs.batchChangeID || cs.batchChange?.id,
          error: isError ? body.error || cs.error || 'Unknown error' : undefined
        });
      } else {
        // Generic event format - try to extract what we can
        eventType = body.event || body.type || 'unknown';
        inputs.push({
          eventType,
          eventId: `${eventType}-${Date.now()}`,
          batchChangeName: body.name,
          batchChangeId: body.id,
          batchChangeState: body.state
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          batchChangeName: ctx.input.batchChangeName,
          batchChangeId: ctx.input.batchChangeId,
          batchChangeState: ctx.input.batchChangeState,
          batchChangeUrl: ctx.input.batchChangeUrl,
          namespace: ctx.input.namespace,
          changesetId: ctx.input.changesetId,
          changesetTitle: ctx.input.changesetTitle,
          changesetState: ctx.input.changesetState,
          changesetExternalUrl: ctx.input.changesetExternalUrl,
          repositoryName: ctx.input.repositoryName,
          error: ctx.input.error
        }
      };
    }
  })
  .build();
