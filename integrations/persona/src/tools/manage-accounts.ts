import { SlateTool } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let createAccount = SlateTool.create(spec, {
  name: 'Create Account',
  key: 'create_account',
  description: `Create a new Persona account representing a unique individual. Accounts consolidate all inquiries, verifications, and reports for a person.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      referenceId: z
        .string()
        .optional()
        .describe('Your internal reference ID for this account'),
      nameFirst: z.string().optional().describe('First name'),
      nameLast: z.string().optional().describe('Last name'),
      emailAddress: z.string().optional().describe('Email address'),
      phoneNumber: z.string().optional().describe('Phone number'),
      tags: z.array(z.string()).optional().describe('Initial tags for the account')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('Persona account ID'),
      referenceId: z.string().optional().describe('Your reference ID'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full account attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.createAccount({
      referenceId: ctx.input.referenceId,
      nameFirst: ctx.input.nameFirst,
      nameLast: ctx.input.nameLast,
      emailAddress: ctx.input.emailAddress,
      phoneNumber: ctx.input.phoneNumber,
      tags: ctx.input.tags
    });
    let normalized = normalizeResource(result.data);

    return {
      output: {
        accountId: result.data?.id,
        referenceId: normalized['reference-id'] || normalized.reference_id,
        attributes: normalized
      },
      message: `Created account **${result.data?.id}**.`
    };
  })
  .build();

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve the details of a specific Persona account, including its associated inquiries, verifications, and reports.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      accountId: z.string().describe('Persona account ID (starts with act_)')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('Account ID'),
      referenceId: z.string().optional().describe('Reference ID'),
      nameFirst: z.string().optional().describe('First name'),
      nameLast: z.string().optional().describe('Last name'),
      emailAddress: z.string().optional().describe('Email address'),
      phoneNumber: z.string().optional().describe('Phone number'),
      tags: z.array(z.string()).optional().describe('Account tags'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full account attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.getAccount(ctx.input.accountId);
    let n = normalizeResource(result.data);

    return {
      output: {
        accountId: result.data?.id,
        referenceId: n['reference-id'] || n.reference_id,
        nameFirst: n['name-first'] || n.name_first,
        nameLast: n['name-last'] || n.name_last,
        emailAddress: n['email-address'] || n.email_address,
        phoneNumber: n['phone-number'] || n.phone_number,
        tags: n.tags,
        createdAt: n['created-at'] || n.created_at,
        attributes: n
      },
      message: `Retrieved account **${result.data?.id}**.`
    };
  })
  .build();

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List Persona accounts with optional filters. Supports cursor-based pagination.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      filterReferenceId: z.string().optional().describe('Filter by your reference ID'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)'),
      pageCursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            accountId: z.string().describe('Account ID'),
            referenceId: z.string().optional().describe('Reference ID'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of accounts'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.listAccounts({
      filterReferenceId: ctx.input.filterReferenceId,
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageCursor
    });

    let accounts = (result.data || []).map((item: any) => {
      let n = normalizeResource(item);
      return {
        accountId: item.id,
        referenceId: n['reference-id'] || n.reference_id,
        createdAt: n['created-at'] || n.created_at
      };
    });

    let nextCursor: string | undefined;
    if (result.links?.next) {
      try {
        let parsed = new URL(result.links.next, 'https://withpersona.com');
        nextCursor = parsed.searchParams.get('page[after]') || undefined;
      } catch {
        /* ignore */
      }
    }

    return {
      output: { accounts, nextCursor },
      message: `Found **${accounts.length}** accounts.`
    };
  })
  .build();

export let updateAccount = SlateTool.create(spec, {
  name: 'Update Account',
  key: 'update_account',
  description: `Update an account's attributes such as name, email, phone, or reference ID.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      accountId: z.string().describe('Persona account ID (starts with act_)'),
      referenceId: z.string().optional().describe('Updated reference ID'),
      nameFirst: z.string().optional().describe('Updated first name'),
      nameLast: z.string().optional().describe('Updated last name'),
      emailAddress: z.string().optional().describe('Updated email address'),
      phoneNumber: z.string().optional().describe('Updated phone number')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('Account ID'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated account attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let attrs: Record<string, any> = {};
    if (ctx.input.referenceId !== undefined) attrs['reference-id'] = ctx.input.referenceId;
    if (ctx.input.nameFirst !== undefined) attrs['name-first'] = ctx.input.nameFirst;
    if (ctx.input.nameLast !== undefined) attrs['name-last'] = ctx.input.nameLast;
    if (ctx.input.emailAddress !== undefined) attrs['email-address'] = ctx.input.emailAddress;
    if (ctx.input.phoneNumber !== undefined) attrs['phone-number'] = ctx.input.phoneNumber;

    let result = await client.updateAccount(ctx.input.accountId, attrs);
    let normalized = normalizeResource(result.data);

    return {
      output: {
        accountId: result.data?.id,
        attributes: normalized
      },
      message: `Updated account **${result.data?.id}**.`
    };
  })
  .build();

export let consolidateAccounts = SlateTool.create(spec, {
  name: 'Consolidate Accounts',
  key: 'consolidate_accounts',
  description: `Merge multiple accounts into a primary account. All inquiries, verifications, and reports from the secondary accounts will be moved to the primary account.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      primaryAccountId: z.string().describe('The account to keep (starts with act_)'),
      secondaryAccountIds: z
        .array(z.string())
        .describe('Account IDs to merge into the primary account')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('Primary account ID'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated account attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.consolidateAccounts(
      ctx.input.primaryAccountId,
      ctx.input.secondaryAccountIds
    );
    let normalized = normalizeResource(result.data);

    return {
      output: {
        accountId: result.data?.id || ctx.input.primaryAccountId,
        attributes: normalized
      },
      message: `Consolidated **${ctx.input.secondaryAccountIds.length}** account(s) into **${ctx.input.primaryAccountId}**.`
    };
  })
  .build();

export let tagAccount = SlateTool.create(spec, {
  name: 'Tag Account',
  key: 'tag_account',
  description: `Add or remove tags on an account, or replace all tags. Tags help organize accounts for screening and workflow purposes.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      accountId: z.string().describe('Persona account ID (starts with act_)'),
      action: z
        .enum(['add', 'remove', 'set'])
        .describe('Tag action: add, remove, or set (replace all)'),
      tag: z.string().optional().describe('Tag name (for add/remove)'),
      allTags: z.array(z.string()).optional().describe('Full list of tags (for set action)')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('Account ID'),
      attributes: z.record(z.string(), z.any()).optional().describe('Updated attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.action === 'add' && ctx.input.tag) {
      result = await client.addAccountTag(ctx.input.accountId, ctx.input.tag);
    } else if (ctx.input.action === 'remove' && ctx.input.tag) {
      result = await client.removeAccountTag(ctx.input.accountId, ctx.input.tag);
    } else if (ctx.input.action === 'set' && ctx.input.allTags) {
      result = await client.setAccountTags(ctx.input.accountId, ctx.input.allTags);
    } else {
      throw new Error('Invalid tag action or missing required parameters');
    }

    let normalized = normalizeResource(result.data);
    return {
      output: {
        accountId: result.data?.id || ctx.input.accountId,
        attributes: normalized
      },
      message: `${ctx.input.action === 'add' ? 'Added' : ctx.input.action === 'remove' ? 'Removed' : 'Set'} tag(s) on account **${ctx.input.accountId}**.`
    };
  })
  .build();

export let redactAccount = SlateTool.create(spec, {
  name: 'Redact Account',
  key: 'redact_account',
  description: `Permanently delete all PII from an account and its associated resources. **This action cannot be undone.** Use for GDPR/CCPA compliance.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      accountId: z.string().describe('Persona account ID (starts with act_)')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('Redacted account ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    await client.redactAccount(ctx.input.accountId);

    return {
      output: { accountId: ctx.input.accountId },
      message: `Redacted account **${ctx.input.accountId}**. All PII has been permanently deleted.`
    };
  })
  .build();
