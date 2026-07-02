import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let balanceSchema = z.object({
  currencyCode: z.string().describe('Currency code'),
  amount: z.string().describe('Balance amount')
});

let memberSchema = z.object({
  userId: z.number().describe('User ID'),
  firstName: z.string().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  balance: z.array(balanceSchema).optional().describe('Balances for this member')
});

let debtSchema = z.object({
  from: z.number().describe('User ID who owes'),
  to: z.number().describe('User ID who is owed'),
  amount: z.string().describe('Amount owed'),
  currencyCode: z.string().describe('Currency code')
});

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Retrieve detailed information about a specific Splitwise group, including members, balances, debts, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.number().describe('The group ID to retrieve')
    })
  )
  .output(
    z.object({
      groupId: z.number().describe('Group ID'),
      name: z.string().describe('Group name'),
      groupType: z.string().optional().describe('Group type'),
      simplifyByDefault: z
        .boolean()
        .optional()
        .describe('Whether simplified debts are enabled'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      members: z.array(memberSchema).optional().describe('Group members with balances'),
      originalDebts: z
        .array(debtSchema)
        .optional()
        .describe('Original debts before simplification'),
      simplifiedDebts: z
        .array(debtSchema)
        .optional()
        .describe('Simplified debts between members'),
      inviteLink: z.string().optional().describe('Invite link to join this group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let g = await client.getGroup(ctx.input.groupId);

    return {
      output: {
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
        originalDebts: g.original_debts?.map((d: any) => ({
          from: d.from,
          to: d.to,
          amount: d.amount,
          currencyCode: d.currency_code
        })),
        simplifiedDebts: g.simplified_debts?.map((d: any) => ({
          from: d.from,
          to: d.to,
          amount: d.amount,
          currencyCode: d.currency_code
        })),
        inviteLink: g.invite_link
      },
      message: `Retrieved group **${g.name}** with ${g.members?.length || 0} member(s)`
    };
  })
  .build();
