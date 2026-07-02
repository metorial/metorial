import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let viewAllowedSenders = SlateTool.create(spec, {
  name: 'View Allowed Senders',
  key: 'view_allowed_senders',
  description: `View the list of email addresses and domains that are allowed (or disallowed) as senders in your account. This is part of the Restrict Senders feature.`,
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
      allowedSenders: z.array(z.string()).describe('List of allowed sender addresses/domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.viewAllowedSenders({
      subaccountId: ctx.input.subaccountId
    });
    let data = result.data || result;

    return {
      output: {
        allowedSenders: data.allowed_senders || []
      },
      message: `Retrieved allowed senders list.`
    };
  })
  .build();

export let updateAllowedSenders = SlateTool.create(spec, {
  name: 'Update Allowed Senders',
  key: 'update_allowed_senders',
  description: `Add, remove, or replace the allowed senders list. Use **action** to control whether to add entries to the list, remove entries from the list, or replace the entire list.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add', 'remove', 'replace'])
        .describe('Whether to add to, remove from, or replace the allowed senders list'),
      senders: z.array(z.string()).describe('Email addresses or domains'),
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      allowedSenders: z.array(z.string()).describe('Updated allowed senders list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result: any;
    if (ctx.input.action === 'add') {
      result = await client.addAllowedSenders({
        allowedSenders: ctx.input.senders,
        subaccountId: ctx.input.subaccountId
      });
    } else if (ctx.input.action === 'remove') {
      result = await client.removeAllowedSenders({
        allowedSenders: ctx.input.senders,
        subaccountId: ctx.input.subaccountId
      });
    } else {
      result = await client.updateAllowedSenders({
        allowedSenders: ctx.input.senders,
        subaccountId: ctx.input.subaccountId
      });
    }

    let data = result.data || result;

    return {
      output: {
        allowedSenders: data.allowed_senders || ctx.input.senders
      },
      message: `Allowed senders list updated (${ctx.input.action}).`
    };
  })
  .build();
