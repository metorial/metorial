import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let balanceSchema = z.object({
  currencyCode: z.string().describe('Currency code'),
  amount: z
    .string()
    .describe('Balance amount (positive = they owe you, negative = you owe them)')
});

let groupBalanceSchema = z.object({
  groupId: z.number().describe('Group ID'),
  balance: z.array(balanceSchema).optional().describe('Balances in this group')
});

let friendSchema = z.object({
  userId: z.number().describe('User ID'),
  firstName: z.string().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  registrationStatus: z.string().optional().describe('Registration status'),
  balance: z.array(balanceSchema).optional().describe('Overall balance with this friend'),
  groups: z.array(groupBalanceSchema).optional().describe('Balance broken down by group'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

export let listFriends = SlateTool.create(spec, {
  name: 'List Friends',
  key: 'list_friends',
  description: `List all friends of the authenticated user with their balances. Returns overall balances and per-group balances showing who owes whom.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      friends: z.array(friendSchema).describe('List of friends')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let friends = await client.getFriends();

    let mapped = (friends || []).map((f: any) => ({
      userId: f.id,
      firstName: f.first_name,
      lastName: f.last_name ?? null,
      email: f.email,
      registrationStatus: f.registration_status,
      balance: f.balance?.map((b: any) => ({
        currencyCode: b.currency_code,
        amount: b.amount
      })),
      groups: f.groups?.map((g: any) => ({
        groupId: g.group_id,
        balance: g.balance?.map((b: any) => ({
          currencyCode: b.currency_code,
          amount: b.amount
        }))
      })),
      updatedAt: f.updated_at
    }));

    return {
      output: { friends: mapped },
      message: `Found **${mapped.length}** friend(s)`
    };
  })
  .build();
