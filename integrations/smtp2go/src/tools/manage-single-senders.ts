import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSingleSenders = SlateTool.create(spec, {
  name: 'List Single Sender Emails',
  key: 'list_single_senders',
  description: `List all individually verified sender email addresses. Single sender emails are used when you cannot verify an entire domain.`,
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
      singleSenders: z
        .array(z.any())
        .describe('List of verified single sender email addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.viewSingleSenders({
      subaccountId: ctx.input.subaccountId
    });
    let data = result.data || result;

    return {
      output: {
        singleSenders: data.single_sender_emails || data
      },
      message: `Retrieved single sender emails.`
    };
  })
  .build();

export let addSingleSender = SlateTool.create(spec, {
  name: 'Add Single Sender Email',
  key: 'add_single_sender',
  description: `Authorize an individual email address as a verified sender. Use this when you cannot verify an entire domain. Note: emails won't be DKIM-signed with your domain.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      emailAddress: z.string().describe('Email address to authorize as a sender'),
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      emailAddress: z.string().describe('Authorized email address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.addSingleSender(ctx.input);

    return {
      output: {
        emailAddress: ctx.input.emailAddress
      },
      message: `Single sender email **${ctx.input.emailAddress}** added.`
    };
  })
  .build();

export let removeSingleSender = SlateTool.create(spec, {
  name: 'Remove Single Sender Email',
  key: 'remove_single_sender',
  description: `Remove an individually verified sender email address. Emails can no longer be sent from this address after removal.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      emailAddress: z.string().describe('Email address to remove'),
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      emailAddress: z.string().describe('Removed email address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.removeSingleSender(ctx.input);

    return {
      output: {
        emailAddress: ctx.input.emailAddress
      },
      message: `Single sender email **${ctx.input.emailAddress}** removed.`
    };
  })
  .build();
