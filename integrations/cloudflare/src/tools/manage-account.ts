import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageAccountTool = SlateTool.create(spec, {
  name: 'Manage Account',
  key: 'manage_account',
  description: `View account details, list account members and roles, add or remove members, and view audit logs. Manage team access to your Cloudflare account.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'get_account',
          'list_accounts',
          'list_members',
          'add_member',
          'remove_member',
          'list_roles',
          'get_audit_logs'
        ])
        .describe('Operation to perform'),
      accountId: z.string().optional().describe('Account ID (uses config if not provided)'),
      memberId: z.string().optional().describe('Member ID for remove operations'),
      email: z.string().optional().describe('Email address to invite as member'),
      roleIds: z.array(z.string()).optional().describe('Role IDs to assign to the new member'),
      since: z.string().optional().describe('Start date for audit logs (ISO 8601)'),
      before: z.string().optional().describe('End date for audit logs (ISO 8601)'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Items per page')
    })
  )
  .output(
    z.object({
      account: z
        .object({
          accountId: z.string(),
          name: z.string(),
          type: z.string().optional()
        })
        .optional(),
      accounts: z
        .array(
          z.object({
            accountId: z.string(),
            name: z.string(),
            type: z.string().optional()
          })
        )
        .optional(),
      members: z
        .array(
          z.object({
            memberId: z.string(),
            email: z.string().optional(),
            name: z.string().optional(),
            status: z.string().optional(),
            roles: z.array(z.string()).optional()
          })
        )
        .optional(),
      addedMember: z
        .object({
          memberId: z.string()
        })
        .optional(),
      roles: z
        .array(
          z.object({
            roleId: z.string(),
            name: z.string(),
            description: z.string().optional()
          })
        )
        .optional(),
      auditLogs: z
        .array(
          z.object({
            auditLogId: z.string(),
            actionType: z.string().optional(),
            actorEmail: z.string().optional(),
            when: z.string().optional(),
            resourceType: z.string().optional()
          })
        )
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let accountId = ctx.input.accountId || ctx.config.accountId;
    let { action } = ctx.input;

    if (action === 'list_accounts') {
      let response = await client.listAccounts({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let accounts = response.result.map((a: any) => ({
        accountId: a.id,
        name: a.name,
        type: a.type
      }));
      return {
        output: { accounts },
        message: `Found **${accounts.length}** account(s).`
      };
    }

    if (action === 'get_account') {
      if (!accountId) throw cloudflareServiceError('accountId is required');
      let response = await client.getAccount(accountId);
      let a = response.result;
      return {
        output: { account: { accountId: a.id, name: a.name, type: a.type } },
        message: `Account **${a.name}** (${a.id})`
      };
    }

    if (action === 'list_members') {
      if (!accountId) throw cloudflareServiceError('accountId is required');
      let response = await client.listAccountMembers(accountId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let members = response.result.map((m: any) => ({
        memberId: m.id,
        email: m.user?.email,
        name: `${m.user?.first_name || ''} ${m.user?.last_name || ''}`.trim() || undefined,
        status: m.status,
        roles: m.roles?.map((r: any) => r.name)
      }));
      return {
        output: { members },
        message: `Found **${members.length}** account member(s).`
      };
    }

    if (action === 'add_member') {
      if (!accountId) throw cloudflareServiceError('accountId is required');
      if (!ctx.input.email || !ctx.input.roleIds?.length) {
        throw cloudflareServiceError('email and roleIds are required');
      }
      let response = await client.addAccountMember(
        accountId,
        ctx.input.email,
        ctx.input.roleIds
      );
      return {
        output: { addedMember: { memberId: response.result.id } },
        message: `Invited **${ctx.input.email}** to the account.`
      };
    }

    if (action === 'remove_member') {
      if (!accountId || !ctx.input.memberId)
        throw cloudflareServiceError('accountId and memberId are required');
      await client.removeAccountMember(accountId, ctx.input.memberId);
      return {
        output: { deleted: true },
        message: `Removed member \`${ctx.input.memberId}\`.`
      };
    }

    if (action === 'list_roles') {
      if (!accountId) throw cloudflareServiceError('accountId is required');
      let response = await client.listAccountRoles(accountId);
      let roles = response.result.map((r: any) => ({
        roleId: r.id,
        name: r.name,
        description: r.description
      }));
      return {
        output: { roles },
        message: `Found **${roles.length}** role(s).`
      };
    }

    if (action === 'get_audit_logs') {
      if (!accountId) throw cloudflareServiceError('accountId is required');
      let response = await client.getAuditLogs(accountId, {
        since: ctx.input.since,
        before: ctx.input.before,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let auditLogs = response.result.map((log: any) => ({
        auditLogId: log.id,
        actionType: log.action?.type,
        actorEmail: log.actor?.email,
        when: log.when,
        resourceType: log.resource?.type
      }));
      return {
        output: { auditLogs },
        message: `Found **${auditLogs.length}** audit log entries.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
