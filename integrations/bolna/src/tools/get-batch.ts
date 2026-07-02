import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBatch = SlateTool.create(spec, {
  name: 'Get Batch',
  key: 'get_batch',
  description: `Retrieve details of a batch calling campaign including its status, contact counts, and execution progress. Can also list all batches for an agent.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      batchId: z.string().optional().describe('Batch ID to get details for a specific batch'),
      agentId: z.string().optional().describe('Agent ID to list all batches for an agent')
    })
  )
  .output(
    z.object({
      batches: z
        .array(
          z.object({
            batchId: z.string().describe('Batch ID'),
            status: z.string().optional().describe('Batch status'),
            fileName: z.string().optional().describe('Uploaded CSV file name'),
            validContacts: z.number().optional().describe('Number of valid contacts'),
            totalContacts: z.number().optional().describe('Total contacts in the file'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            scheduledAt: z.string().optional().describe('Scheduled execution time'),
            fromPhoneNumber: z.string().optional().describe('Caller phone number'),
            executionStatus: z
              .record(z.string(), z.number())
              .optional()
              .describe('Breakdown of execution statuses')
          })
        )
        .describe('Batch details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.batchId) {
      let batch = await client.getBatch(ctx.input.batchId);
      return {
        output: {
          batches: [
            {
              batchId: batch.batch_id,
              status: batch.status,
              fileName: batch.file_name,
              validContacts: batch.valid_contacts,
              totalContacts: batch.total_contacts,
              createdAt: batch.created_at,
              scheduledAt: batch.scheduled_at,
              fromPhoneNumber: batch.from_phone_number,
              executionStatus: batch.execution_status
            }
          ]
        },
        message: `Batch \`${batch.batch_id}\`: status **${batch.status}**, ${batch.valid_contacts || 0}/${batch.total_contacts || 0} valid contacts.`
      };
    }

    if (ctx.input.agentId) {
      let batches = await client.listBatches(ctx.input.agentId);
      let batchList = Array.isArray(batches) ? batches : [];

      return {
        output: {
          batches: batchList.map((b: any) => ({
            batchId: b.batch_id,
            status: b.status,
            fileName: b.file_name,
            validContacts: b.valid_contacts,
            totalContacts: b.total_contacts,
            createdAt: b.created_at,
            scheduledAt: b.scheduled_at,
            fromPhoneNumber: b.from_phone_number,
            executionStatus: b.execution_status
          }))
        },
        message: `Found **${batchList.length}** batch(es) for agent \`${ctx.input.agentId}\`.`
      };
    }

    return {
      output: { batches: [] },
      message: 'No batchId or agentId provided. Please specify one.'
    };
  })
  .build();
