import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  mapAccount,
  mapBudget,
  mapCard,
  mapTransfer,
  mapUser,
  mapVendor,
  money
} from '../lib/schemas';
import { spec } from '../spec';

const text = z.string().nullish();
const details = z.object({
  userId: text,
  firstName: text,
  lastName: text,
  email: text,
  status: text,
  managerId: text,
  departmentId: text,
  locationId: text,
  cardId: text,
  cardType: text,
  cardName: text,
  lastFour: text,
  limitType: text,
  owner: z.object({ userId: text, type: text }).optional(),
  spendControls: z
    .object({ spendLimit: money.optional(), spendDuration: text, lockAfterDate: text })
    .optional(),
  vendorId: text,
  companyName: text,
  phone: text,
  paymentInstruments: z.array(z.object({ type: text, paymentInstrumentId: text })).optional(),
  transferId: text,
  amount: money.optional(),
  description: text,
  externalMemo: text,
  counterpartyType: text,
  createdAt: text,
  budgetId: text,
  name: text,
  periodType: text,
  limit: money.nullish(),
  currentPeriodBalance: money.nullish(),
  parentBudgetId: text,
  ownerUserIds: z.array(z.string()).optional(),
  memberUserIds: z.array(z.string()).optional(),
  accountId: text,
  accountType: text,
  currentBalance: money.nullish(),
  availableBalance: money.nullish(),
  accountNumber: text,
  routingNumber: text,
  isPrimary: z.boolean().optional()
});
export const getResource = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description:
    'Read an exact user, card, vendor, transfer, budget, spend limit or cash account. Discover IDs with the corresponding list tool. Vendor details expose payment instrument identifiers without banking numbers; transfers are read without initiating a payment.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resourceType: z.enum([
        'user',
        'card',
        'vendor',
        'transfer',
        'budget',
        'spend_limit',
        'cash_account'
      ]),
      resourceId: z.string().describe('Exact ID from the corresponding list tool.')
    })
  )
  .output(z.object({ resourceType: z.string(), resourceId: z.string(), details }))
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const id = ctx.input.resourceId;
    const value =
      ctx.input.resourceType === 'user'
        ? mapUser(await client.getUser(id))
        : ctx.input.resourceType === 'card'
          ? mapCard(await client.getCard(id))
          : ctx.input.resourceType === 'vendor'
            ? mapVendor(await client.getVendor(id))
            : ctx.input.resourceType === 'transfer'
              ? mapTransfer(await client.getTransfer(id))
              : ctx.input.resourceType === 'cash_account'
                ? mapAccount(await client.getCashAccount(id), 'cash')
                : mapBudget(await client.getBudget(id, ctx.input.resourceType));
    return {
      output: { resourceType: ctx.input.resourceType, resourceId: id, details: value },
      message: 'Retrieved the requested resource.'
    };
  })
  .build();
