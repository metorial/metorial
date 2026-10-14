import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let importSubscribers = SlateTool.create(spec, {
  name: 'Import Subscribers',
  key: 'import_subscribers',
  description:
    'Import multiple subscribers into a list with optional custom field values. Returns imported, duplicate, and failed counts so you can check the import outcome. Call get_lists to discover list IDs.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      listId: z.string().describe('Subscriber list ID. Call get_lists to discover lists.'),
      subscribers: z
        .array(
          z.object({
            emailAddress: z.string().email().describe('Email address to import'),
            fields: z
              .record(z.string(), z.string())
              .optional()
              .describe('Custom field IDs or CustomField-prefixed keys mapped to values')
          })
        )
        .min(1)
        .describe('Subscribers to import into the list')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('List receiving the import'),
      totalImported: z.number().describe('Number of imported subscribers'),
      totalDuplicate: z.number().describe('Number of duplicate subscribers'),
      totalFailed: z.number().describe('Number of failed subscribers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain || ctx.config.subdomain
    });
    let result = await client.importSubscribers(ctx.input.listId, ctx.input.subscribers);
    let rawCounts = [result.TotalImported, result.TotalDuplicate, result.TotalFailed];
    if (
      !rawCounts.every(count => {
        if (typeof count !== 'number' && (typeof count !== 'string' || !/^\d+$/.test(count))) {
          return false;
        }
        return Number.isSafeInteger(Number(count)) && Number(count) >= 0;
      })
    ) {
      throw createApiServiceError(
        'Sendloop did not return valid import counts. Check the list before retrying the import.',
        { reason: 'invalid_response' }
      );
    }
    let totalImported = Number(result.TotalImported);
    let totalDuplicate = Number(result.TotalDuplicate);
    let totalFailed = Number(result.TotalFailed);
    return {
      output: { listId: ctx.input.listId, totalImported, totalDuplicate, totalFailed },
      message: `Imported **${totalImported}** subscriber(s); **${totalDuplicate}** duplicate(s) and **${totalFailed}** failure(s).`
    };
  })
  .build();
