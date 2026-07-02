import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let caseUpdated = SlateTrigger.create(spec, {
  name: 'Case Created or Updated',
  key: 'case_updated',
  description:
    'Triggers when a case is created, updated, or closed in CommCare. Detects changes by polling for cases modified since the last check. Optionally filter by case type.'
})
  .input(
    z.object({
      caseId: z.string(),
      caseType: z.string(),
      caseName: z.string().optional(),
      closed: z.boolean(),
      ownerId: z.string(),
      dateOpened: z.string(),
      dateModified: z.string(),
      dateClosed: z.string().nullable(),
      serverDateModified: z.string(),
      properties: z.record(z.string(), z.any()),
      indices: z.record(z.string(), z.any()),
      userId: z.string()
    })
  )
  .output(
    z.object({
      caseId: z.string().describe('Unique identifier of the case'),
      caseType: z.string().describe('Type of the case (e.g., "patient", "household")'),
      caseName: z.string().optional().describe('Human-readable name of the case'),
      closed: z.boolean().describe('Whether the case is closed'),
      ownerId: z.string().describe('ID of the user or group that owns the case'),
      dateOpened: z.string().describe('Date the case was opened (ISO 8601)'),
      dateModified: z.string().describe('Date the case was last modified (ISO 8601)'),
      dateClosed: z.string().nullable().describe('Date the case was closed, or null if open'),
      serverDateModified: z
        .string()
        .describe('Server-side date of last modification (ISO 8601)'),
      properties: z.record(z.string(), z.any()).describe('All case properties'),
      indices: z
        .record(z.string(), z.any())
        .describe('Case relationships (indices) to other cases'),
      userId: z.string().describe('ID of the user who last modified the case')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        domain: ctx.config.domain,
        username: ctx.auth.username,
        token: ctx.auth.token
      });

      let lastServerDateModified = ctx.state?.lastServerDateModified as string | undefined;

      let params: Record<string, any> = {
        limit: 50
      };
      if (lastServerDateModified) {
        params.serverDateModifiedStart = lastServerDateModified;
      }

      let result = await client.listCases(params);

      let existingIds = new Set<string>((ctx.state?.seenIds as string[]) || []);
      let newCases = result.objects.filter(c => {
        let key = `${c.case_id}:${c.server_date_modified}`;
        return !existingIds.has(key);
      });

      if (newCases.length === 0) {
        return {
          inputs: [],
          updatedState: ctx.state
        };
      }

      let newLastDate = lastServerDateModified;
      for (let c of newCases) {
        if (!newLastDate || c.server_date_modified > newLastDate) {
          newLastDate = c.server_date_modified;
        }
      }

      let newIds = newCases.map(c => `${c.case_id}:${c.server_date_modified}`);
      let allSeenIds = [...newIds].slice(-200);

      return {
        inputs: newCases.map(c => ({
          caseId: c.case_id,
          caseType: c.case_type,
          caseName: c.properties?.case_name,
          closed: c.closed,
          ownerId: c.owner_id,
          dateOpened: c.date_opened,
          dateModified: c.date_modified,
          dateClosed: c.date_closed,
          serverDateModified: c.server_date_modified,
          properties: c.properties,
          indices: c.indices,
          userId: c.user_id
        })),
        updatedState: {
          lastServerDateModified: newLastDate,
          seenIds: allSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.closed ? 'case.closed' : 'case.updated';

      return {
        type: eventType,
        id: `${ctx.input.caseId}:${ctx.input.serverDateModified}`,
        output: {
          caseId: ctx.input.caseId,
          caseType: ctx.input.caseType,
          caseName: ctx.input.caseName,
          closed: ctx.input.closed,
          ownerId: ctx.input.ownerId,
          dateOpened: ctx.input.dateOpened,
          dateModified: ctx.input.dateModified,
          dateClosed: ctx.input.dateClosed,
          serverDateModified: ctx.input.serverDateModified,
          properties: ctx.input.properties,
          indices: ctx.input.indices,
          userId: ctx.input.userId
        }
      };
    }
  })
  .build();
