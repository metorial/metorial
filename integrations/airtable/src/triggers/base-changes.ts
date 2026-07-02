import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let baseChangesTrigger = SlateTrigger.create(spec, {
  name: 'Base Changes',
  key: 'base_changes',
  description:
    'Listen for real-time changes in an Airtable base including record creates, updates, deletes, and schema changes (field and table modifications).'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of change event'),
      tableId: z.string().describe('Table ID where the change occurred'),
      changePayload: z.any().describe('Raw change data from Airtable'),
      transactionNumber: z.number().describe('Base transaction number'),
      timestamp: z.string().describe('Timestamp of the event'),
      source: z.string().describe('Source of the change')
    })
  )
  .output(
    z.object({
      tableId: z.string().describe('Table ID where the change occurred'),
      changeType: z
        .string()
        .describe(
          'Type of change (e.g. record.created, record.updated, record.deleted, field.created, field.updated, field.deleted)'
        ),
      transactionNumber: z.number().describe('Base transaction number for ordering'),
      timestamp: z.string().describe('Timestamp of the change'),
      source: z
        .string()
        .describe('Source of the change (e.g. client, publicApi, formSubmission)'),
      recordIds: z.array(z.string()).optional().describe('Affected record IDs'),
      fieldIds: z.array(z.string()).optional().describe('Affected field IDs'),
      changes: z.any().optional().describe('Detailed change data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseId: ctx.config.baseId
      });

      let result = await client.createWebhook(ctx.input.webhookBaseUrl, {
        options: {
          filters: {
            dataTypes: ['tableData', 'tableFields', 'tableMetadata']
          }
        }
      });

      return {
        registrationDetails: {
          webhookId: result.id,
          macSecret: result.macSecretBase64,
          expirationTime: result.expirationTime
        },
        state: {
          cursor: 1,
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseId: ctx.config.baseId
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseId: ctx.config.baseId
      });

      // The webhookId is stored in state during autoRegisterWebhook
      let webhookId = ctx.state?.webhookId;

      if (!webhookId) {
        ctx.warn('No webhook ID found in state');
        return { inputs: [] };
      }

      let cursor: number = ctx.state?.cursor ?? 1;
      let allInputs: any[] = [];

      // Airtable sends a lightweight ping; we must fetch actual payloads via API
      let mightHaveMore = true;
      while (mightHaveMore) {
        let payloadsResponse = await client.getWebhookPayloads(webhookId, cursor);

        for (let payload of payloadsResponse.payloads) {
          let changedTableIds = Object.keys(payload.changedTablesById || {});

          for (let tableId of changedTableIds) {
            let tableChanges = payload.changedTablesById[tableId];
            if (!tableChanges) continue;

            // Record creates
            if (tableChanges.createdRecordsById) {
              let recordIds = Object.keys(tableChanges.createdRecordsById);
              for (let recordId of recordIds) {
                allInputs.push({
                  eventType: 'record.created',
                  tableId,
                  changePayload: { recordId, ...tableChanges.createdRecordsById[recordId] },
                  transactionNumber: payload.baseTransactionNumber,
                  timestamp: payload.timestamp,
                  source: payload.actionMetadata?.source || 'unknown'
                });
              }
            }

            // Record updates
            if (tableChanges.changedRecordsById) {
              let recordIds = Object.keys(tableChanges.changedRecordsById);
              for (let recordId of recordIds) {
                allInputs.push({
                  eventType: 'record.updated',
                  tableId,
                  changePayload: { recordId, ...tableChanges.changedRecordsById[recordId] },
                  transactionNumber: payload.baseTransactionNumber,
                  timestamp: payload.timestamp,
                  source: payload.actionMetadata?.source || 'unknown'
                });
              }
            }

            // Record deletes
            if (tableChanges.destroyedRecordIds) {
              for (let recordId of tableChanges.destroyedRecordIds) {
                allInputs.push({
                  eventType: 'record.deleted',
                  tableId,
                  changePayload: { recordId },
                  transactionNumber: payload.baseTransactionNumber,
                  timestamp: payload.timestamp,
                  source: payload.actionMetadata?.source || 'unknown'
                });
              }
            }

            // Field creates
            if (tableChanges.createdFieldsById) {
              let fieldIds = Object.keys(tableChanges.createdFieldsById);
              for (let fieldId of fieldIds) {
                allInputs.push({
                  eventType: 'field.created',
                  tableId,
                  changePayload: { fieldId, ...tableChanges.createdFieldsById[fieldId] },
                  transactionNumber: payload.baseTransactionNumber,
                  timestamp: payload.timestamp,
                  source: payload.actionMetadata?.source || 'unknown'
                });
              }
            }

            // Field updates
            if (tableChanges.changedFieldsById) {
              let fieldIds = Object.keys(tableChanges.changedFieldsById);
              for (let fieldId of fieldIds) {
                allInputs.push({
                  eventType: 'field.updated',
                  tableId,
                  changePayload: { fieldId, ...tableChanges.changedFieldsById[fieldId] },
                  transactionNumber: payload.baseTransactionNumber,
                  timestamp: payload.timestamp,
                  source: payload.actionMetadata?.source || 'unknown'
                });
              }
            }

            // Field deletes
            if (tableChanges.destroyedFieldIds) {
              for (let fieldId of tableChanges.destroyedFieldIds) {
                allInputs.push({
                  eventType: 'field.deleted',
                  tableId,
                  changePayload: { fieldId },
                  transactionNumber: payload.baseTransactionNumber,
                  timestamp: payload.timestamp,
                  source: payload.actionMetadata?.source || 'unknown'
                });
              }
            }
          }
        }

        cursor = payloadsResponse.cursor;
        mightHaveMore = payloadsResponse.mightHaveMore;
      }

      return {
        inputs: allInputs,
        updatedState: {
          cursor,
          webhookId
        }
      };
    },

    handleEvent: async ctx => {
      let recordIds: string[] | undefined;
      let fieldIds: string[] | undefined;

      if (ctx.input.eventType.startsWith('record.')) {
        recordIds = [ctx.input.changePayload?.recordId].filter(Boolean);
      }
      if (ctx.input.eventType.startsWith('field.')) {
        fieldIds = [ctx.input.changePayload?.fieldId].filter(Boolean);
      }

      let uniqueId = `${ctx.input.transactionNumber}-${ctx.input.tableId}-${ctx.input.eventType}-${recordIds?.[0] || fieldIds?.[0] || 'unknown'}`;

      return {
        type: ctx.input.eventType,
        id: uniqueId,
        output: {
          tableId: ctx.input.tableId,
          changeType: ctx.input.eventType,
          transactionNumber: ctx.input.transactionNumber,
          timestamp: ctx.input.timestamp,
          source: ctx.input.source,
          recordIds,
          fieldIds,
          changes: ctx.input.changePayload
        }
      };
    }
  })
  .build();
