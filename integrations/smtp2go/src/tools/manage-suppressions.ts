import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let viewSuppressions = SlateTool.create(spec, {
  name: 'View Suppressions',
  key: 'view_suppressions',
  description: `View the list of email addresses and domains that are suppressed from receiving emails. Suppressions include hard bounces, spam complaints, unsubscribes, and manually added entries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subaccountId: z.string().optional().describe('Subaccount ID'),
      continueToken: z.string().optional().describe('Token for the next page of suppressions'),
      emailAddress: z
        .string()
        .optional()
        .describe('Check a specific suppressed email address or domain')
    })
  )
  .output(
    z.object({
      suppressions: z
        .array(z.any())
        .describe('List of suppressed email addresses and domains'),
      continueToken: z.string().optional().describe('Token for the next page'),
      totalResults: z.number().optional().describe('Total number of matching suppressions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.viewSuppressions(ctx.input);
    let data = result.data || result;

    return {
      output: {
        suppressions: data.results ?? data.suppressions ?? [],
        continueToken: data.continue_token ?? undefined,
        totalResults: data.total_results
      },
      message: `Retrieved suppression list.`
    };
  })
  .build();

export let addSuppressions = SlateTool.create(spec, {
  name: 'Add Suppressions',
  key: 'add_suppressions',
  description: `Manually add email addresses or domains to the suppression list. Suppressed addresses will not receive any emails sent through your account.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      suppressions: z
        .array(z.string())
        .min(1)
        .describe('Email addresses or domains to suppress'),
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      suppressions: z.array(z.string()).describe('Updated suppression list entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.addSuppression(ctx.input);
    let data = result.data || result;

    return {
      output: {
        suppressions: data.suppressions ?? []
      },
      message: `Added **${data.suppressions?.length ?? 0}** suppression(s).`
    };
  })
  .build();

export let removeSuppressions = SlateTool.create(spec, {
  name: 'Remove Suppressions',
  key: 'remove_suppressions',
  description: `Remove selected suppression reasons for email addresses or domains. Reasons the provider refuses to remove can continue to prevent delivery; inspect the per-reason results.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      suppressions: z
        .array(z.string())
        .min(1)
        .describe('Email addresses or domains to unsuppress'),
      subaccountId: z.string().optional().describe('Subaccount ID'),
      reasons: z
        .array(z.string())
        .min(1)
        .optional()
        .describe(
          'Suppression reason types to remove; defaults to manual, spam, unsubscribe, bounce, and compliance'
        )
    })
  )
  .output(
    z.object({
      suppressions: z
        .array(z.string())
        .describe('Addresses with at least one confirmed suppression removed'),
      results: z
        .array(
          z.object({ emailAddress: z.string(), reason: z.string(), removed: z.boolean() })
        )
        .optional()
        .describe('Provider confirmation for each requested suppression reason')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.removeSuppression(ctx.input);
    let data = result.data || result;

    return {
      output: {
        suppressions: data.suppressions ?? [],
        results: data.results
      },
      message: `Removed suppressions for **${data.suppressions?.length ?? 0}** address(es) or domain(s).`
    };
  })
  .build();
