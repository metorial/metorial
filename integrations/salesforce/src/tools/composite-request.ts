import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let compositeRequest = SlateTool.create(spec, {
  name: 'Composite Request',
  key: 'composite_request',
  description: `Execute multiple API subrequests in a single call using the Salesforce Composite API. Supports three modes:
- **composite**: Execute a sequence of subrequests where later requests can reference results of earlier ones.
- **tree**: Create a parent record and its related child records in a single request.
- **collection**: Perform batch CRUD operations on up to 200 records of the same type.`,
  instructions: [
    'In composite mode, use reference IDs to pass data between subrequests (e.g., @{refId.id}).',
    'Tree mode is useful for creating Account + Contacts + Opportunities in one call.',
    'Collection mode supports batch create, update, or delete of up to 200 records.'
  ],
  constraints: [
    'Composite requests can contain up to 25 subrequests.',
    'sObject Collections can process up to 200 records per request.'
  ]
})
  .input(
    z.object({
      mode: z
        .enum(['composite', 'tree', 'collection'])
        .describe('The composite operation mode to use'),
      allOrNone: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, all subrequests must succeed or all will be rolled back'),

      subrequests: z
        .array(
          z.object({
            method: z
              .enum(['GET', 'POST', 'PATCH', 'DELETE'])
              .describe('HTTP method for this subrequest'),
            url: z
              .string()
              .describe(
                'The API URL for this subrequest (e.g., /services/data/v62.0/sobjects/Account)'
              ),
            referenceId: z.string().describe('Unique reference ID for this subrequest'),
            body: z.any().optional().describe('Request body for POST/PATCH subrequests')
          })
        )
        .optional()
        .describe('Subrequests for composite mode'),

      treeObjectType: z
        .string()
        .optional()
        .describe('Object type for tree mode (e.g., Account)'),
      treeRecords: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Records with nested children for tree mode'),

      collectionMethod: z
        .enum(['POST', 'PATCH', 'DELETE'])
        .optional()
        .describe('Operation for collection mode'),
      collectionRecords: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Records for collection mode (must include "attributes" with "type" for POST/PATCH)'
        )
    })
  )
  .output(
    z.object({
      compositeResponse: z.any().describe('Full response from the composite operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    let result: any;

    if (ctx.input.mode === 'composite') {
      if (!ctx.input.subrequests || ctx.input.subrequests.length === 0) {
        throw new Error('subrequests are required for composite mode');
      }
      result = await client.composite({
        allOrNone: ctx.input.allOrNone ?? false,
        compositeRequest: ctx.input.subrequests
      });
      return {
        output: { compositeResponse: result },
        message: `Executed **${ctx.input.subrequests.length}** composite subrequests`
      };
    }

    if (ctx.input.mode === 'tree') {
      if (!ctx.input.treeObjectType || !ctx.input.treeRecords) {
        throw new Error('treeObjectType and treeRecords are required for tree mode');
      }
      result = await client.compositeTree(ctx.input.treeObjectType, ctx.input.treeRecords);
      return {
        output: { compositeResponse: result },
        message: `Created **${ctx.input.treeObjectType}** record tree with ${result.results?.length || 0} records`
      };
    }

    if (ctx.input.mode === 'collection') {
      if (!ctx.input.collectionMethod || !ctx.input.collectionRecords) {
        throw new Error(
          'collectionMethod and collectionRecords are required for collection mode'
        );
      }
      result = await client.compositeCollection(
        ctx.input.collectionMethod,
        ctx.input.collectionRecords,
        ctx.input.allOrNone ?? false
      );
      return {
        output: { compositeResponse: result },
        message: `Executed collection ${ctx.input.collectionMethod} on **${ctx.input.collectionRecords.length}** records`
      };
    }

    throw new Error(`Unknown mode: ${ctx.input.mode}`);
  })
  .build();
