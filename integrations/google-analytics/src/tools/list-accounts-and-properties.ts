import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnalyticsAdminClient } from '../lib/client';
import { accountIdSchema } from '../lib/properties';
import { googleAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

export let listAccountsAndProperties = SlateTool.create(spec, {
  name: 'List Accounts and Properties',
  key: 'list_accounts_and_properties',
  description: `List Google Analytics accounts accessible to the authenticated user and their GA4 properties. Useful for discovering available accounts and property IDs to use with other tools.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleAnalyticsActionScopes.listAccountsAndProperties)
  .input(
    z.object({
      accountId: accountIdSchema
        .optional()
        .describe(
          'If provided, lists detailed properties for this specific account. Accepts either "123456" or "accounts/123456". Otherwise, lists all accessible account summaries and property summaries.'
        ),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per Google API page (default: 200, max: 200).'),
      pageToken: z
        .string()
        .optional()
        .describe(
          'Page token for pagination. If omitted when listing all account summaries, the tool automatically reads all available pages.'
        )
    })
  )
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            name: z
              .string()
              .optional()
              .describe('Resource name of the account (e.g., "accounts/123456").'),
            displayName: z.string().optional(),
            regionCode: z.string().optional(),
            createTime: z.string().optional(),
            updateTime: z.string().optional()
          })
        )
        .optional()
        .describe('List of GA accounts.'),
      properties: z
        .array(
          z.object({
            name: z
              .string()
              .optional()
              .describe('Resource name of the property (e.g., "properties/987654").'),
            displayName: z.string().optional(),
            propertyType: z.string().optional(),
            parent: z.string().optional().describe('Parent account resource name.'),
            timeZone: z.string().optional(),
            currencyCode: z.string().optional(),
            industryCategory: z.string().optional(),
            serviceLevel: z.string().optional(),
            createTime: z.string().optional(),
            updateTime: z.string().optional()
          })
        )
        .optional()
        .describe('List of GA4 properties.'),
      accountSummaries: z
        .array(
          z.object({
            name: z.string().optional().describe('Resource name of the account summary.'),
            account: z.string().optional().describe('Resource name of the account.'),
            displayName: z.string().optional(),
            propertySummaries: z
              .array(
                z.object({
                  property: z.string().optional().describe('Resource name of the property.'),
                  displayName: z.string().optional(),
                  propertyType: z.string().optional(),
                  parent: z.string().optional()
                })
              )
              .optional()
          })
        )
        .optional()
        .describe('Account summaries with child property summaries.'),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnalyticsAdminClient({
      token: ctx.auth.token
    });

    if (ctx.input.accountId) {
      let result = await client.listProperties({
        accountId: ctx.input.accountId,
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      });
      let properties = result.properties || [];
      return {
        output: {
          properties,
          nextPageToken: result.nextPageToken
        },
        message: `Found **${properties.length}** GA4 propert${properties.length === 1 ? 'y' : 'ies'} for account ${ctx.input.accountId}.`
      };
    }

    let accountSummaries: any[] = [];
    let pageToken = ctx.input.pageToken;
    let nextPageToken: string | undefined;

    do {
      let result = await client.listAccountSummaries({
        pageSize: ctx.input.pageSize ?? 200,
        pageToken
      });
      accountSummaries.push(...(result.accountSummaries || []));
      nextPageToken = result.nextPageToken;
      pageToken = nextPageToken;
    } while (!ctx.input.pageToken && pageToken);

    let accounts = accountSummaries.map((summary: any) => ({
      name: summary.account,
      displayName: summary.displayName
    }));
    let properties = accountSummaries.flatMap((summary: any) =>
      (summary.propertySummaries || []).map((property: any) => ({
        name: property.property,
        displayName: property.displayName,
        propertyType: property.propertyType,
        parent: property.parent || summary.account
      }))
    );
    return {
      output: {
        accounts,
        properties,
        accountSummaries,
        nextPageToken
      },
      message: `Found **${accounts.length}** Google Analytics account(s) and **${properties.length}** GA4 propert${properties.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();
