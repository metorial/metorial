import { SlateTool } from 'slates';
import { z } from 'zod';
import { finagoServiceError } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import { getNumber, getString } from '../lib/records';
import { spec } from '../spec';

let accountSchema = z.object({
  id: z.number().optional().describe('Finago account ID returned by the accounts API.'),
  accountId: z.number().optional().describe('Alias of id for downstream account inputs.'),
  number: z.number().optional().describe('Chart-of-accounts number.'),
  name: z.string().optional().describe('Account name.'),
  taxId: z.number().optional().describe('Default tax code ID for the account.'),
  record: z.unknown().describe('Raw Finago account record.')
});

let mapAccount = (record: unknown) => {
  let id = getNumber(record, 'id');

  return {
    id,
    accountId: id,
    number: getNumber(record, 'number'),
    name: getString(record, 'name'),
    taxId: getNumber(record, 'taxId'),
    record
  };
};

export let finagoListAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'finago_list_accounts',
  description:
    'List Finago chart-of-accounts records and optionally search by account number or name. Use this before posting transactions or choosing sales order revenue accounts.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search text matched against account name or account number.'),
      accountId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Read one account by Finago account ID instead of listing accounts.')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountSchema).describe('Accounts returned by Finago.'),
      count: z.number().describe('Number of accounts returned.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.accountId !== undefined && ctx.input.query !== undefined) {
      throw finagoServiceError(
        'query is only supported when listing accounts; omit accountId to search accounts.'
      );
    }

    let client = createClientFromContext(ctx);
    let records =
      ctx.input.accountId !== undefined
        ? [await client.get(`/accounts/${ctx.input.accountId}`, undefined, 'read account')]
        : (await client.list('/accounts', { query: ctx.input.query }, 1, 'list accounts'))
            .records;
    let accounts = records.map(mapAccount);

    return {
      output: { accounts, count: accounts.length },
      message: `Retrieved **${accounts.length}** Finago account(s).`
    };
  })
  .build();
