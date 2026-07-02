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
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      suppressions: z.array(z.any()).describe('List of suppressed email addresses and domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.viewSuppressions({
      subaccountId: ctx.input.subaccountId
    });
    let data = result.data || result;

    return {
      output: {
        suppressions: data.suppressions || data
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
      suppressions: z.array(z.string()).describe('Email addresses or domains to suppress'),
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
        suppressions: data.suppressions || ctx.input.suppressions
      },
      message: `Added **${ctx.input.suppressions.length}** suppression(s).`
    };
  })
  .build();

export let removeSuppressions = SlateTool.create(spec, {
  name: 'Remove Suppressions',
  key: 'remove_suppressions',
  description: `Remove email addresses or domains from the suppression list, allowing them to receive emails again.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      suppressions: z.array(z.string()).describe('Email addresses or domains to unsuppress'),
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      suppressions: z.array(z.string()).describe('Removed suppression entries')
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
        suppressions: data.suppressions || ctx.input.suppressions
      },
      message: `Removed **${ctx.input.suppressions.length}** suppression(s).`
    };
  })
  .build();
