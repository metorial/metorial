import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tmsCheckSummarySchema = z.object({
  checkId: z.number().describe('Transaction check ID'),
  name: z.string().optional().describe('Check name'),
  type: z.string().optional().describe('Check type'),
  active: z.boolean().optional().describe('Whether the check is active'),
  status: z.string().optional().describe('Current status'),
  createdAt: z.number().optional().describe('Creation timestamp (Unix epoch)'),
  modifiedAt: z.number().optional().describe('Last modification timestamp (Unix epoch)'),
  interval: z.number().optional().describe('Check interval in minutes'),
  region: z.string().optional().describe('Region where the check runs'),
  tags: z.array(z.string()).optional().describe('Tags')
});

export let listTmsChecks = SlateTool.create(spec, {
  name: 'List Transaction Checks',
  key: 'list_tms_checks',
  description: `Lists all transaction monitoring (TMS) checks. Transaction checks test multi-step workflows like shopping carts, login flows, and registration forms.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tags: z.string().optional().describe('Comma-separated tags to filter by'),
      type: z.string().optional().describe('Filter by check type: "script" or "recording"'),
      limit: z.number().optional().describe('Maximum results'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      checks: z.array(tmsCheckSummarySchema).describe('List of transaction checks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.listTmsChecks({
      tags: ctx.input.tags,
      type: ctx.input.type,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      extended_tags: true
    });

    let checks = (result.checks || []).map((c: any) => ({
      checkId: c.id,
      name: c.name,
      type: c.type,
      active: c.active,
      status: c.status,
      createdAt: c.created_at,
      modifiedAt: c.modified_at,
      interval: c.interval,
      region: c.region,
      tags: c.tags
    }));

    return {
      output: { checks },
      message: `Found **${checks.length}** transaction check(s).`
    };
  })
  .build();

export let getTmsCheck = SlateTool.create(spec, {
  name: 'Get Transaction Check',
  key: 'get_tms_check',
  description: `Retrieves detailed information about a specific transaction monitoring (TMS) check, including its full configuration and steps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      checkId: z.number().describe('ID of the transaction check')
    })
  )
  .output(
    z.object({
      checkId: z.number().describe('Transaction check ID'),
      name: z.string().optional().describe('Check name'),
      type: z.string().optional().describe('Check type'),
      active: z.boolean().optional().describe('Whether the check is active'),
      status: z.string().optional().describe('Current status'),
      interval: z.number().optional().describe('Check interval in minutes'),
      region: z.string().optional().describe('Region'),
      tags: z.array(z.string()).optional().describe('Tags'),
      steps: z.array(z.any()).optional().describe('Transaction check steps'),
      contactIds: z.array(z.number()).optional().describe('Contact IDs'),
      teamIds: z.array(z.number()).optional().describe('Team IDs'),
      integrationIds: z.array(z.number()).optional().describe('Integration IDs'),
      customMessage: z.string().optional().describe('Custom alert message'),
      metadata: z.any().optional().describe('Additional check metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.getTmsCheck(ctx.input.checkId);
    let c = result.check || result;

    return {
      output: {
        checkId: c.id,
        name: c.name,
        type: c.type,
        active: c.active,
        status: c.status,
        interval: c.interval,
        region: c.region,
        tags: c.tags,
        steps: c.steps,
        contactIds: c.contact_ids,
        teamIds: c.team_ids,
        integrationIds: c.integration_ids,
        customMessage: c.custom_message,
        metadata: c.metadata
      },
      message: `Retrieved transaction check **${c.name || ctx.input.checkId}**.`
    };
  })
  .build();

export let deleteTmsCheck = SlateTool.create(spec, {
  name: 'Delete Transaction Check',
  key: 'delete_tms_check',
  description: `Permanently deletes a transaction monitoring (TMS) check. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      checkId: z.number().describe('ID of the transaction check to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.deleteTmsCheck(ctx.input.checkId);

    return {
      output: { message: result.message || 'Transaction check deleted successfully' },
      message: `Deleted transaction check **${ctx.input.checkId}**.`
    };
  })
  .build();
