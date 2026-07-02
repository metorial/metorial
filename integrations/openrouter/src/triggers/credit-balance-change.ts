import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let creditBalanceChange = SlateTrigger.create(spec, {
  name: 'Credit Balance Change',
  key: 'credit_balance_change',
  description:
    'Triggers when the OpenRouter credit balance changes, indicating new usage or deposits. Polls periodically to detect changes in total credits or usage.'
})
  .input(
    z.object({
      changeType: z
        .enum(['usage_increased', 'credits_added', 'balance_changed'])
        .describe('Type of balance change detected'),
      changeId: z.string().describe('Unique identifier for this change event'),
      totalCredits: z.number().describe('Current total credits deposited'),
      totalUsage: z.number().describe('Current total usage consumed'),
      remainingCredits: z.number().describe('Current remaining credits'),
      previousTotalCredits: z.number().optional().describe('Previous total credits'),
      previousTotalUsage: z.number().optional().describe('Previous total usage')
    })
  )
  .output(
    z.object({
      totalCredits: z.number().describe('Current total credits deposited'),
      totalUsage: z.number().describe('Current total usage consumed'),
      remainingCredits: z.number().describe('Current remaining credits'),
      usageDelta: z.number().optional().describe('Change in usage since last check'),
      creditsDelta: z.number().optional().describe('Change in credits since last check'),
      changeType: z.string().describe('Type of balance change')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        siteUrl: ctx.config.siteUrl,
        appTitle: ctx.config.appTitle
      });

      let data = await client.getCredits();
      let remaining = data.totalCredits - data.totalUsage;

      let previousState = ctx.input.state as {
        totalCredits?: number;
        totalUsage?: number;
      } | null;

      let inputs: Array<{
        changeType: 'usage_increased' | 'credits_added' | 'balance_changed';
        changeId: string;
        totalCredits: number;
        totalUsage: number;
        remainingCredits: number;
        previousTotalCredits?: number;
        previousTotalUsage?: number;
      }> = [];

      if (previousState) {
        let creditsChanged = data.totalCredits !== previousState.totalCredits;
        let usageChanged = data.totalUsage !== previousState.totalUsage;

        if (creditsChanged || usageChanged) {
          let changeType: 'usage_increased' | 'credits_added' | 'balance_changed' =
            'balance_changed';
          if (usageChanged && !creditsChanged) {
            changeType = 'usage_increased';
          } else if (creditsChanged && !usageChanged) {
            changeType = 'credits_added';
          }

          inputs.push({
            changeType,
            changeId: `credit_change_${Date.now()}`,
            totalCredits: data.totalCredits,
            totalUsage: data.totalUsage,
            remainingCredits: remaining,
            previousTotalCredits: previousState.totalCredits,
            previousTotalUsage: previousState.totalUsage
          });
        }
      }

      return {
        inputs,
        updatedState: {
          totalCredits: data.totalCredits,
          totalUsage: data.totalUsage
        }
      };
    },

    handleEvent: async ctx => {
      let usageDelta =
        ctx.input.previousTotalUsage !== undefined
          ? ctx.input.totalUsage - ctx.input.previousTotalUsage
          : undefined;
      let creditsDelta =
        ctx.input.previousTotalCredits !== undefined
          ? ctx.input.totalCredits - ctx.input.previousTotalCredits
          : undefined;

      return {
        type: `credits.${ctx.input.changeType}`,
        id: ctx.input.changeId,
        output: {
          totalCredits: ctx.input.totalCredits,
          totalUsage: ctx.input.totalUsage,
          remainingCredits: ctx.input.remainingCredits,
          usageDelta,
          creditsDelta,
          changeType: ctx.input.changeType
        }
      };
    }
  })
  .build();
