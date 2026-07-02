import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let _cellSchema = z.object({
  fieldId: z.string().describe('ID of the data set column'),
  value: z.union([z.string(), z.number(), z.null()]).optional().describe('Cell value')
});

export let dataSetEvents = SlateTrigger.create(spec, {
  name: 'Data Set Events',
  key: 'data_set_events',
  description: 'Triggers when data set records are added, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of the event (record_added, record_updated, record_deleted)'),
      eventId: z.string().describe('Unique ID for this event'),
      payload: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      eventType: z
        .string()
        .describe('Type of event: record.added, record.updated, or record.deleted'),
      recordId: z.string().describe('ID of the affected record'),
      dataSetId: z.string().describe('ID of the data set'),
      dataSetName: z.string().optional().describe('Name of the data set'),
      cells: z
        .record(z.string(), z.any())
        .optional()
        .describe('Cell values of the record keyed by field name'),
      createdDate: z.string().optional().describe('Record creation date'),
      updatedDate: z.string().optional().describe('Record last update date'),
      updatedByEmail: z.string().optional().describe('Email of the user who made the change'),
      updatedByUsername: z
        .string()
        .optional()
        .describe('Username of the user who made the change')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Data set webhook payloads have a flat structure
      let recordId = data.recordId || data.id || `unknown-${Date.now()}`;
      let eventId = `${recordId}-${Date.now()}`;

      // Determine event type from the webhook trigger type or data
      // Process Street data set webhooks are configured per event type
      // We infer from the presence/absence of data
      let eventType = 'record_updated'; // default
      if (data.type) {
        let typeMap: Record<string, string> = {
          RecordAdded: 'record_added',
          RecordUpdated: 'record_updated',
          RecordDeleted: 'record_deleted'
        };
        eventType = typeMap[data.type] || data.type;
      }

      return {
        inputs: [
          {
            eventType,
            eventId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, eventId, payload } = ctx.input;

      let typeMap: Record<string, string> = {
        record_added: 'record.added',
        record_updated: 'record.updated',
        record_deleted: 'record.deleted',
        RecordAdded: 'record.added',
        RecordUpdated: 'record.updated',
        RecordDeleted: 'record.deleted'
      };

      let normalizedType = typeMap[eventType] || `record.${eventType}`;

      return {
        type: normalizedType,
        id: eventId,
        output: {
          eventType: normalizedType,
          recordId: payload.recordId || payload.id,
          dataSetId: payload.dataSetId,
          dataSetName: payload.dataSetName,
          cells: payload.cells,
          createdDate: payload.audit?.createdDate,
          updatedDate: payload.audit?.updatedDate,
          updatedByEmail: payload.audit?.updatedBy?.email,
          updatedByUsername: payload.audit?.updatedBy?.username
        }
      };
    }
  })
  .build();
