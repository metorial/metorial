import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { readArray, validateOutput, validatePage } from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
  deposits: z.array(
    z.object({
      uid: z.string().describe('User identifier'),
      hash: z.string().describe('Deposit wallet address'),
      currency: z.string().describe('Cryptocurrency ID')
    })
  ),
  raw: z.array(z.unknown()).describe('Original deposit records with credentials removed')
});

export let listDeposits = SlateTool.create(spec, {
  name: 'List Deposit Addresses',
  key: 'list_deposit_addresses',
  description:
    'Retrieve a page of existing permanent deposit addresses for the current shop, optionally filtered by user identifier and cryptocurrency. Requires white-label processing.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      uid: z.string().optional().describe('Filter by your internal user identifier'),
      currency: z.string().optional().describe('Cryptocurrency ID or comma-separated IDs'),
      page: z
        .number()
        .optional()
        .describe('Page number, starting at 1; provider default is 1'),
      limit: z.number().optional().describe('Items per page; provider default is 20')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    validatePage(ctx.input.page, 'Page');
    validatePage(ctx.input.limit, 'Limit');
    let client = new PlisioClient({ token: ctx.auth.token });
    let result = readArray(await client.listDeposits(ctx.input));
    let output = validateOutput(outputSchema, {
      deposits: result.map(deposit => ({
        uid: deposit.uid,
        hash: deposit.hash,
        currency: deposit.psys_cid
      })),
      raw: result
    });
    return { output, message: `Retrieved ${output.deposits.length} deposit addresses.` };
  })
  .build();
