import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let listWorkersTool = SlateTool.create(spec, {
  name: 'List Workers',
  key: 'list_workers',
  description: `List all Workers scripts deployed on the account. Returns script names, modification dates, and usage model for each Worker.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .optional()
        .describe('Account ID (uses config accountId if not provided)')
    })
  )
  .output(
    z.object({
      workers: z.array(
        z.object({
          scriptName: z.string(),
          modifiedOn: z.string().optional(),
          createdOn: z.string().optional(),
          usageModel: z.string().optional(),
          compatibilityDate: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let accountId = ctx.input.accountId || ctx.config.accountId;
    if (!accountId) throw cloudflareServiceError('accountId is required');

    let client = new Client(ctx.auth);
    let response = await client.listWorkers(accountId);

    let workers = response.result.map((w: any) => ({
      scriptName: w.id,
      modifiedOn: w.modified_on,
      createdOn: w.created_on,
      usageModel: w.usage_model,
      compatibilityDate: w.compatibility_date
    }));

    return {
      output: { workers },
      message: `Found **${workers.length}** Worker script(s).`
    };
  })
  .build();
