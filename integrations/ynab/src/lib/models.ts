import { z } from 'zod';
import { knowledge, milliunits } from './validation';

const nullableString = z.string().nullable().optional();
export const accountSchema = z.looseObject({
  id: z.string().min(1),
  name: z.string(),
  type: z.string(),
  on_budget: z.boolean(),
  closed: z.boolean(),
  deleted: z.boolean(),
  balance: milliunits,
  cleared_balance: milliunits,
  uncleared_balance: milliunits,
  transfer_payee_id: nullableString,
  note: nullableString,
  direct_import_linked: z.boolean().optional(),
  direct_import_in_error: z.boolean().optional()
});
const planSummarySchema = z.looseObject({
  id: z.string().min(1),
  name: z.string(),
  last_modified_on: z.string().optional(),
  first_month: z.string().optional(),
  last_month: z.string().optional(),
  date_format: z.object({ format: z.string() }).optional(),
  currency_format: z
    .looseObject({ iso_code: z.string(), currency_symbol: z.string() })
    .optional(),
  accounts: z.array(accountSchema).optional()
});
export const categorySchema = z.looseObject({
  id: z.string().min(1),
  category_group_id: z.string(),
  category_group_name: z.string().optional(),
  name: z.string(),
  hidden: z.boolean(),
  internal: z.boolean(),
  deleted: z.boolean(),
  note: nullableString,
  budgeted: milliunits,
  activity: milliunits,
  balance: milliunits,
  goal_type: nullableString,
  goal_target: milliunits.nullable().optional(),
  goal_target_date: nullableString,
  goal_percentage_complete: milliunits.nullable().optional(),
  goal_under_funded: milliunits.nullable().optional(),
  goal_needs_whole_amount: z.boolean().nullable().optional(),
  goal_cadence: milliunits.nullable().optional()
});
export const groupSchema = z.looseObject({
  id: z.string().min(1),
  name: z.string(),
  hidden: z.boolean(),
  internal: z.boolean(),
  deleted: z.boolean()
});
export const categoryGroupSchema = groupSchema.extend({ categories: z.array(categorySchema) });
export const payeeSchema = z.looseObject({
  id: z.string().min(1),
  name: z.string(),
  deleted: z.boolean(),
  transfer_account_id: nullableString
});
export const subtransactionSchema = z.looseObject({
  id: z.string().min(1),
  amount: milliunits,
  deleted: z.boolean(),
  memo: nullableString,
  payee_id: nullableString,
  payee_name: nullableString,
  category_id: nullableString,
  category_name: nullableString,
  transfer_account_id: nullableString,
  transfer_transaction_id: nullableString
});
export const transactionSchema = z.looseObject({
  id: z.string().min(1),
  account_id: z.string(),
  date: z.string(),
  amount: milliunits,
  cleared: z.string(),
  approved: z.boolean(),
  deleted: z.boolean(),
  memo: nullableString,
  flag_color: nullableString,
  flag_name: nullableString,
  account_name: z.string().optional(),
  payee_id: nullableString,
  payee_name: nullableString,
  category_id: nullableString,
  category_name: nullableString,
  transfer_account_id: nullableString,
  transfer_transaction_id: nullableString,
  matched_transaction_id: nullableString,
  import_id: nullableString,
  import_payee_name: nullableString,
  subtransactions: z.array(subtransactionSchema).optional(),
  type: z.enum(['transaction', 'subtransaction']).optional(),
  parent_transaction_id: nullableString
});
export const scheduledSchema = z.looseObject({
  id: z.string().min(1),
  account_id: z.string(),
  date_first: z.string(),
  date_next: z.string(),
  amount: milliunits,
  frequency: z.string(),
  deleted: z.boolean(),
  account_name: z.string().optional(),
  memo: nullableString,
  flag_color: nullableString,
  payee_id: nullableString,
  payee_name: nullableString,
  category_id: nullableString,
  category_name: nullableString,
  transfer_account_id: nullableString,
  subtransactions: z.array(subtransactionSchema).optional()
});
export const monthSchema = z.looseObject({
  month: z.string(),
  income: milliunits,
  budgeted: milliunits,
  activity: milliunits,
  to_be_budgeted: milliunits,
  age_of_money: milliunits.nullable().optional(),
  note: nullableString,
  deleted: z.boolean()
});
export const monthDetailSchema = monthSchema.extend({ categories: z.array(categorySchema) });
export const savedSchema = z.object({
  transaction_ids: z.array(z.string().min(1)),
  duplicate_import_ids: z.array(z.string()).optional(),
  server_knowledge: knowledge,
  transaction: transactionSchema.optional(),
  transactions: z.array(transactionSchema).optional()
});
export type Account = z.infer<typeof accountSchema>;
export const planSchema = planSummarySchema.extend({
  payees: z.array(payeeSchema).optional(),
  category_groups: z.array(groupSchema).optional(),
  categories: z.array(categorySchema).optional(),
  months: z
    .array(monthSchema.extend({ categories: z.array(categorySchema).optional() }))
    .optional(),
  transactions: z.array(transactionSchema).optional(),
  subtransactions: z.array(subtransactionSchema).optional(),
  scheduled_transactions: z.array(scheduledSchema).optional(),
  scheduled_subtransactions: z.array(subtransactionSchema).optional()
});
export type Plan = z.infer<typeof planSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type Scheduled = z.infer<typeof scheduledSchema>;
export const mapAccount = (a: Account) => ({
  accountId: a.id,
  name: a.name,
  type: a.type,
  onBudget: a.on_budget,
  closed: a.closed,
  balance: a.balance,
  clearedBalance: a.cleared_balance,
  unclearedBalance: a.uncleared_balance,
  note: a.note,
  directImportLinked: a.direct_import_linked,
  directImportInError: a.direct_import_in_error,
  transferPayeeId: a.transfer_payee_id,
  deleted: a.deleted
});
export const mapPlan = (p: Plan) => ({
  budgetId: p.id,
  name: p.name,
  lastModifiedOn: p.last_modified_on,
  firstMonth: p.first_month,
  lastMonth: p.last_month,
  dateFormat: p.date_format?.format,
  currencyIsoCode: p.currency_format?.iso_code,
  currencySymbol: p.currency_format?.currency_symbol,
  accounts: p.accounts?.map(mapAccount)
});
export const mapCategory = (c: Category) => ({
  categoryId: c.id,
  categoryGroupId: c.category_group_id,
  categoryGroupName: c.category_group_name,
  name: c.name,
  hidden: c.hidden,
  internal: c.internal,
  note: c.note,
  budgeted: c.budgeted,
  activity: c.activity,
  balance: c.balance,
  goalType: c.goal_type,
  goalTarget: c.goal_target,
  goalTargetDate: c.goal_target_date,
  goalPercentageComplete: c.goal_percentage_complete,
  goalUnderFunded: c.goal_under_funded,
  goalNeedsWholeAmount: c.goal_needs_whole_amount,
  goalCadence: c.goal_cadence,
  deleted: c.deleted
});
export const mapTransaction = (t: Transaction) => ({
  transactionId: t.id,
  date: t.date,
  amount: t.amount,
  memo: t.memo,
  cleared: t.cleared,
  approved: t.approved,
  flagColor: t.flag_color,
  flagName: t.flag_name,
  accountId: t.account_id,
  accountName: t.account_name,
  payeeId: t.payee_id,
  payeeName: t.payee_name,
  categoryId: t.category_id,
  categoryName: t.category_name,
  transferAccountId: t.transfer_account_id,
  transferTransactionId: t.transfer_transaction_id,
  matchedTransactionId: t.matched_transaction_id,
  importId: t.import_id,
  importPayeeName: t.import_payee_name,
  deleted: t.deleted,
  type: t.type,
  parentTransactionId: t.parent_transaction_id,
  subtransactions: t.subtransactions?.map(s => ({
    subtransactionId: s.id,
    amount: s.amount,
    memo: s.memo,
    payeeId: s.payee_id,
    payeeName: s.payee_name,
    categoryId: s.category_id,
    categoryName: s.category_name,
    transferAccountId: s.transfer_account_id,
    transferTransactionId: s.transfer_transaction_id,
    deleted: s.deleted
  }))
});
export const mapScheduled = (s: Scheduled) => ({
  scheduledTransactionId: s.id,
  dateFirst: s.date_first,
  dateNext: s.date_next,
  frequency: s.frequency,
  amount: s.amount,
  accountId: s.account_id,
  accountName: s.account_name,
  payeeId: s.payee_id,
  payeeName: s.payee_name,
  categoryId: s.category_id,
  categoryName: s.category_name,
  memo: s.memo,
  flagColor: s.flag_color,
  transferAccountId: s.transfer_account_id,
  deleted: s.deleted
});
export const mapMonth = (m: z.infer<typeof monthSchema>) => ({
  month: m.month,
  income: m.income,
  budgeted: m.budgeted,
  activity: m.activity,
  toBeBudgeted: m.to_be_budgeted,
  ageOfMoney: m.age_of_money,
  note: m.note,
  deleted: m.deleted
});
