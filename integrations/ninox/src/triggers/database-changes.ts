import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let databaseChanges = SlateTrigger.create(spec, {
  name: 'Database Changes',
  key: 'database_changes',
  description:
    'Detects new, updated, and deleted records in a Ninox database using sequence-based change tracking. Requires `teamId` and `databaseId` to be set in the provider configuration.'
})
  .input(
    z.object({
      recordKey: z
        .string()
        .describe('Compound key of the record (tableId + recordId, e.g. "A1")'),
      changeType: z
        .enum(['created_or_updated', 'deleted'])
        .describe('Whether the record was created/updated or deleted'),
      recordData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Raw record data from the change payload'),
      databaseId: z.string().describe('ID of the database where the change occurred')
    })
  )
  .output(
    z.object({
      recordKey: z
        .string()
        .describe('Compound key of the record (tableId + recordId, e.g. "A1")'),
      tableId: z.string().describe('Table ID the record belongs to'),
      recordId: z.string().describe('Numeric record ID as a string'),
      changeType: z
        .enum(['created_or_updated', 'deleted'])
        .describe('Whether the record was created/updated or deleted'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Record field values (only present for created/updated records, uses field IDs as keys)'
        ),
      createdAt: z.string().optional().describe('Record creation timestamp'),
      createdBy: z.string().optional().describe('User who created the record'),
      modifiedAt: z.string().optional().describe('Last modification timestamp'),
      modifiedBy: z.string().optional().describe('User who last modified the record')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let teamId = ctx.config.teamId;
      let databaseId = ctx.config.databaseId;

      if (!teamId || !databaseId) {
        ctx.warn('teamId and databaseId must be set in configuration for change tracking.');
        return {
          inputs: []
        };
      }

      let client = new Client({
        baseUrl: ctx.config.baseUrl,
        token: ctx.auth.token
      });

      let sinceSq = (ctx.input.state as any)?.sinceSq ?? 0;
      let isFirstPoll = sinceSq === 0;

      let changes = await client.getDatabaseChanges(teamId, databaseId, sinceSq);

      if (isFirstPoll) {
        return {
          inputs: [],
          updatedState: {
            sinceSq: changes.seq
          }
        };
      }

      let inputs: Array<{
        recordKey: string;
        changeType: 'created_or_updated' | 'deleted';
        recordData?: Record<string, any>;
        databaseId: string;
      }> = [];

      for (let [key, data] of Object.entries(changes.updates || {})) {
        inputs.push({
          recordKey: key,
          changeType: 'created_or_updated',
          recordData: data as Record<string, any>,
          databaseId
        });
      }

      for (let key of changes.removes || []) {
        inputs.push({
          recordKey: key,
          changeType: 'deleted',
          databaseId
        });
      }

      return {
        inputs,
        updatedState: {
          sinceSq: changes.seq
        }
      };
    },
    handleEvent: async ctx => {
      let recordKey = ctx.input.recordKey;

      let tableIdMatch = recordKey.match(/^([A-Z]+)/);
      let tableId = tableIdMatch ? tableIdMatch[1]! : '';
      let recordId = recordKey.replace(/^[A-Z]+/, '');

      if (ctx.input.changeType === 'deleted') {
        return {
          type: 'record.deleted',
          id: `${ctx.input.databaseId}-${recordKey}-deleted-${Date.now()}`,
          output: {
            recordKey,
            tableId,
            recordId,
            changeType: 'deleted' as const
          }
        };
      }

      let data = ctx.input.recordData || {};
      let metaFields: Record<string, any> = {};
      let recordFields: Record<string, any> = {};

      for (let [k, v] of Object.entries(data)) {
        if (k.startsWith('_')) {
          metaFields[k] = v;
        } else {
          recordFields[k] = v;
        }
      }

      return {
        type: 'record.created_or_updated',
        id: `${ctx.input.databaseId}-${recordKey}-${metaFields._sq || Date.now()}`,
        output: {
          recordKey,
          tableId,
          recordId,
          changeType: 'created_or_updated' as const,
          fields: recordFields,
          createdAt: metaFields._cd,
          createdBy: metaFields._cu,
          modifiedAt: metaFields._md,
          modifiedBy: metaFields._mu
        }
      };
    }
  })
  .build();
