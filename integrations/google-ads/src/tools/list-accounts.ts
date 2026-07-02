import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `Lists all Google Ads customer accounts accessible to the authenticated user. Returns account IDs, names, currency, timezone, and status for each account. Useful for discovering which accounts can be managed and obtaining customer IDs needed for other operations.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleAdsActionScopes.listAccounts)
  .input(
    z.object({
      includeDetails: z
        .boolean()
        .optional()
        .describe(
          'If true, fetches detailed information (name, currency, timezone) for each account. If false, returns only resource names.'
        )
    })
  )
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            resourceName: z
              .string()
              .describe('Resource name in format customers/{customer_id}'),
            customerId: z.string().optional().describe('The customer account ID'),
            name: z.string().optional().describe('Descriptive name of the account'),
            currencyCode: z.string().optional().describe('Currency code (e.g., USD, EUR)'),
            timeZone: z.string().optional().describe('Account timezone'),
            isManager: z.boolean().optional().describe('Whether this is a manager account'),
            status: z.string().optional().describe('Account status')
          })
        )
        .describe('List of accessible accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let resourceNames = await client.listAccessibleCustomers();

    let accounts: {
      resourceName: string;
      customerId?: string;
      name?: string;
      currencyCode?: string;
      timeZone?: string;
      isManager?: boolean;
      status?: string;
    }[] = [];

    if (ctx.input.includeDetails) {
      for (let resourceName of resourceNames) {
        let customerId = resourceName.replace('customers/', '');
        try {
          let customer = await client.getCustomer(customerId);
          accounts.push({
            resourceName,
            customerId: customer.id?.toString(),
            name: customer.descriptiveName,
            currencyCode: customer.currencyCode,
            timeZone: customer.timeZone,
            isManager: customer.manager,
            status: customer.status
          });
        } catch {
          accounts.push({ resourceName, customerId });
        }
      }
    } else {
      accounts = resourceNames.map(rn => ({
        resourceName: rn,
        customerId: rn.replace('customers/', '')
      }));
    }

    return {
      output: { accounts },
      message: `Found **${accounts.length}** accessible Google Ads account(s).`
    };
  })
  .build();
