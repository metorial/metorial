import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let inputSchema = z.object({
  estimateId: z.string(),
  estimateNumber: z.string().optional(),
  status: z.string().optional(),
  customerName: z.string().optional(),
  customerId: z.string().optional(),
  date: z.string().optional(),
  expiryDate: z.string().optional(),
  total: z.number().optional(),
  currencyCode: z.string().optional(),
  createdTime: z.string()
});

let outputSchema = z.object({
  estimateId: z.string(),
  estimateNumber: z.string().optional(),
  status: z.string().optional(),
  customerName: z.string().optional(),
  customerId: z.string().optional(),
  date: z.string().optional(),
  expiryDate: z.string().optional(),
  total: z.number().optional(),
  currencyCode: z.string().optional(),
  createdTime: z.string()
});

export let newEstimate = SlateTrigger.create(spec, {
  name: 'New Estimate',
  key: 'new_estimate',
  description:
    'Triggers when a new estimate is created in Zoho Invoice. Polls for recently created estimates.'
})
  .input(inputSchema)
  .output(outputSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId,
        region: ctx.auth.region
      });

      let state = ctx.state as { lastCreatedTime?: string } | null;
      let lastCreatedTime = state?.lastCreatedTime;

      let result = await client.listEstimates({
        sort_column: 'created_time',
        sort_order: 'D',
        per_page: 25
      });

      let estimates = result.estimates ?? [];
      let inputs: any[] = [];
      let newestCreatedTime = lastCreatedTime;

      for (let est of estimates) {
        let createdTime = est.created_time;
        if (!createdTime) continue;
        if (lastCreatedTime && createdTime <= lastCreatedTime) continue;

        inputs.push({
          estimateId: est.estimate_id,
          estimateNumber: est.estimate_number,
          status: est.status,
          customerName: est.customer_name,
          customerId: est.customer_id,
          date: est.date,
          expiryDate: est.expiry_date,
          total: est.total,
          currencyCode: est.currency_code,
          createdTime
        });

        if (!newestCreatedTime || createdTime > newestCreatedTime) {
          newestCreatedTime = createdTime;
        }
      }

      return {
        inputs,
        updatedState: {
          lastCreatedTime: newestCreatedTime || lastCreatedTime
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'estimate.created',
        id: ctx.input.estimateId,
        output: {
          estimateId: ctx.input.estimateId,
          estimateNumber: ctx.input.estimateNumber,
          status: ctx.input.status,
          customerName: ctx.input.customerName,
          customerId: ctx.input.customerId,
          date: ctx.input.date,
          expiryDate: ctx.input.expiryDate,
          total: ctx.input.total,
          currencyCode: ctx.input.currencyCode,
          createdTime: ctx.input.createdTime
        }
      };
    }
  })
  .build();
