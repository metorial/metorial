import { z } from 'zod';

const str = z.string().min(1);
const ns = z.string().nullable().optional();
const nn = z.number().nullable().optional();
const nb = z.boolean().nullable().optional();
const json = z.record(z.string(), z.unknown());
export const receipt = z.object({ request_id: str });
export const balance = z.object({
  available: z.number().nullable(),
  current: z.number().nullable(),
  limit: nn,
  iso_currency_code: ns,
  unofficial_currency_code: ns
});
export const account = z.object({
  account_id: str,
  name: z.string(),
  type: str,
  subtype: ns,
  official_name: ns,
  mask: ns,
  balances: balance
});
export const item = z.object({
  item_id: str,
  institution_id: ns,
  institution_name: ns,
  webhook: ns,
  error: z.object({ error_type: str, error_code: str, request_id: ns }).nullable().optional(),
  available_products: z.array(str).optional(),
  billed_products: z.array(str).optional(),
  consented_products: z.array(str).optional()
});
export const accountsResponse = receipt.extend({ accounts: z.array(account), item });
const category = z
  .object({
    primary: str,
    detailed: str,
    confidence_level: ns,
    version: z.enum(['v1', 'v2']).optional()
  })
  .nullable()
  .optional();
const location = z
  .object({ city: ns, region: ns, country: ns, postal_code: ns, store_number: ns })
  .nullable()
  .optional();
export const transaction = z.object({
  transaction_id: str,
  account_id: str,
  amount: z.number(),
  date: str,
  name: z.string(),
  pending: z.boolean(),
  merchant_name: ns,
  payment_channel: z.string().optional(),
  personal_finance_category: category,
  iso_currency_code: ns,
  location
});
export const transactionsResponse = receipt.extend({
  transactions: z.array(transaction),
  total_transactions: z.number().int().nonnegative()
});
export const syncResponse = receipt.extend({
  added: z.array(transaction),
  modified: z.array(transaction),
  removed: z.array(z.object({ transaction_id: str, account_id: str.optional() })),
  next_cursor: z.string(),
  has_more: z.boolean(),
  transactions_update_status: str
});
const ach = z.object({ account_id: str, account: str, routing: str, wire_routing: ns });
const eft = z.object({ account_id: str, account: str, institution: str, branch: str });
const bacs = z.object({ account_id: str, account: str, sort_code: str });
const international = z.object({ account_id: str, iban: str, bic: str });
export const authResponse = receipt.extend({
  numbers: z.object({
    ach: z.array(ach),
    eft: z.array(eft),
    bacs: z.array(bacs),
    international: z.array(international)
  })
});
const communication = z.object({
  data: z.string(),
  primary: z.boolean(),
  type: z.string().optional()
});
const address = z.object({
  primary: z.boolean().optional(),
  data: z.object({ street: ns, city: ns, region: ns, postal_code: ns, country: ns })
});
const owner = z.object({
  names: z.array(z.string()),
  emails: z.array(communication),
  phone_numbers: z.array(communication),
  addresses: z.array(address)
});
export const identityResponse = receipt.extend({
  accounts: z.array(account.extend({ owners: z.array(owner) }))
});
const holding = z.object({
  account_id: str,
  security_id: str,
  quantity: z.number(),
  institution_price: z.number(),
  institution_price_as_of: ns,
  institution_value: z.number(),
  cost_basis: nn,
  iso_currency_code: ns
});
const security = z.object({
  security_id: str,
  name: ns,
  ticker_symbol: ns,
  type: ns,
  close_price: nn,
  close_price_as_of: ns,
  iso_currency_code: ns,
  isin: ns,
  cusip: ns
});
export const holdingsResponse = receipt.extend({
  holdings: z.array(holding),
  securities: z.array(security)
});
const investmentTransaction = z.object({
  investment_transaction_id: str,
  account_id: str,
  security_id: ns,
  date: str,
  name: z.string(),
  amount: z.number(),
  price: z.number(),
  quantity: z.number(),
  fees: nn,
  type: str,
  subtype: ns,
  iso_currency_code: ns
});
export const investmentsResponse = receipt.extend({
  investment_transactions: z.array(investmentTransaction),
  total_investment_transactions: z.number().int().nonnegative()
});
const credit = z.object({
  account_id: str.nullable(),
  is_overdue: nb,
  last_payment_amount: nn,
  last_payment_date: ns,
  last_statement_balance: nn,
  last_statement_issue_date: ns,
  minimum_payment_amount: nn,
  next_payment_due_date: ns,
  aprs: z.array(
    z.object({ apr_percentage: z.number(), apr_type: str, balance_subject_to_apr: nn })
  )
});
const student = z.object({
  account_id: str.nullable(),
  loan_name: ns,
  interest_rate_percentage: nn,
  is_overdue: nb,
  last_payment_amount: nn,
  last_payment_date: ns,
  minimum_payment_amount: nn,
  next_payment_due_date: ns,
  origination_date: ns,
  origination_principal_amount: nn,
  outstanding_interest_amount: nn,
  expected_payoff_date: ns,
  repayment_plan: z.object({ type: ns }).nullable().optional()
});
const mortgage = z.object({
  account_id: str,
  loan_term: ns,
  interest_rate: z.object({ percentage: nn, type: ns }).nullable().optional(),
  last_payment_amount: nn,
  last_payment_date: ns,
  next_monthly_payment: nn,
  next_payment_due_date: ns,
  origination_date: ns,
  origination_principal_amount: nn,
  maturity_date: ns,
  has_pmi: nb
});
export const liabilitiesResponse = receipt.extend({
  liabilities: z.object({
    credit: z.array(credit).nullable(),
    student: z.array(student).nullable(),
    mortgage: z.array(mortgage).nullable()
  })
});
export const productStatus = z.object({ status: str, last_status_change: ns }).nullable();
export const institution = z.object({
  institution_id: str,
  name: z.string(),
  products: z.array(str),
  country_codes: z.array(str),
  oauth: z.boolean().optional(),
  url: ns,
  primary_color: ns,
  routing_numbers: z.array(z.string()).optional(),
  status: z
    .object({
      item_logins: productStatus.optional(),
      transactions_updates: productStatus.optional(),
      auth: productStatus.optional(),
      balance: productStatus.optional(),
      identity: productStatus.optional()
    })
    .nullable()
    .optional()
});
export const searchResponse = receipt.extend({ institutions: z.array(institution) });
export const institutionResponse = receipt.extend({ institution });
export const linkResponse = receipt.extend({ link_token: str, expiration: str });
export const exchangeResponse = receipt.extend({ access_token: str, item_id: str });
export const itemResponse = receipt.extend({
  item,
  status: z
    .object({
      transactions: z.object({ last_successful_update: ns }).nullable().optional(),
      investments: z.object({ last_successful_update: ns }).nullable().optional()
    })
    .nullable()
    .optional()
});
export const assetCreateResponse = receipt.extend({
  asset_report_token: str,
  asset_report_id: str
});
export const report = z
  .object({
    asset_report_id: str,
    date_generated: str,
    days_requested: z.number().int().nonnegative(),
    items: z.array(json)
  })
  .passthrough();
export const assetResponse = receipt.extend({ report });
export const assetRemoveResponse = receipt.extend({ removed: z.boolean() });
export const transfer = z.object({
  id: str,
  authorization_id: str,
  account_id: str.optional(),
  status: str,
  type: str,
  amount: str,
  description: z.string(),
  network: str,
  created: str,
  cancellable: z.boolean(),
  failure_reason: json.nullable().optional(),
  metadata: z.record(z.string(), z.string()).nullable().optional()
});
export const transferResponse = receipt.extend({ transfer });
export const transfersResponse = receipt.extend({ transfers: z.array(transfer) });
export const authorization = z.object({
  id: str,
  created: str,
  decision: z.enum(['approved', 'declined', 'user_action_required']),
  decision_rationale: z
    .object({ code: z.string().nullable(), description: z.string() })
    .nullable(),
  proposed_transfer: z.object({
    type: str,
    account_id: str.optional(),
    amount: str,
    requested_amount: str,
    network: str,
    iso_currency_code: str
  }),
  payment_risk: json.nullable().optional()
});
export const authorizationResponse = receipt.extend({ authorization });
const risk = z.object({
  score: z.number().int().min(1).max(99),
  risk_tier: z.number().int().optional()
});
export const signalResponse = receipt.extend({
  scores: z
    .object({
      customer_initiated_return_risk: risk.optional(),
      bank_initiated_return_risk: risk.optional()
    })
    .nullable()
    .optional(),
  core_attributes: z
    .object({ available_balance: nn, current_balance: nn })
    .nullable()
    .optional(),
  ruleset: z.object({ result: str, ruleset_key: z.string().optional() }).nullable().optional(),
  warnings: z.array(json)
});
const counterparty = z.object({ name: z.string(), type: str, website: ns, logo_url: ns });
const enrichments = z.object({
  merchant_name: ns,
  website: ns,
  logo_url: ns,
  payment_channel: ns,
  personal_finance_category: category,
  counterparties: z.array(counterparty),
  location
});
export const enrichResponse = z.object({
  request_id: str.optional(),
  enriched_transactions: z.array(z.object({ id: str, enrichments }))
});
