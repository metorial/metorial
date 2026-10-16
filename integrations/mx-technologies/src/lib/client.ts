import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  production: 'https://api.mx.com',
  development: 'https://int-api.mx.com'
};

export class MxClient {
  private axios;
  private baseURL: string;

  constructor(opts: { token: string; environment: string }) {
    let baseURL = BASE_URLS[opts.environment];
    if (!baseURL)
      throw createApiServiceError('Choose the development or production MX environment.');
    if (!opts.token.trim())
      throw createApiServiceError('Reconnect with your MX API credentials.');
    this.baseURL = baseURL;
    this.axios = createAuthenticatedAxios({
      baseURL,
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'MX', reason: 'mx_api_error' }),
      headers: {
        Authorization: `Basic ${opts.token}`,
        Accept: 'application/vnd.mx.api.v1+json',
        'Content-Type': 'application/json'
      }
    });
    this.axios.interceptors.response.use(response => {
      if (response.status !== 204) this.resource(response.data, 'API');
      return response;
    });
    this.axios.interceptors.request.use(request => {
      let { page, records_per_page } = request.params ?? {};
      if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
        throw createApiServiceError('page must be a positive integer.');
      }
      if (
        records_per_page !== undefined &&
        (!Number.isInteger(records_per_page) ||
          records_per_page < 10 ||
          records_per_page > 1000)
      ) {
        throw createApiServiceError(
          'recordsPerPage must be an integer from 10 to 1000 (maximum 100 for default categories and insights).'
        );
      }
      if (
        records_per_page > 100 &&
        /\/(?:categories\/default|insights)$/.test(request.url ?? '')
      ) {
        throw createApiServiceError(
          'recordsPerPage must be at most 100 for default categories and insights.'
        );
      }
      let { from_date, to_date } = request.params ?? {};
      for (let date of [from_date, to_date]) {
        if (
          date !== undefined &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            !Number.isFinite(Date.parse(date)) ||
            new Date(date).toISOString().slice(0, 10) !== date)
        ) {
          throw createApiServiceError(
            'Date filters must be valid calendar dates in YYYY-MM-DD format.'
          );
        }
      }
      if (from_date && to_date && from_date > to_date)
        throw createApiServiceError('fromDate must be on or before toDate.');
      return request;
    });
  }

  private collection(value: unknown, name: string) {
    if (
      !Array.isArray(value) ||
      value.some(item => !item || typeof item !== 'object' || Array.isArray(item))
    )
      throw createApiServiceError(
        `MX returned an invalid ${name} response. Retry the request.`
      );
    return value;
  }

  private resource(value: unknown, name: string): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw createApiServiceError(
        `MX returned an invalid ${name} response. Retry the request.`
      );
    return value as Record<string, any>;
  }

  // ── Users ──────────────────────────────────────────────

  async createUser(params: { id?: string; metadata?: string; isDisabled?: boolean }) {
    if (Object.values(params).every(value => value === undefined))
      throw createApiServiceError('Provide an id or metadata when creating a user.');
    let res = await this.axios.post('/users', {
      user: {
        id: params.id,
        metadata: params.metadata,
        is_disabled: params.isDisabled
      }
    });
    return this.resource(res.data.user, 'user');
  }

  async listUsers(params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get('/users', {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return {
      users: this.collection(res.data.users, 'users'),
      pagination: res.data.pagination
    };
  }

  async readUser(userGuid: string) {
    let res = await this.axios.get(`/users/${encodeURIComponent(userGuid)}`);
    return this.resource(res.data.user, 'user');
  }

  async updateUser(
    userGuid: string,
    params: { id?: string; metadata?: string; isDisabled?: boolean }
  ) {
    let res = await this.axios.put(`/users/${encodeURIComponent(userGuid)}`, {
      user: {
        id: params.id,
        metadata: params.metadata,
        is_disabled: params.isDisabled
      }
    });
    return this.resource(res.data.user, 'user');
  }

  async deleteUser(userGuid: string) {
    await this.axios.delete(`/users/${encodeURIComponent(userGuid)}`);
  }

  // ── Members ────────────────────────────────────────────

  async createMember(
    userGuid: string,
    params: {
      institutionCode: string;
      credentials: Array<{ guid: string; value: string }>;
      id?: string;
      metadata?: string;
      skipAggregation?: boolean;
      useCases?: Array<'PFM' | 'MONEY_MOVEMENT'>;
    }
  ) {
    let res = await this.axios.post(`/users/${encodeURIComponent(userGuid)}/members`, {
      member: {
        institution_code: params.institutionCode,
        credentials: params.credentials,
        id: params.id,
        metadata: params.metadata,
        skip_aggregation: params.skipAggregation,
        use_cases: params.useCases
      }
    });
    return this.resource(res.data.member, 'member');
  }

  async listMembers(userGuid: string, params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get(`/users/${encodeURIComponent(userGuid)}/members`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return {
      members: this.collection(res.data.members, 'members'),
      pagination: res.data.pagination
    };
  }

  async readMember(userGuid: string, memberGuid: string) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}`
    );
    return this.resource(res.data.member, 'member');
  }

  async updateMember(
    userGuid: string,
    memberGuid: string,
    params: {
      credentials?: Array<{ guid: string; value: string }>;
      id?: string;
      metadata?: string;
    }
  ) {
    let res = await this.axios.put(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}`,
      {
        member: {
          credentials: params.credentials,
          id: params.id,
          metadata: params.metadata
        }
      }
    );
    return this.resource(res.data.member, 'member');
  }

  async deleteMember(userGuid: string, memberGuid: string) {
    await this.axios.delete(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}`
    );
  }

  async readMemberStatus(userGuid: string, memberGuid: string) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/status`
    );
    return this.resource(res.data.member, 'member');
  }

  async aggregateMember(userGuid: string, memberGuid: string) {
    let res = await this.axios.post(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/aggregate`
    );
    return this.resource(res.data.member, 'member');
  }

  async verifyMember(userGuid: string, memberGuid: string) {
    let res = await this.axios.post(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/verify`
    );
    return this.resource(res.data.member, 'member');
  }

  async identifyMember(userGuid: string, memberGuid: string) {
    let res = await this.axios.post(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/identify`
    );
    return this.resource(res.data.member, 'member');
  }

  async checkBalance(userGuid: string, memberGuid: string) {
    let res = await this.axios.post(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/check_balance`
    );
    return this.resource(res.data.member, 'member');
  }

  async extendHistory(userGuid: string, memberGuid: string) {
    let res = await this.axios.post(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/extend_history`
    );
    return this.resource(res.data.member, 'member');
  }

  async fetchStatements(userGuid: string, memberGuid: string) {
    let res = await this.axios.post(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/fetch_statements`
    );
    return this.resource(res.data.member, 'member');
  }

  async listMemberCredentials(
    userGuid: string,
    memberGuid: string,
    params?: { page?: number; recordsPerPage?: number }
  ) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/credentials`,
      { params: { page: params?.page, records_per_page: params?.recordsPerPage } }
    );
    return {
      credentials: this.collection(res.data.credentials, 'credentials'),
      pagination: res.data.pagination
    };
  }

  async listMfaChallenges(
    userGuid: string,
    memberGuid: string,
    params?: { page?: number; recordsPerPage?: number }
  ) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/challenges`,
      { params: { page: params?.page, records_per_page: params?.recordsPerPage } }
    );
    if (res.status === 204) return { challenges: [], pagination: undefined };
    return {
      challenges: this.collection(res.data.challenges, 'challenges'),
      pagination: res.data.pagination
    };
  }

  async resumeMfaChallenge(
    userGuid: string,
    memberGuid: string,
    challenges: Array<{ guid: string; value: string }>
  ) {
    let res = await this.axios.put(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/resume`,
      {
        member: { challenges }
      }
    );
    return this.resource(res.data.member, 'member');
  }

  // ── Accounts ───────────────────────────────────────────

  async listAccounts(userGuid: string, params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get(`/users/${encodeURIComponent(userGuid)}/accounts`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return {
      accounts: this.collection(res.data.accounts, 'accounts'),
      pagination: res.data.pagination
    };
  }

  async listAccountsByMember(
    userGuid: string,
    memberGuid: string,
    params?: { page?: number; recordsPerPage?: number }
  ) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/accounts`,
      {
        params: {
          page: params?.page,
          records_per_page: params?.recordsPerPage
        }
      }
    );
    return {
      accounts: this.collection(res.data.accounts, 'accounts'),
      pagination: res.data.pagination
    };
  }

  async readAccount(userGuid: string, accountGuid: string) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/accounts/${encodeURIComponent(accountGuid)}`
    );
    return this.resource(res.data.account, 'account');
  }

  async listAccountNumbers(
    userGuid: string,
    accountGuid: string,
    params?: { page?: number; recordsPerPage?: number }
  ) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/accounts/${encodeURIComponent(accountGuid)}/account_numbers`,
      { params: { page: params?.page, records_per_page: params?.recordsPerPage } }
    );
    return {
      accountNumbers: this.collection(res.data.account_numbers, 'account_numbers'),
      pagination: res.data.pagination
    };
  }

  async listAccountOwners(
    userGuid: string,
    memberGuid: string,
    params?: { page?: number; recordsPerPage?: number }
  ) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/account_owners`,
      { params: { page: params?.page, records_per_page: params?.recordsPerPage } }
    );
    return {
      accountOwners: this.collection(res.data.account_owners, 'account_owners'),
      pagination: res.data.pagination
    };
  }

  // ── Transactions ───────────────────────────────────────

  async listTransactions(
    userGuid: string,
    params?: {
      page?: number;
      recordsPerPage?: number;
      fromDate?: string;
      toDate?: string;
    }
  ) {
    let res = await this.axios.get(`/users/${encodeURIComponent(userGuid)}/transactions`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage,
        from_date: params?.fromDate,
        to_date: params?.toDate
      }
    });
    return {
      transactions: this.collection(res.data.transactions, 'transactions'),
      pagination: res.data.pagination
    };
  }

  async listTransactionsByAccount(
    userGuid: string,
    accountGuid: string,
    params?: {
      page?: number;
      recordsPerPage?: number;
      fromDate?: string;
      toDate?: string;
    }
  ) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/accounts/${encodeURIComponent(accountGuid)}/transactions`,
      {
        params: {
          page: params?.page,
          records_per_page: params?.recordsPerPage,
          from_date: params?.fromDate,
          to_date: params?.toDate
        }
      }
    );
    return {
      transactions: this.collection(res.data.transactions, 'transactions'),
      pagination: res.data.pagination
    };
  }

  async listTransactionsByMember(
    userGuid: string,
    memberGuid: string,
    params?: {
      page?: number;
      recordsPerPage?: number;
      fromDate?: string;
      toDate?: string;
    }
  ) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/transactions`,
      {
        params: {
          page: params?.page,
          records_per_page: params?.recordsPerPage,
          from_date: params?.fromDate,
          to_date: params?.toDate
        }
      }
    );
    return {
      transactions: this.collection(res.data.transactions, 'transactions'),
      pagination: res.data.pagination
    };
  }

  async readTransaction(userGuid: string, transactionGuid: string) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/transactions/${encodeURIComponent(transactionGuid)}`
    );
    return this.resource(res.data.transaction, 'transaction');
  }

  // ── Institutions ───────────────────────────────────────

  async listInstitutions(params?: {
    name?: string;
    page?: number;
    recordsPerPage?: number;
    supportsAccountVerification?: boolean;
  }) {
    let res = await this.axios.get('/institutions', {
      params: {
        name: params?.name,
        page: params?.page,
        records_per_page: params?.recordsPerPage,
        supports_account_verification: params?.supportsAccountVerification
      }
    });
    return {
      institutions: this.collection(res.data.institutions, 'institutions'),
      pagination: res.data.pagination
    };
  }

  async readInstitution(institutionCode: string) {
    let res = await this.axios.get(`/institutions/${encodeURIComponent(institutionCode)}`);
    return this.resource(res.data.institution, 'institution');
  }

  async listInstitutionCredentials(institutionCode: string) {
    let res = await this.axios.get(
      `/institutions/${encodeURIComponent(institutionCode)}/credentials`
    );
    return this.collection(res.data.credentials, 'credentials');
  }

  // ── Holdings ───────────────────────────────────────────

  async listHoldings(userGuid: string, params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/investment_holdings`,
      {
        params: {
          page: params?.page,
          records_per_page: params?.recordsPerPage
        }
      }
    );
    return {
      holdings: this.collection(res.data.investment_holdings, 'investment_holdings'),
      pagination: res.data.pagination
    };
  }

  async listHoldingsByAccount(
    userGuid: string,
    accountGuid: string,
    params?: { page?: number; recordsPerPage?: number }
  ) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/accounts/${encodeURIComponent(accountGuid)}/investment_holdings`,
      {
        params: {
          page: params?.page,
          records_per_page: params?.recordsPerPage
        }
      }
    );
    return {
      holdings: this.collection(res.data.investment_holdings, 'investment_holdings'),
      pagination: res.data.pagination
    };
  }

  async listHoldingsByMember(
    userGuid: string,
    memberGuid: string,
    params?: { page?: number; recordsPerPage?: number }
  ) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/investment_holdings`,
      {
        params: {
          page: params?.page,
          records_per_page: params?.recordsPerPage
        }
      }
    );
    return {
      holdings: this.collection(res.data.investment_holdings, 'investment_holdings'),
      pagination: res.data.pagination
    };
  }

  async readHolding(userGuid: string, holdingGuid: string) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/investment_holdings/${encodeURIComponent(holdingGuid)}`
    );
    return this.resource(res.data.investment_holding, 'investment holding');
  }

  // ── Statements ─────────────────────────────────────────

  async listStatements(
    userGuid: string,
    memberGuid: string,
    params?: { page?: number; recordsPerPage?: number }
  ) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/statements`,
      {
        params: {
          page: params?.page,
          records_per_page: params?.recordsPerPage
        }
      }
    );
    return {
      statements: this.collection(res.data.statements, 'statements'),
      pagination: res.data.pagination
    };
  }

  async readStatement(userGuid: string, memberGuid: string, statementGuid: string) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/statements/${encodeURIComponent(statementGuid)}`
    );
    return this.resource(res.data.statement, 'statement');
  }

  statementDownloadUrl(userGuid: string, memberGuid: string, statementGuid: string) {
    return `${this.baseURL}/users/${encodeURIComponent(userGuid)}/members/${encodeURIComponent(memberGuid)}/statements/${encodeURIComponent(statementGuid)}.pdf`;
  }

  // ── Categories ─────────────────────────────────────────

  async listCategories(userGuid: string, params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get(`/users/${encodeURIComponent(userGuid)}/categories`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return {
      categories: this.collection(res.data.categories, 'categories'),
      pagination: res.data.pagination
    };
  }

  async listDefaultCategories(params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get('/categories/default', {
      params: { page: params?.page, records_per_page: params?.recordsPerPage }
    });
    return {
      categories: this.collection(res.data.categories, 'categories'),
      pagination: res.data.pagination
    };
  }

  // ── Data Enhancement ───────────────────────────────────

  async enhanceTransactions(
    transactions: Array<{
      amount?: number;
      description?: string;
      id: string;
      merchantCategoryCode?: number;
      type?: string;
    }>
  ) {
    if (!transactions.length)
      throw createApiServiceError('Provide at least one transaction to enhance.');
    for (let transaction of transactions) {
      if (!transaction.description?.trim())
        throw createApiServiceError('Each transaction requires a non-empty description.');
      if (
        transaction.merchantCategoryCode !== undefined &&
        !Number.isInteger(transaction.merchantCategoryCode)
      )
        throw createApiServiceError('merchantCategoryCode must be an integer.');
    }
    let res = await this.axios.post('/transactions/enhance', {
      transactions: transactions.map(t => ({
        amount: t.amount,
        description: t.description,
        id: t.id,
        merchant_category_code: t.merchantCategoryCode,
        type: t.type
      }))
    });
    return this.collection(res.data.transactions, 'transactions');
  }

  // ── Merchants ──────────────────────────────────────────

  async listMerchants(params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get('/merchants', {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return {
      merchants: this.collection(res.data.merchants, 'merchants'),
      pagination: res.data.pagination
    };
  }

  async readMerchant(merchantGuid: string) {
    let res = await this.axios.get(`/merchants/${encodeURIComponent(merchantGuid)}`);
    return this.resource(res.data.merchant, 'merchant');
  }

  // ── Widget URLs ────────────────────────────────────────

  async requestWidgetUrl(
    userGuid: string,
    params: {
      widgetType: string;
      colorScheme?: string;
      currentInstitutionCode?: string;
      currentMemberGuid?: string;
      disableInstitutionSearch?: boolean;
      mode?: string;
      uiMessageWebviewUrlScheme?: string;
      updateCredentials?: boolean;
      waitForFullAggregation?: boolean;
      useCases?: Array<'PFM' | 'MONEY_MOVEMENT'>;
    }
  ) {
    let res = await this.axios.post(`/users/${encodeURIComponent(userGuid)}/widget_urls`, {
      widget_url: {
        widget_type: params.widgetType,
        use_cases: params.useCases,
        color_scheme: params.colorScheme,
        current_institution_code: params.currentInstitutionCode,
        current_member_guid: params.currentMemberGuid,
        disable_institution_search: params.disableInstitutionSearch,
        mode: params.mode,
        ui_message_webview_url_scheme: params.uiMessageWebviewUrlScheme,
        update_credentials: params.updateCredentials,
        wait_for_full_aggregation: params.waitForFullAggregation
      }
    });
    return this.resource(res.data.widget_url, 'widget_url');
  }

  // ── Insights ───────────────────────────────────────────

  async listInsights(userGuid: string, params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get(`/users/${encodeURIComponent(userGuid)}/insights`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return {
      insights: this.collection(res.data.insights, 'insights'),
      pagination: res.data.pagination
    };
  }

  async readInsight(userGuid: string, insightGuid: string) {
    let res = await this.axios.get(
      `/users/${encodeURIComponent(userGuid)}/insights/${encodeURIComponent(insightGuid)}`
    );
    return this.resource(res.data.insight, 'insight');
  }

  // ── Tags ───────────────────────────────────────────────

  async listTags(userGuid: string, params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get(`/users/${encodeURIComponent(userGuid)}/tags`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return { tags: this.collection(res.data.tags, 'tags'), pagination: res.data.pagination };
  }

  async createTag(userGuid: string, name: string) {
    let res = await this.axios.post(`/users/${encodeURIComponent(userGuid)}/tags`, {
      tag: { name }
    });
    return this.resource(res.data.tag, 'tag');
  }

  // ── Taggings ───────────────────────────────────────────

  async createTagging(userGuid: string, params: { tagGuid: string; transactionGuid: string }) {
    let res = await this.axios.post(`/users/${encodeURIComponent(userGuid)}/taggings`, {
      tagging: {
        tag_guid: params.tagGuid,
        transaction_guid: params.transactionGuid
      }
    });
    return this.resource(res.data.tagging, 'tagging');
  }
}
