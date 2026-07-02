import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let balanceSchema = z.object({
  currencyCode: z.string().describe('Currency code'),
  amount: z
    .string()
    .describe('Balance amount (positive means you are owed, negative means you owe)')
});

let memberSchema = z.object({
  userId: z.number().describe('User ID'),
  firstName: z.string().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  balance: z.array(balanceSchema).optional().describe('Balances for this member in the group')
});

let debtSchema = z.object({
  from: z.number().describe('User ID of the person who owes'),
  to: z.number().describe('User ID of the person who is owed'),
  amount: z.string().describe('Amount owed'),
  currencyCode: z.string().describe('Currency code')
});

let groupSchema = z.object({
  groupId: z.number().describe('Group ID'),
  name: z.string().describe('Group name'),
  groupType: z
    .string()
    .optional()
    .describe('Group type: home, trip, couple, apartment, house, or other'),
  simplifyByDefault: z.boolean().optional().describe('Whether simplified debts are enabled'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  members: z.array(memberSchema).optional().describe('Group members with balances'),
  simplifiedDebts: z.array(debtSchema).optional().describe('Simplified debts between members'),
  inviteLink: z.string().optional().describe('Invite link to join this group')
});

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List all groups the authenticated user belongs to. Returns group details including members, balances, and simplified debts. Group ID 0 represents expenses not associated with any group.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(groupSchema).describe('List of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let groups = await client.getGroups();

    let mapped = (groups || []).map((g: any) => ({
      groupId: g.id,
      name: g.name,
      groupType: g.group_type,
      simplifyByDefault: g.simplify_by_default,
      updatedAt: g.updated_at,
      members: g.members?.map((m: any) => ({
        userId: m.id,
        firstName: m.first_name,
        lastName: m.last_name ?? null,
        email: m.email,
        balance: m.balance?.map((b: any) => ({
          currencyCode: b.currency_code,
          amount: b.amount
        }))
      })),
      simplifiedDebts: g.simplified_debts?.map((d: any) => ({
        from: d.from,
        to: d.to,
        amount: d.amount,
        currencyCode: d.currency_code
      })),
      inviteLink: g.invite_link
    }));

    return {
      output: { groups: mapped },
      message: `Found **${mapped.length}** group(s)`
    };
  })
  .build();
