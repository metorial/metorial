import { createAxios } from 'slates';

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.ynab.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── User ──

  async getUser(): Promise<any> {
    let response = await this.http.get('/user');
    return response.data?.data?.user;
  }

  // ── Budgets (Plans) ──

  async getBudgets(includeAccounts?: boolean): Promise<any[]> {
    let params: Record<string, string> = {};
    if (includeAccounts) params.include_accounts = 'true';
    let response = await this.http.get('/budgets', { params });
    return response.data?.data?.budgets ?? [];
  }

  async getBudget(budgetId: string, lastKnowledge?: number): Promise<any> {
    let params: Record<string, string> = {};
    if (lastKnowledge !== undefined) params.last_knowledge_of_server = String(lastKnowledge);
    let response = await this.http.get(`/budgets/${budgetId}`, { params });
    return response.data?.data;
  }

  async getBudgetSettings(budgetId: string): Promise<any> {
    let response = await this.http.get(`/budgets/${budgetId}/settings`);
    return response.data?.data?.settings;
  }

  // ── Accounts ──

  async getAccounts(
    budgetId: string,
    lastKnowledge?: number
  ): Promise<{ accounts: any[]; serverKnowledge: number }> {
    let params: Record<string, string> = {};
    if (lastKnowledge !== undefined) params.last_knowledge_of_server = String(lastKnowledge);
    let response = await this.http.get(`/budgets/${budgetId}/accounts`, { params });
    return {
      accounts: response.data?.data?.accounts ?? [],
      serverKnowledge: response.data?.data?.server_knowledge
    };
  }

  async getAccount(budgetId: string, accountId: string): Promise<any> {
    let response = await this.http.get(`/budgets/${budgetId}/accounts/${accountId}`);
    return response.data?.data?.account;
  }

  async createAccount(
    budgetId: string,
    account: {
      name: string;
      type: string;
      balance: number;
    }
  ): Promise<any> {
    let response = await this.http.post(`/budgets/${budgetId}/accounts`, { account });
    return response.data?.data?.account;
  }

  // ── Categories ──

  async getCategories(
    budgetId: string,
    lastKnowledge?: number
  ): Promise<{ categoryGroups: any[]; serverKnowledge: number }> {
    let params: Record<string, string> = {};
    if (lastKnowledge !== undefined) params.last_knowledge_of_server = String(lastKnowledge);
    let response = await this.http.get(`/budgets/${budgetId}/categories`, { params });
    return {
      categoryGroups: response.data?.data?.category_groups ?? [],
      serverKnowledge: response.data?.data?.server_knowledge
    };
  }

  async getCategory(budgetId: string, categoryId: string): Promise<any> {
    let response = await this.http.get(`/budgets/${budgetId}/categories/${categoryId}`);
    return response.data?.data?.category;
  }

  async getCategoryByMonth(budgetId: string, month: string, categoryId: string): Promise<any> {
    let response = await this.http.get(
      `/budgets/${budgetId}/months/${month}/categories/${categoryId}`
    );
    return response.data?.data?.category;
  }

  async updateCategory(
    budgetId: string,
    categoryId: string,
    category: {
      name?: string;
      note?: string;
      goal_type?: string | null;
      goal_target?: number | null;
      goal_target_month?: string | null;
      goal_day?: number | null;
    }
  ): Promise<any> {
    let response = await this.http.patch(`/budgets/${budgetId}/categories/${categoryId}`, {
      category
    });
    return response.data?.data?.category;
  }

  async updateMonthCategory(
    budgetId: string,
    month: string,
    categoryId: string,
    budgeted: number
  ): Promise<any> {
    let response = await this.http.patch(
      `/budgets/${budgetId}/months/${month}/categories/${categoryId}`,
      {
        category: { budgeted }
      }
    );
    return response.data?.data?.category;
  }

  async createCategoryGroup(
    budgetId: string,
    categoryGroup: {
      name: string;
    }
  ): Promise<any> {
    let response = await this.http.post(`/budgets/${budgetId}/category_groups`, {
      category_group: categoryGroup
    });
    return response.data?.data?.category_group;
  }

  async updateCategoryGroup(
    budgetId: string,
    categoryGroupId: string,
    categoryGroup: {
      name?: string;
    }
  ): Promise<any> {
    let response = await this.http.patch(
      `/budgets/${budgetId}/category_groups/${categoryGroupId}`,
      { category_group: categoryGroup }
    );
    return response.data?.data?.category_group;
  }

  async createCategory(
    budgetId: string,
    category: {
      name: string;
      category_group_id: string;
    }
  ): Promise<any> {
    let response = await this.http.post(`/budgets/${budgetId}/categories`, { category });
    return response.data?.data?.category;
  }

  // ── Payees ──

  async getPayees(
    budgetId: string,
    lastKnowledge?: number
  ): Promise<{ payees: any[]; serverKnowledge: number }> {
    let params: Record<string, string> = {};
    if (lastKnowledge !== undefined) params.last_knowledge_of_server = String(lastKnowledge);
    let response = await this.http.get(`/budgets/${budgetId}/payees`, { params });
    return {
      payees: response.data?.data?.payees ?? [],
      serverKnowledge: response.data?.data?.server_knowledge
    };
  }

  async getPayee(budgetId: string, payeeId: string): Promise<any> {
    let response = await this.http.get(`/budgets/${budgetId}/payees/${payeeId}`);
    return response.data?.data?.payee;
  }

  async updatePayee(
    budgetId: string,
    payeeId: string,
    payee: {
      name?: string;
    }
  ): Promise<any> {
    let response = await this.http.patch(`/budgets/${budgetId}/payees/${payeeId}`, { payee });
    return response.data?.data?.payee;
  }

  async getPayeeLocations(budgetId: string): Promise<any[]> {
    let response = await this.http.get(`/budgets/${budgetId}/payee_locations`);
    return response.data?.data?.payee_locations ?? [];
  }

  async getPayeeLocationsByPayee(budgetId: string, payeeId: string): Promise<any[]> {
    let response = await this.http.get(
      `/budgets/${budgetId}/payees/${payeeId}/payee_locations`
    );
    return response.data?.data?.payee_locations ?? [];
  }

  // ── Transactions ──

  async getTransactions(
    budgetId: string,
    options?: {
      sinceDate?: string;
      type?: string;
      lastKnowledge?: number;
    }
  ): Promise<{ transactions: any[]; serverKnowledge: number }> {
    let params: Record<string, string> = {};
    if (options?.sinceDate) params.since_date = options.sinceDate;
    if (options?.type) params.type = options.type;
    if (options?.lastKnowledge !== undefined)
      params.last_knowledge_of_server = String(options.lastKnowledge);
    let response = await this.http.get(`/budgets/${budgetId}/transactions`, { params });
    return {
      transactions: response.data?.data?.transactions ?? [],
      serverKnowledge: response.data?.data?.server_knowledge
    };
  }

  async getTransaction(budgetId: string, transactionId: string): Promise<any> {
    let response = await this.http.get(`/budgets/${budgetId}/transactions/${transactionId}`);
    return response.data?.data?.transaction;
  }

  async getTransactionsByAccount(
    budgetId: string,
    accountId: string,
    options?: {
      sinceDate?: string;
      type?: string;
      lastKnowledge?: number;
    }
  ): Promise<{ transactions: any[]; serverKnowledge: number }> {
    let params: Record<string, string> = {};
    if (options?.sinceDate) params.since_date = options.sinceDate;
    if (options?.type) params.type = options.type;
    if (options?.lastKnowledge !== undefined)
      params.last_knowledge_of_server = String(options.lastKnowledge);
    let response = await this.http.get(
      `/budgets/${budgetId}/accounts/${accountId}/transactions`,
      { params }
    );
    return {
      transactions: response.data?.data?.transactions ?? [],
      serverKnowledge: response.data?.data?.server_knowledge
    };
  }

  async getTransactionsByCategory(
    budgetId: string,
    categoryId: string,
    options?: {
      sinceDate?: string;
      type?: string;
      lastKnowledge?: number;
    }
  ): Promise<any[]> {
    let params: Record<string, string> = {};
    if (options?.sinceDate) params.since_date = options.sinceDate;
    if (options?.type) params.type = options.type;
    if (options?.lastKnowledge !== undefined)
      params.last_knowledge_of_server = String(options.lastKnowledge);
    let response = await this.http.get(
      `/budgets/${budgetId}/categories/${categoryId}/transactions`,
      { params }
    );
    return response.data?.data?.transactions ?? [];
  }

  async getTransactionsByPayee(
    budgetId: string,
    payeeId: string,
    options?: {
      sinceDate?: string;
      type?: string;
      lastKnowledge?: number;
    }
  ): Promise<any[]> {
    let params: Record<string, string> = {};
    if (options?.sinceDate) params.since_date = options.sinceDate;
    if (options?.type) params.type = options.type;
    if (options?.lastKnowledge !== undefined)
      params.last_knowledge_of_server = String(options.lastKnowledge);
    let response = await this.http.get(`/budgets/${budgetId}/payees/${payeeId}/transactions`, {
      params
    });
    return response.data?.data?.transactions ?? [];
  }

  async getTransactionsByMonth(
    budgetId: string,
    month: string,
    options?: {
      sinceDate?: string;
      type?: string;
      lastKnowledge?: number;
    }
  ): Promise<any[]> {
    let params: Record<string, string> = {};
    if (options?.sinceDate) params.since_date = options.sinceDate;
    if (options?.type) params.type = options.type;
    if (options?.lastKnowledge !== undefined)
      params.last_knowledge_of_server = String(options.lastKnowledge);
    let response = await this.http.get(`/budgets/${budgetId}/months/${month}/transactions`, {
      params
    });
    return response.data?.data?.transactions ?? [];
  }

  async createTransaction(budgetId: string, transaction: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/budgets/${budgetId}/transactions`, { transaction });
    return response.data?.data;
  }

  async createTransactions(
    budgetId: string,
    transactions: Record<string, any>[]
  ): Promise<any> {
    let response = await this.http.post(`/budgets/${budgetId}/transactions`, { transactions });
    return response.data?.data;
  }

  async updateTransaction(
    budgetId: string,
    transactionId: string,
    transaction: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put(`/budgets/${budgetId}/transactions/${transactionId}`, {
      transaction
    });
    return response.data?.data?.transaction;
  }

  async updateTransactions(
    budgetId: string,
    transactions: Record<string, any>[]
  ): Promise<any> {
    let response = await this.http.patch(`/budgets/${budgetId}/transactions`, {
      transactions
    });
    return response.data?.data;
  }

  async deleteTransaction(budgetId: string, transactionId: string): Promise<any> {
    let response = await this.http.delete(
      `/budgets/${budgetId}/transactions/${transactionId}`
    );
    return response.data?.data?.transaction;
  }

  async importTransactions(budgetId: string): Promise<any> {
    let response = await this.http.post(`/budgets/${budgetId}/transactions/import`);
    return response.data?.data;
  }

  // ── Scheduled Transactions ──

  async getScheduledTransactions(
    budgetId: string,
    lastKnowledge?: number
  ): Promise<{ scheduledTransactions: any[]; serverKnowledge: number }> {
    let params: Record<string, string> = {};
    if (lastKnowledge !== undefined) params.last_knowledge_of_server = String(lastKnowledge);
    let response = await this.http.get(`/budgets/${budgetId}/scheduled_transactions`, {
      params
    });
    return {
      scheduledTransactions: response.data?.data?.scheduled_transactions ?? [],
      serverKnowledge: response.data?.data?.server_knowledge
    };
  }

  async getScheduledTransaction(
    budgetId: string,
    scheduledTransactionId: string
  ): Promise<any> {
    let response = await this.http.get(
      `/budgets/${budgetId}/scheduled_transactions/${scheduledTransactionId}`
    );
    return response.data?.data?.scheduled_transaction;
  }

  async createScheduledTransaction(
    budgetId: string,
    scheduledTransaction: Record<string, any>
  ): Promise<any> {
    let response = await this.http.post(`/budgets/${budgetId}/scheduled_transactions`, {
      scheduled_transaction: scheduledTransaction
    });
    return response.data?.data?.scheduled_transaction;
  }

  async updateScheduledTransaction(
    budgetId: string,
    scheduledTransactionId: string,
    scheduledTransaction: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put(
      `/budgets/${budgetId}/scheduled_transactions/${scheduledTransactionId}`,
      { scheduled_transaction: scheduledTransaction }
    );
    return response.data?.data?.scheduled_transaction;
  }

  async deleteScheduledTransaction(
    budgetId: string,
    scheduledTransactionId: string
  ): Promise<any> {
    let response = await this.http.delete(
      `/budgets/${budgetId}/scheduled_transactions/${scheduledTransactionId}`
    );
    return response.data?.data?.scheduled_transaction;
  }

  // ── Months ──

  async getMonths(
    budgetId: string,
    lastKnowledge?: number
  ): Promise<{ months: any[]; serverKnowledge: number }> {
    let params: Record<string, string> = {};
    if (lastKnowledge !== undefined) params.last_knowledge_of_server = String(lastKnowledge);
    let response = await this.http.get(`/budgets/${budgetId}/months`, { params });
    return {
      months: response.data?.data?.months ?? [],
      serverKnowledge: response.data?.data?.server_knowledge
    };
  }

  async getMonth(budgetId: string, month: string): Promise<any> {
    let response = await this.http.get(`/budgets/${budgetId}/months/${month}`);
    return response.data?.data?.month;
  }

  // ── Money Movements ──

  async getMoneyMovements(budgetId: string, month?: string): Promise<any[]> {
    let path = month
      ? `/budgets/${budgetId}/months/${month}/money_movements`
      : `/budgets/${budgetId}/money_movements`;
    let response = await this.http.get(path);
    return response.data?.data?.money_movements ?? [];
  }

  async getMoneyMovementGroups(budgetId: string, month?: string): Promise<any[]> {
    let path = month
      ? `/budgets/${budgetId}/months/${month}/money_movement_groups`
      : `/budgets/${budgetId}/money_movement_groups`;
    let response = await this.http.get(path);
    return response.data?.data?.money_movement_groups ?? [];
  }
}
