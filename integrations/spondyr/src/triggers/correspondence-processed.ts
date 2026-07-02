import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SpondyrClient } from '../lib/client';
import { spec } from '../spec';

export let correspondenceProcessed = SlateTrigger.create(spec, {
  name: 'Correspondence Processed',
  key: 'correspondence_processed',
  description:
    'Emits an event when a tracked correspondence has been processed successfully. Polls the Spondyr Status API to detect when the status becomes "OK".',
  instructions: [
    'You must provide at least one reference ID to track. Add reference IDs of correspondence you want to monitor.'
  ]
})
  .input(
    z.object({
      referenceId: z.string().describe('Reference ID of the correspondence'),
      apiStatus: z.string().describe('Current API status of the correspondence'),
      createdDate: z.string().describe('Date the correspondence was created'),
      transactionData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Associated transaction data')
    })
  )
  .output(
    z.object({
      referenceId: z.string().describe('Reference ID of the processed correspondence'),
      apiStatus: z.string().describe('Current status of the correspondence'),
      createdDate: z.string().describe('Date when the correspondence was created'),
      transactionData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Original transaction data snapshot')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SpondyrClient({
        token: ctx.auth.token,
        applicationToken: ctx.auth.applicationToken
      });

      let state =
        (ctx.state as {
          referenceIds?: string[];
          processedIds?: string[];
        }) ?? {};

      let referenceIds: string[] = state.referenceIds ?? [];
      let processedIds: string[] = state.processedIds ?? [];
      let inputs: Array<{
        referenceId: string;
        apiStatus: string;
        createdDate: string;
        transactionData?: Record<string, unknown>;
      }> = [];

      for (let refId of referenceIds) {
        if (processedIds.includes(refId)) {
          continue;
        }

        try {
          let status = await client.getCorrespondenceStatus({
            referenceId: refId,
            includeData: true
          });

          if (status.apiStatus === 'OK') {
            inputs.push({
              referenceId: status.referenceId,
              apiStatus: status.apiStatus,
              createdDate: status.createdDate,
              transactionData: status.transactionData
            });
            processedIds.push(refId);
          }
        } catch (err) {
          // If a status check fails, skip and retry next poll
          ctx.warn(`Failed to check status for reference ${refId}: ${err}`);
        }
      }

      return {
        inputs,
        updatedState: {
          referenceIds,
          processedIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'correspondence.processed',
        id: `${ctx.input.referenceId}-${ctx.input.apiStatus}`,
        output: {
          referenceId: ctx.input.referenceId,
          apiStatus: ctx.input.apiStatus,
          createdDate: ctx.input.createdDate,
          transactionData: ctx.input.transactionData
        }
      };
    }
  })
  .build();
