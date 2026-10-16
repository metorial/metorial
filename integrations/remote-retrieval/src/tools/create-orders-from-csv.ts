import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrdersFromCsv = SlateTool.create(spec, {
  name: 'Create Orders from CSV',
  key: 'create_orders_from_csv',
  description:
    'Create equipment return orders by uploading CSV content in the Remote Retrieval order template format.',
  instructions: [
    'Use the column names and structure from the CSV template at https://www.remoteretrieval.com/api-integration. Each row creates an order.',
    'This operation places orders. Review employee, company, equipment, and service details before submitting.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      csvContent: z.string().describe('Complete CSV text, including the template header row')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('The created order ID'),
      message: z.string().describe('Confirmation message from the API'),
      status: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).createOrderByCsv(
      ctx.input.csvContent
    );
    return {
      output: {
        orderId: String(result.order),
        message: result.message,
        status: result.status
      },
      message: `Created order **#${result.order}** from the CSV upload.`
    };
  })
  .build();
