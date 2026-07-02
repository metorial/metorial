import { SlateTool } from 'slates';
import { z } from 'zod';
import { MockServiceClient } from '../lib/mock-client';
import { spec } from '../spec';

export let manageMockTransaction = SlateTool.create(spec, {
  name: 'Manage Mock Transaction',
  key: 'manage_mock_transaction',
  description: `List, create, or delete transactions within a virtual service. Transactions define request-response pairs that the mock service will use to respond to incoming requests.`,
  instructions: [
    'Use "list" with **serviceId** to see existing transactions.',
    'Use "create" to add a new request-response pair to a virtual service.',
    'Use "delete" to remove a transaction by its ID.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Operation to perform'),
      serviceId: z.number().describe('Virtual service ID'),
      transactionId: z.number().optional().describe('Transaction ID (required for delete)'),
      name: z.string().optional().describe('Transaction name (required for create)'),
      requestMethod: z
        .string()
        .optional()
        .describe('HTTP method (GET, POST, PUT, DELETE, etc.)'),
      requestUrl: z.string().optional().describe('Request URL pattern to match'),
      requestHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Request headers to match'),
      requestBody: z.string().optional().describe('Request body to match'),
      responseStatusCode: z
        .number()
        .optional()
        .describe('HTTP status code of the mock response'),
      responseHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Response headers'),
      responseBody: z.string().optional().describe('Response body content')
    })
  )
  .output(
    z.object({
      transactions: z
        .array(
          z.object({
            transactionId: z.number().describe('Transaction ID'),
            name: z.string().describe('Transaction name')
          })
        )
        .optional()
        .describe('List of transactions'),
      transactionId: z.number().optional().describe('Created/deleted transaction ID'),
      name: z.string().optional().describe('Transaction name'),
      deleted: z.boolean().optional().describe('Whether the transaction was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MockServiceClient({
      token: ctx.auth.token,
      apiKeyId: ctx.auth.apiKeyId,
      apiKeySecret: ctx.auth.apiKeySecret
    });

    if (ctx.input.action === 'list') {
      let transactions = await client.listTransactions(ctx.input.serviceId);
      let mapped = transactions.map((t: any) => ({
        transactionId: t.id,
        name: t.name
      }));
      return {
        output: { transactions: mapped },
        message: `Found **${mapped.length}** transaction(s) in service ${ctx.input.serviceId}.`
      };
    }

    if (ctx.input.action === 'create') {
      if (
        !ctx.input.name ||
        !ctx.input.requestMethod ||
        !ctx.input.requestUrl ||
        ctx.input.responseStatusCode === undefined
      ) {
        throw new Error(
          'name, requestMethod, requestUrl, and responseStatusCode are required to create a transaction'
        );
      }
      let transaction = await client.createTransaction(ctx.input.serviceId, {
        name: ctx.input.name,
        request: {
          method: ctx.input.requestMethod,
          url: ctx.input.requestUrl,
          headers: ctx.input.requestHeaders,
          body: ctx.input.requestBody
        },
        response: {
          statusCode: ctx.input.responseStatusCode,
          headers: ctx.input.responseHeaders,
          body: ctx.input.responseBody
        }
      });
      return {
        output: { transactionId: transaction.id, name: transaction.name },
        message: `Created transaction **${transaction.name}** (ID: ${transaction.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.transactionId)
        throw new Error('transactionId is required for deleting a transaction');
      await client.deleteTransaction(ctx.input.serviceId, ctx.input.transactionId);
      return {
        output: { transactionId: ctx.input.transactionId, deleted: true },
        message: `Deleted transaction **${ctx.input.transactionId}** from service ${ctx.input.serviceId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
