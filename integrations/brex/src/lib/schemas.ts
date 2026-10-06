import { z } from 'zod';

const text = z.string().nullish();
export const money = z.object({ amount: z.number(), currency: z.string().nullable() });
const moneyDto = money
  .extend({
    amount: z.number().refine(Number.isSafeInteger),
    currency: z.string().nullish()
  })
  .transform(value => ({ amount: value.amount, currency: value.currency ?? null }));
export const userDto = z.object({
  id: z.string().min(1),
  first_name: text,
  last_name: text,
  email: text,
  status: text,
  manager_id: text,
  department_id: text,
  location_id: text
});
export const cardDto = z.object({
  id: z.string().min(1),
  status: text,
  card_name: text,
  card_type: text,
  last_four: text,
  limit_type: text,
  owner: z.object({ type: text, user_id: text }).nullish(),
  spend_controls: z
    .object({ spend_limit: moneyDto.nullish(), spend_duration: text, lock_after_date: text })
    .nullish()
});
export const expenseDto = z.object({
  id: z.string().min(1),
  memo: text,
  category: text,
  status: text,
  payment_status: text,
  expense_type: text,
  original_amount: moneyDto.nullish(),
  billing_amount: moneyDto.nullish(),
  purchased_at: text,
  updated_at: text,
  user_id: text,
  budget_id: text,
  merchant: z.object({ raw_descriptor: text, mcc: text }).nullish(),
  receipts: z
    .array(z.object({ id: z.string().min(1), download_uris: z.array(z.string()).nullish() }))
    .nullish()
});
export const vendorDto = z.object({
  id: z.string().min(1),
  company_name: text,
  email: text,
  phone: text,
  payment_accounts: z
    .array(z.object({ details: z.object({ type: text, payment_instrument_id: text }) }))
    .nullish()
});
export const transferDto = z.object({
  id: z.string().min(1),
  status: text,
  amount: moneyDto.nullish(),
  description: text,
  external_memo: text,
  created_at: text,
  counterparty: z.object({ type: text }).nullish()
});
export const budgetDto = z
  .object({
    id: z.string().min(1).optional(),
    budget_id: z.string().min(1).optional(),
    name: text,
    description: text,
    spend_budget_status: text,
    status: text,
    period_recurrence_type: text,
    amount: moneyDto.nullish(),
    authorization_settings: z.object({ base_limit: moneyDto.nullish() }).nullish(),
    current_period_balance: z
      .object({ amount: z.number().optional(), currency: text, available: moneyDto.nullish() })
      .nullish(),
    parent_budget_id: text,
    owner_user_ids: z.array(z.string()).optional(),
    member_user_ids: z.array(z.string()).optional()
  })
  .refine(v => Boolean(v.id || v.budget_id));
export const accountDto = z.object({
  id: z.string().min(1),
  name: text,
  status: text,
  current_balance: moneyDto.nullish(),
  available_balance: moneyDto.nullish(),
  account_number: text,
  routing_number: text,
  primary: z.boolean().optional()
});
export const transactionDto = z.object({
  id: z.string().min(1),
  type: text,
  amount: moneyDto.nullish(),
  description: text,
  posted_at_date: text,
  card_id: text,
  merchant: z.object({ raw_descriptor: text }).nullish()
});
export const organizationDto = z.object({
  id: z.string().min(1),
  name: text,
  description: text
});
export const page = <S extends z.ZodType>(item: S) =>
  z
    .object({ items: z.array(item), next_cursor: z.string().min(1).nullish() })
    .transform(v => ({ ...v, next_cursor: v.next_cursor ?? null }));
export const mapUser = (v: z.infer<typeof userDto>) => ({
  userId: v.id,
  firstName: v.first_name ?? null,
  lastName: v.last_name ?? null,
  email: v.email ?? null,
  status: v.status,
  managerId: v.manager_id,
  departmentId: v.department_id,
  locationId: v.location_id
});
export const mapCard = (v: z.infer<typeof cardDto>) => ({
  cardId: v.id,
  status: v.status,
  cardType: v.card_type,
  cardName: v.card_name,
  lastFour: v.last_four,
  limitType: v.limit_type,
  owner: v.owner ? { userId: v.owner.user_id, type: v.owner.type } : undefined,
  spendControls: v.spend_controls
    ? {
        spendLimit: v.spend_controls.spend_limit ?? undefined,
        spendDuration: v.spend_controls.spend_duration,
        lockAfterDate: v.spend_controls.lock_after_date
      }
    : undefined
});
export const mapExpense = (v: z.infer<typeof expenseDto>) => ({
  expenseId: v.id,
  memo: v.memo,
  category: v.category,
  status: v.status ?? undefined,
  paymentStatus: v.payment_status,
  amount: v.original_amount ?? undefined,
  billingAmount: v.billing_amount,
  merchantName: v.merchant?.raw_descriptor ?? null,
  merchantCategory: v.merchant?.mcc ?? null,
  purchasedAt: v.purchased_at,
  updatedAt: v.updated_at,
  userId: v.user_id,
  budgetId: v.budget_id,
  receipts: v.receipts?.map(r => ({ receiptId: r.id, fileCount: r.download_uris?.length }))
});
export const mapVendor = (v: z.infer<typeof vendorDto>) => ({
  vendorId: v.id,
  companyName: v.company_name,
  email: v.email,
  phone: v.phone,
  paymentInstruments: v.payment_accounts?.map(a => ({
    type: a.details.type,
    paymentInstrumentId: a.details.payment_instrument_id
  }))
});
export const mapTransfer = (v: z.infer<typeof transferDto>) => ({
  transferId: v.id,
  status: v.status,
  amount: v.amount ?? undefined,
  description: v.description,
  externalMemo: v.external_memo,
  counterpartyType: v.counterparty?.type ?? undefined,
  createdAt: v.created_at
});
export const budgetId = (v: z.infer<typeof budgetDto>) => (v.budget_id ?? v.id)!;
export const mapBudget = (v: z.infer<typeof budgetDto>) => ({
  budgetId: budgetId(v),
  name: v.name,
  description: v.description,
  status: v.spend_budget_status ?? v.status,
  periodType: v.period_recurrence_type ?? undefined,
  limit: v.amount ?? v.authorization_settings?.base_limit,
  currentPeriodBalance: undefined,
  parentBudgetId: v.parent_budget_id,
  ownerUserIds: v.owner_user_ids,
  memberUserIds: v.member_user_ids
});
export const mapAccount = (v: z.infer<typeof accountDto>, type: string) => ({
  accountId: v.id,
  accountType: type,
  name: v.name,
  status: v.status,
  currentBalance: v.current_balance,
  availableBalance: v.available_balance,
  accountNumber: v.account_number,
  routingNumber: v.routing_number,
  isPrimary: v.primary
});
export const mapTransaction = (v: z.infer<typeof transactionDto>) => ({
  transactionId: v.id,
  type: v.type,
  amount: v.amount ?? undefined,
  description: v.description,
  postedAt: v.posted_at_date,
  cardId: v.card_id,
  merchantName: v.merchant?.raw_descriptor
});
