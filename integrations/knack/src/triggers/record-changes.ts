import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { KnackClient } from '../lib/client';
import { spec } from '../spec';

export let recordChanges = SlateTrigger.create(spec, {
  name: 'Record Changes',
  key: 'record_changes',
  description:
    'Triggers when records are created or updated in a Knack object. Polls the object for records sorted by modification date to detect changes.'
})
  .input(
    z.object({
      recordId: z.string().describe('ID of the changed record'),
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      objectKey: z.string().describe('Object key the record belongs to'),
      fields: z.record(z.string(), z.any()).describe('All field values of the record'),
      dateCreated: z.string().optional().describe('Record creation timestamp'),
      dateModified: z.string().optional().describe('Record last modification timestamp')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('ID of the changed record'),
      objectKey: z.string().describe('Object key the record belongs to'),
      fields: z.record(z.string(), z.any()).describe('All field values of the record'),
      dateCreated: z.string().optional().describe('Record creation timestamp'),
      dateModified: z.string().optional().describe('Record last modification timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let state = ctx.state as {
        knownRecordIds?: string[];
        lastModifiedTimestamps?: Record<string, string>;
        objectKey?: string;
      } | null;

      let client = new KnackClient({
        applicationId: ctx.config.applicationId,
        token: ctx.auth.token,
        authMode: ctx.auth.authMode
      });

      // Discover objects from metadata to know which object to poll
      let metadata = await client.getApplicationMetadata();
      let objects: any[] = metadata.objects || [];

      if (objects.length === 0) {
        return { inputs: [], updatedState: state || {} };
      }

      // Poll the first object, or continue with the previously tracked object
      let objectKey = state?.objectKey || objects[0]?.key;
      if (!objectKey) {
        return { inputs: [], updatedState: state || {} };
      }

      let knownRecordIds = new Set(state?.knownRecordIds || []);
      let lastModifiedTimestamps: Record<string, string> = state?.lastModifiedTimestamps || {};

      let result = await client.listObjectRecords(objectKey, {
        rowsPerPage: 100,
        sortField: 'date_modified' as any,
        sortOrder: 'desc'
      });

      let inputs: Array<{
        recordId: string;
        changeType: 'created' | 'updated';
        objectKey: string;
        fields: Record<string, any>;
        dateCreated: string | undefined;
        dateModified: string | undefined;
      }> = [];

      let newKnownIds: string[] = [];
      let newTimestamps: Record<string, string> = {};

      for (let record of result.records) {
        let recordId = record.id;
        if (!recordId) continue;

        newKnownIds.push(recordId);

        let dateModified = record.date_modified || record.field_date_modified || '';
        let dateCreated = record.date_created || record.field_date_created || '';
        newTimestamps[recordId] = dateModified;

        // On first poll, populate state without emitting events
        if (!state?.knownRecordIds) {
          continue;
        }

        if (!knownRecordIds.has(recordId)) {
          inputs.push({
            recordId,
            changeType: 'created',
            objectKey,
            fields: record,
            dateCreated,
            dateModified
          });
        } else if (
          lastModifiedTimestamps[recordId] &&
          lastModifiedTimestamps[recordId] !== dateModified
        ) {
          inputs.push({
            recordId,
            changeType: 'updated',
            objectKey,
            fields: record,
            dateCreated,
            dateModified
          });
        }
      }

      return {
        inputs,
        updatedState: {
          knownRecordIds: newKnownIds,
          lastModifiedTimestamps: newTimestamps,
          objectKey
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `record.${ctx.input.changeType}`,
        id: `${ctx.input.objectKey}-${ctx.input.recordId}-${ctx.input.dateModified || Date.now()}`,
        output: {
          recordId: ctx.input.recordId,
          objectKey: ctx.input.objectKey,
          fields: ctx.input.fields,
          dateCreated: ctx.input.dateCreated,
          dateModified: ctx.input.dateModified
        }
      };
    }
  })
  .build();
