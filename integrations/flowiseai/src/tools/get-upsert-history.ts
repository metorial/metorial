import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let getUpsertHistory = SlateTool.create(spec, {
  name: 'Get Upsert History',
  key: 'get_upsert_history',
  description: `Retrieve the history of vector upsert operations for a chatflow. Useful for tracking when and what data was ingested into vector stores.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      chatflowId: z.string().describe('ID of the chatflow to get upsert history for'),
      order: z.enum(['ASC', 'DESC']).optional().describe('Sort order by date'),
      startDate: z.string().optional().describe('Filter records after this date (ISO 8601)'),
      endDate: z.string().optional().describe('Filter records before this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      records: z
        .array(
          z.object({
            recordId: z.string().describe('Unique upsert history record ID'),
            chatflowId: z.string().optional().describe('Associated chatflow ID'),
            result: z
              .string()
              .optional()
              .nullable()
              .describe('JSON string of the upsert result'),
            flowData: z
              .string()
              .optional()
              .nullable()
              .describe('JSON string of the flow data at time of upsert'),
            date: z.string().optional().describe('ISO 8601 date of the upsert operation')
          })
        )
        .describe('List of upsert history records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let { chatflowId, ...params } = ctx.input;
    let result = await client.getUpsertHistory(chatflowId, params);
    let records = Array.isArray(result) ? result : [];

    return {
      output: {
        records: records.map((r: any) => ({
          recordId: r.id,
          chatflowId: r.chatflowid,
          result: r.result,
          flowData: r.flowData,
          date: r.date
        }))
      },
      message: `Retrieved **${records.length}** upsert history record(s) for chatflow \`${chatflowId}\`.`
    };
  })
  .build();
