import { createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';
import {
  accountSchema,
  categoryGroupSchema,
  categorySchema,
  groupSchema,
  monthDetailSchema,
  monthSchema,
  payeeSchema,
  planSchema,
  savedSchema,
  scheduledSchema,
  transactionSchema
} from './models';
import {
  apiFailure,
  date,
  invalid,
  knowledge,
  month,
  parseResponse,
  required,
  routeId,
  safeResponse
} from './validation';

function exactResource<T extends { id: string }>(resource: T, expectedId: string): T {
  if (resource.id !== expectedId.trim())
    throw createApiServiceError('YNAB returned a different resource than requested.', {
      reason: 'ynab_response'
    });
  return resource;
}

type RecordData = Record<string, unknown>;
type Query = Record<string, string | number | boolean | undefined>;
export interface TransactionOptions {
  sinceDate?: string;
  untilDate?: string;
  type?: 'uncategorized' | 'unapproved';
  lastKnowledge?: number;
  accountId?: string;
  categoryId?: string;
  payeeId?: string;
  month?: string;
}
const delta = (value?: number): Query => {
  if (value !== undefined && !knowledge.safeParse(value).success)
    throw invalid('Sync knowledge must be a nonnegative safe integer.');
  return { last_knowledge_of_server: value };
};
export class Client {
  private http: ReturnType<typeof createAxios>;
  private token: string;
  constructor(config: { token: string }) {
    this.token = required(config.token, 'Access token');
    this.http = createAxios({
      baseURL: 'https://api.ynab.com/v1',
      timeout: 30000,
      maxRedirects: 0,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }
  private plan(budgetId: string) {
    return `/plans/${routeId(budgetId)}`;
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: RecordData,
    params?: Query
  ): Promise<RecordData> {
    let response: { data: unknown };
    try {
      response = await this.http.request<unknown>({ method, url: path, data: body, params });
    } catch (error) {
      apiFailure(error, method !== 'GET');
    }
    const envelope = parseResponse(
      z.object({ data: z.record(z.string(), z.unknown()) }),
      safeResponse(response.data, [this.token])
    );
    return envelope.data;
  }
  async getUser() {
    return parseResponse(
      z.object({ user: z.object({ id: z.string().min(1) }) }),
      await this.request('GET', '/user')
    ).user;
  }
  async getBudgets(includeAccounts?: boolean) {
    const plans = parseResponse(
      z.object({ plans: z.array(planSchema) }),
      await this.request('GET', '/plans', undefined, { include_accounts: includeAccounts })
    ).plans;
    if (includeAccounts && plans.some(plan => plan.accounts === undefined))
      throw createApiServiceError('YNAB omitted requested account summaries.', {
        reason: 'ynab_response'
      });
    return plans;
  }
  async getBudget(budgetId: string, lastKnowledge?: number) {
    const data = parseResponse(
      z.object({ plan: planSchema, server_knowledge: knowledge }),
      await this.request('GET', this.plan(budgetId), undefined, delta(lastKnowledge))
    );
    if (!['default', 'last-used'].includes(budgetId.trim()))
      exactResource(data.plan, budgetId);
    return { budget: data.plan, server_knowledge: data.server_knowledge };
  }
  async getAccounts(budgetId: string, lastKnowledge?: number) {
    const data = parseResponse(
      z.object({ accounts: z.array(accountSchema), server_knowledge: knowledge }),
      await this.request(
        'GET',
        `${this.plan(budgetId)}/accounts`,
        undefined,
        delta(lastKnowledge)
      )
    );
    return { accounts: data.accounts, serverKnowledge: data.server_knowledge };
  }
  async getAccount(budgetId: string, accountId: string) {
    return exactResource(
      parseResponse(
        z.object({ account: accountSchema }),
        await this.request('GET', `${this.plan(budgetId)}/accounts/${routeId(accountId)}`)
      ).account,
      accountId
    );
  }
  async createAccount(
    budgetId: string,
    account: { name: string; type: string; balance: number }
  ) {
    return parseResponse(
      z.object({ account: accountSchema }),
      await this.request('POST', `${this.plan(budgetId)}/accounts`, { account })
    ).account;
  }
  async getCategories(budgetId: string, lastKnowledge?: number) {
    const data = parseResponse(
      z.object({ category_groups: z.array(categoryGroupSchema), server_knowledge: knowledge }),
      await this.request(
        'GET',
        `${this.plan(budgetId)}/categories`,
        undefined,
        delta(lastKnowledge)
      )
    );
    return { categoryGroups: data.category_groups, serverKnowledge: data.server_knowledge };
  }
  async getCategory(budgetId: string, categoryId: string) {
    return exactResource(
      parseResponse(
        z.object({ category: categorySchema }),
        await this.request('GET', `${this.plan(budgetId)}/categories/${routeId(categoryId)}`)
      ).category,
      categoryId
    );
  }
  async getCategoryByMonth(budgetId: string, value: string, categoryId: string) {
    return exactResource(
      parseResponse(
        z.object({ category: categorySchema }),
        await this.request(
          'GET',
          `${this.plan(budgetId)}/months/${month(value)}/categories/${routeId(categoryId)}`
        )
      ).category,
      categoryId
    );
  }
  async updateCategory(budgetId: string, categoryId: string, category: RecordData) {
    return parseResponse(
      z.object({ category: categorySchema }),
      await this.request('PATCH', `${this.plan(budgetId)}/categories/${routeId(categoryId)}`, {
        category
      })
    ).category;
  }
  async updateMonthCategory(
    budgetId: string,
    value: string,
    categoryId: string,
    budgeted: number
  ) {
    return parseResponse(
      z.object({ category: categorySchema }),
      await this.request(
        'PATCH',
        `${this.plan(budgetId)}/months/${month(value)}/categories/${routeId(categoryId)}`,
        { category: { budgeted } }
      )
    ).category;
  }
  async createCategoryGroup(budgetId: string, group: { name: string }) {
    return parseResponse(
      z.object({ category_group: groupSchema }),
      await this.request('POST', `${this.plan(budgetId)}/category_groups`, {
        category_group: group
      })
    ).category_group;
  }
  async updateCategoryGroup(budgetId: string, groupId: string, group: { name: string }) {
    return parseResponse(
      z.object({ category_group: groupSchema }),
      await this.request(
        'PATCH',
        `${this.plan(budgetId)}/category_groups/${routeId(groupId)}`,
        { category_group: group }
      )
    ).category_group;
  }
  async createCategory(budgetId: string, category: RecordData) {
    return parseResponse(
      z.object({ category: categorySchema }),
      await this.request('POST', `${this.plan(budgetId)}/categories`, { category })
    ).category;
  }
  async getPayees(budgetId: string, lastKnowledge?: number) {
    const data = parseResponse(
      z.object({ payees: z.array(payeeSchema), server_knowledge: knowledge }),
      await this.request(
        'GET',
        `${this.plan(budgetId)}/payees`,
        undefined,
        delta(lastKnowledge)
      )
    );
    return { payees: data.payees, serverKnowledge: data.server_knowledge };
  }
  async getPayee(budgetId: string, payeeId: string) {
    return exactResource(
      parseResponse(
        z.object({ payee: payeeSchema }),
        await this.request('GET', `${this.plan(budgetId)}/payees/${routeId(payeeId)}`)
      ).payee,
      payeeId
    );
  }
  async createPayee(budgetId: string, name: string) {
    return parseResponse(
      z.object({ payee: payeeSchema }),
      await this.request('POST', `${this.plan(budgetId)}/payees`, { payee: { name } })
    ).payee;
  }
  async updatePayee(budgetId: string, payeeId: string, payee: { name: string }) {
    return parseResponse(
      z.object({ payee: payeeSchema }),
      await this.request('PATCH', `${this.plan(budgetId)}/payees/${routeId(payeeId)}`, {
        payee
      })
    ).payee;
  }
  async getTransactions(budgetId: string, options: TransactionOptions = {}) {
    if (
      [options.accountId, options.categoryId, options.payeeId, options.month].filter(
        value => value !== undefined
      ).length > 1
    )
      throw invalid('Use at most one accountId, categoryId, payeeId, or month filter.');
    const since = options.sinceDate === undefined ? undefined : date(options.sinceDate);
    const until = options.untilDate === undefined ? undefined : date(options.untilDate);
    if (since && until && since > until) throw invalid('sinceDate cannot be after untilDate.');
    let path = this.plan(budgetId);
    if (options.accountId !== undefined) path += `/accounts/${routeId(options.accountId)}`;
    if (options.categoryId !== undefined) path += `/categories/${routeId(options.categoryId)}`;
    if (options.payeeId !== undefined) path += `/payees/${routeId(options.payeeId)}`;
    if (options.month !== undefined) path += `/months/${month(options.month)}`;
    const data = parseResponse(
      z.object({
        transactions: z.array(transactionSchema),
        server_knowledge: knowledge.optional()
      }),
      await this.request('GET', `${path}/transactions`, undefined, {
        since_date: since,
        until_date: until,
        type: options.type,
        ...delta(options.lastKnowledge)
      })
    );
    if (
      options.categoryId === undefined &&
      options.payeeId === undefined &&
      data.server_knowledge === undefined
    )
      throw createApiServiceError('YNAB omitted required transaction sync knowledge.', {
        reason: 'ynab_response'
      });
    return { transactions: data.transactions, serverKnowledge: data.server_knowledge };
  }
  async getTransaction(budgetId: string, id: string) {
    return exactResource(
      parseResponse(
        z.object({ transaction: transactionSchema }),
        await this.request('GET', `${this.plan(budgetId)}/transactions/${routeId(id)}`)
      ).transaction,
      id
    );
  }
  async createTransactions(budgetId: string, transactions: RecordData[]) {
    return parseResponse(
      savedSchema,
      await this.request(
        'POST',
        `${this.plan(budgetId)}/transactions`,
        transactions.length === 1 ? { transaction: transactions[0] } : { transactions }
      )
    );
  }
  async updateTransaction(budgetId: string, id: string, transaction: RecordData) {
    return parseResponse(
      z.object({ transaction: transactionSchema }),
      await this.request('PUT', `${this.plan(budgetId)}/transactions/${routeId(id)}`, {
        transaction
      })
    ).transaction;
  }
  async deleteTransaction(budgetId: string, id: string) {
    const t = parseResponse(
      z.object({ transaction: transactionSchema }),
      await this.request('DELETE', `${this.plan(budgetId)}/transactions/${routeId(id)}`)
    ).transaction;
    if (t.id !== id || !t.deleted)
      throw createApiServiceError(
        'YNAB did not confirm deletion of this transaction. Read it before retrying.',
        { reason: 'ynab_response' }
      );
    return t;
  }
  async importTransactions(budgetId: string) {
    return parseResponse(
      z.object({ transaction_ids: z.array(z.string().min(1)) }),
      await this.request('POST', `${this.plan(budgetId)}/transactions/import`)
    );
  }
  async getScheduledTransactions(budgetId: string, lastKnowledge?: number) {
    const data = parseResponse(
      z.object({
        scheduled_transactions: z.array(scheduledSchema),
        server_knowledge: knowledge
      }),
      await this.request(
        'GET',
        `${this.plan(budgetId)}/scheduled_transactions`,
        undefined,
        delta(lastKnowledge)
      )
    );
    return {
      scheduledTransactions: data.scheduled_transactions,
      serverKnowledge: data.server_knowledge
    };
  }
  async getScheduledTransaction(budgetId: string, id: string) {
    return exactResource(
      parseResponse(
        z.object({ scheduled_transaction: scheduledSchema }),
        await this.request(
          'GET',
          `${this.plan(budgetId)}/scheduled_transactions/${routeId(id)}`
        )
      ).scheduled_transaction,
      id
    );
  }
  async createScheduledTransaction(budgetId: string, transaction: RecordData) {
    return parseResponse(
      z.object({ scheduled_transaction: scheduledSchema }),
      await this.request('POST', `${this.plan(budgetId)}/scheduled_transactions`, {
        scheduled_transaction: transaction
      })
    ).scheduled_transaction;
  }
  async updateScheduledTransaction(budgetId: string, id: string, transaction: RecordData) {
    return parseResponse(
      z.object({ scheduled_transaction: scheduledSchema }),
      await this.request(
        'PUT',
        `${this.plan(budgetId)}/scheduled_transactions/${routeId(id)}`,
        { scheduled_transaction: transaction }
      )
    ).scheduled_transaction;
  }
  async deleteScheduledTransaction(budgetId: string, id: string) {
    const t = parseResponse(
      z.object({ scheduled_transaction: scheduledSchema }),
      await this.request(
        'DELETE',
        `${this.plan(budgetId)}/scheduled_transactions/${routeId(id)}`
      )
    ).scheduled_transaction;
    if (t.id !== id || !t.deleted)
      throw createApiServiceError(
        'YNAB did not confirm deletion of this scheduled transaction. Read it before retrying.',
        { reason: 'ynab_response' }
      );
    return t;
  }
  async getMonths(budgetId: string, lastKnowledge?: number) {
    const data = parseResponse(
      z.object({ months: z.array(monthSchema), server_knowledge: knowledge }),
      await this.request(
        'GET',
        `${this.plan(budgetId)}/months`,
        undefined,
        delta(lastKnowledge)
      )
    );
    return { months: data.months, serverKnowledge: data.server_knowledge };
  }
  async getMonth(budgetId: string, value: string) {
    const expectedMonth = month(value);
    const result = parseResponse(
      z.object({ month: monthDetailSchema }),
      await this.request('GET', `${this.plan(budgetId)}/months/${expectedMonth}`)
    ).month;
    if (result.month !== expectedMonth)
      throw createApiServiceError('YNAB returned a different month than requested.', {
        reason: 'ynab_response'
      });
    return result;
  }
}
