import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

export let indexUpdatedTrigger = SlateTrigger.create(spec, {
  name: 'Index Updated',
  key: 'index_updated',
  description:
    'Triggers when the Moz link index is updated with new data. Polls the index metadata endpoint to detect changes.'
})
  .input(
    z.object({
      indexId: z.string().describe('The new index ID'),
      previousIndexId: z.string().optional().describe('The previous index ID'),
      spamScoreUpdateDays: z.array(z.string()).optional().describe('Spam score update dates')
    })
  )
  .output(
    z.object({
      indexId: z.string().describe('The current index ID'),
      previousIndexId: z
        .string()
        .optional()
        .describe('The previous index ID before this update'),
      spamScoreUpdateDays: z
        .array(z.string())
        .optional()
        .describe('Dates when spam scores were updated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MozClient({ token: ctx.auth.token });

      let metadata = await client.getIndexMetadata();
      let currentIndexId = metadata?.index_id;
      let previousIndexId = ctx.state?.lastIndexId;

      if (!currentIndexId) {
        return { inputs: [], updatedState: ctx.state };
      }

      if (previousIndexId && currentIndexId !== previousIndexId) {
        return {
          inputs: [
            {
              indexId: currentIndexId,
              previousIndexId,
              spamScoreUpdateDays: metadata?.spam_score_update_days
            }
          ],
          updatedState: {
            lastIndexId: currentIndexId
          }
        };
      }

      return {
        inputs: [],
        updatedState: {
          lastIndexId: currentIndexId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'index.updated',
        id: ctx.input.indexId,
        output: {
          indexId: ctx.input.indexId,
          previousIndexId: ctx.input.previousIndexId,
          spamScoreUpdateDays: ctx.input.spamScoreUpdateDays
        }
      };
    }
  })
  .build();
