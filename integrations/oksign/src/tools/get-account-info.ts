import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve OKSign account information including credit balance, team members, and email templates. Returns a combined view of account details useful for monitoring usage and managing team access.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeCredits: z
        .boolean()
        .optional()
        .describe('Include credit balance and storage info (default: true)'),
      includeUsers: z
        .boolean()
        .optional()
        .describe('Include team members list (default: true)'),
      includeEmailTemplates: z
        .boolean()
        .optional()
        .describe('Include email templates (default: false)')
    })
  )
  .output(
    z.object({
      credits: z.any().optional().describe('Credit balance and storage information'),
      users: z
        .array(z.any())
        .optional()
        .describe('List of team members with their roles and signer IDs'),
      emailTemplates: z.any().optional().describe('Email templates defined in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let includeCredits = ctx.input.includeCredits !== false;
    let includeUsers = ctx.input.includeUsers !== false;
    let includeEmailTemplates = ctx.input.includeEmailTemplates === true;

    let creditsResult = includeCredits ? await client.retrieveCredits() : undefined;
    let usersResult = includeUsers ? await client.retrieveUsers() : undefined;
    let emailTemplatesResult = includeEmailTemplates
      ? await client.retrieveEmailTemplates()
      : undefined;

    let usersList = usersResult
      ? Array.isArray(usersResult)
        ? (usersResult as any[])
        : []
      : undefined;

    let parts: string[] = [];
    if (creditsResult) parts.push(`Credits: ${JSON.stringify(creditsResult)}`);
    if (usersList) parts.push(`Team members: **${usersList.length}**`);
    if (emailTemplatesResult) parts.push('Email templates included');

    return {
      output: {
        credits: creditsResult,
        users: usersList,
        emailTemplates: emailTemplatesResult
      },
      message: parts.join(' | ')
    };
  })
  .build();

export let listActiveDocuments = SlateTool.create(spec, {
  name: 'List Active Documents',
  key: 'list_active_documents',
  description: `Retrieve a list of documents that are currently active (pending signatures) on the OKSign platform.`,
  constraints: ['Rate limited to 1 request per 3 minutes.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      activeDocuments: z
        .array(z.any())
        .describe('List of active documents awaiting signatures')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let activeDocuments = await client.getActiveDocuments();

    return {
      output: { activeDocuments },
      message: `Found **${activeDocuments.length}** active document(s).`
    };
  })
  .build();
