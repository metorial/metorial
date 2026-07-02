import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAccount = SlateTool.create(spec, {
  name: 'Manage Account Membership',
  key: 'manage_account',
  description: `Manages customer-account relationships in Engage. Accounts represent organizations that customers belong to. You can add customers to accounts, remove them, change their roles, convert user types, or list account members.`,
  instructions: [
    'Use "add" to associate a customer with one or more accounts.',
    'Use "remove" to remove a customer from an account.',
    'Use "change_role" to update a customer\'s role within an account.',
    'Use "convert" to change a user between Customer and Account types.',
    'Use "get_members" to list all members of an account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add', 'remove', 'change_role', 'convert', 'get_members'])
        .describe('Operation to perform'),
      uid: z.string().describe('UID of the user or account'),
      accounts: z
        .array(
          z.object({
            accountId: z.string().describe('Account UID'),
            role: z.string().optional().describe('Role in the account')
          })
        )
        .optional()
        .describe('Accounts to add the user to (for "add" action)'),
      accountId: z
        .string()
        .optional()
        .describe('Account UID (for remove/change_role actions)'),
      role: z.string().optional().describe('New role (for change_role action)'),
      convertTo: z
        .enum(['customer', 'account'])
        .optional()
        .describe('User type to convert to (for convert action)')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Operation status'),
      members: z
        .array(
          z.object({
            userId: z.string(),
            uid: z.string(),
            firstName: z.string().nullable(),
            lastName: z.string().nullable(),
            email: z.string().nullable()
          })
        )
        .optional()
        .describe('Account members (for get_members action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret
    });

    let { action, uid, accounts, accountId, role, convertTo } = ctx.input;

    if (action === 'add') {
      if (!accounts || accounts.length === 0)
        throw new Error('accounts is required for add action');
      await client.addUserToAccounts(
        uid,
        accounts.map(a => ({ id: a.accountId, role: a.role }))
      );
      return {
        output: { status: 'ok' },
        message: `Added user **${uid}** to **${accounts.length}** account(s).`
      };
    }

    if (action === 'remove') {
      if (!accountId) throw new Error('accountId is required for remove action');
      await client.removeUserFromAccount(uid, accountId);
      return {
        output: { status: 'ok' },
        message: `Removed user **${uid}** from account **${accountId}**.`
      };
    }

    if (action === 'change_role') {
      if (!accountId) throw new Error('accountId is required for change_role action');
      if (!role) throw new Error('role is required for change_role action');
      await client.changeAccountRole(uid, accountId, role);
      return {
        output: { status: 'ok' },
        message: `Changed role of user **${uid}** in account **${accountId}** to **${role}**.`
      };
    }

    if (action === 'convert') {
      if (!convertTo) throw new Error('convertTo is required for convert action');
      await client.convertUserType(uid, convertTo);
      return {
        output: { status: 'ok' },
        message: `Converted user **${uid}** to **${convertTo}**.`
      };
    }

    // get_members
    let result = await client.getAccountMembers(uid);
    let members = (result.data || []).map(m => ({
      userId: m.id,
      uid: m.uid,
      firstName: m.first_name,
      lastName: m.last_name,
      email: m.email
    }));
    return {
      output: { members },
      message: `Found **${members.length}** member(s) in account **${uid}**.`
    };
  })
  .build();
