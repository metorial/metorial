import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { EosGameServicesClient } from '../lib/client';
import { spec } from '../spec';

let eventTypeMap: Record<number, string> = {
  1: 'created',
  2: 'updated',
  3: 'deleted'
};

export let sanctionsSync = SlateTrigger.create(spec, {
  name: 'Sanctions Changed',
  key: 'sanctions_sync',
  description:
    'Triggers when sanctions are created, updated, or removed for your deployment. Uses the EOS sanctions sync API to incrementally detect changes.'
})
  .input(
    z.object({
      logId: z.string().describe('Unique log entry ID for this sanction event'),
      eventType: z.enum(['created', 'updated', 'deleted']).describe('Type of sanction change'),
      referenceId: z.string().describe('Sanction reference ID'),
      productUserId: z.string().describe('Sanctioned player Product User ID'),
      action: z.string().describe('Sanction action type'),
      justification: z.string().optional().describe('Reason for the sanction'),
      source: z.string().optional().describe('Source of the sanction'),
      tags: z.array(z.string()).optional().describe('Sanction tags'),
      timestamp: z.string().optional().describe('Sanction timestamp'),
      expirationTimestamp: z.string().nullable().optional().describe('Expiration timestamp'),
      pending: z.boolean().optional().describe('Whether the sanction is pending'),
      automated: z.boolean().optional().describe('Whether the sanction was automated'),
      metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata'),
      displayName: z.string().optional().describe('Player display name'),
      deploymentId: z.string().optional().describe('Deployment ID')
    })
  )
  .output(
    z.object({
      referenceId: z.string().describe('Sanction reference ID'),
      productUserId: z.string().describe('Sanctioned player Product User ID'),
      action: z.string().describe('Sanction action type (e.g. "ban", "mute")'),
      justification: z.string().optional().describe('Reason for the sanction'),
      source: z.string().optional().describe('Source of the sanction'),
      tags: z.array(z.string()).optional().describe('Sanction tags'),
      timestamp: z.string().optional().describe('When the sanction was created'),
      expirationTimestamp: z
        .string()
        .nullable()
        .optional()
        .describe('When the sanction expires, or null if permanent'),
      pending: z.boolean().optional().describe('Whether the sanction is pending'),
      automated: z.boolean().optional().describe('Whether the sanction was automated'),
      metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata'),
      displayName: z.string().optional().describe('Player display name'),
      deploymentId: z.string().optional().describe('Deployment ID')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new EosGameServicesClient({
        token: ctx.auth.token,
        deploymentId: ctx.config.deploymentId
      });

      let lastLogId = (ctx.state as any)?.lastLogId as string | undefined;
      let data = await client.syncSanctions(lastLogId);
      let elements = data.elements ?? [];

      let newLastLogId = lastLogId;
      if (elements.length > 0) {
        newLastLogId = elements[elements.length - 1].logId;
      }

      let inputs = elements.map((el: any) => ({
        logId: el.logId,
        eventType: (eventTypeMap[el.eventType] ?? 'created') as
          | 'created'
          | 'updated'
          | 'deleted',
        referenceId: el.referenceId,
        productUserId: el.productUserId,
        action: el.action,
        justification: el.justification,
        source: el.source,
        tags: el.tags,
        timestamp: el.timestamp,
        expirationTimestamp: el.expirationTimestamp,
        pending: el.pending,
        automated: el.automated,
        metadata: el.metadata,
        displayName: el.displayName,
        deploymentId: el.deploymentId
      }));

      return {
        inputs,
        updatedState: {
          lastLogId: newLastLogId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `sanction.${ctx.input.eventType}`,
        id: ctx.input.logId,
        output: {
          referenceId: ctx.input.referenceId,
          productUserId: ctx.input.productUserId,
          action: ctx.input.action,
          justification: ctx.input.justification,
          source: ctx.input.source,
          tags: ctx.input.tags,
          timestamp: ctx.input.timestamp,
          expirationTimestamp: ctx.input.expirationTimestamp,
          pending: ctx.input.pending,
          automated: ctx.input.automated,
          metadata: ctx.input.metadata,
          displayName: ctx.input.displayName,
          deploymentId: ctx.input.deploymentId
        }
      };
    }
  })
  .build();
