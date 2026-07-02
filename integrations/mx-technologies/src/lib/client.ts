import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  production: 'https://api.mx.com',
  development: 'https://int-api.mx.com'
};

export class MxClient {
  private axios;

  constructor(opts: { token: string; environment: string }) {
    let baseURL = BASE_URLS[opts.environment] || BASE_URLS.development!;
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Basic ${opts.token}`,
        Accept: 'application/vnd.mx.api.v1+json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Users ──────────────────────────────────────────────

  async createUser(params: { id?: string; metadata?: string; isDisabled?: boolean }) {
    let res = await this.axios.post('/users', {
      user: {
        id: params.id,
        metadata: params.metadata,
        is_disabled: params.isDisabled
      }
    });
    return res.data.user;
  }

  async listUsers(params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get('/users', {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return { users: res.data.users, pagination: res.data.pagination };
  }

  async readUser(userGuid: string) {
    let res = await this.axios.get(`/users/${userGuid}`);
    return res.data.user;
  }

  async updateUser(
    userGuid: string,
    params: { id?: string; metadata?: string; isDisabled?: boolean }
  ) {
    let res = await this.axios.put(`/users/${userGuid}`, {
      user: {
        id: params.id,
        metadata: params.metadata,
        is_disabled: params.isDisabled
      }
    });
    return res.data.user;
  }

  async deleteUser(userGuid: string) {
    await this.axios.delete(`/users/${userGuid}`);
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
    }
  ) {
    let res = await this.axios.post(`/users/${userGuid}/members`, {
      member: {
        institution_code: params.institutionCode,
        credentials: params.credentials,
        id: params.id,
        metadata: params.metadata,
        skip_aggregation: params.skipAggregation
      }
    });
    return res.data.member;
  }

  async listMembers(userGuid: string, params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get(`/users/${userGuid}/members`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return { members: res.data.members, pagination: res.data.pagination };
  }

  async readMember(userGuid: string, memberGuid: string) {
    let res = await this.axios.get(`/users/${userGuid}/members/${memberGuid}`);
    return res.data.member;
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
    let res = await this.axios.put(`/users/${userGuid}/members/${memberGuid}`, {
      member: {
        credentials: params.credentials,
        id: params.id,
        metadata: params.metadata
      }
    });
    return res.data.member;
  }

  async deleteMember(userGuid: string, memberGuid: string) {
    await this.axios.delete(`/users/${userGuid}/members/${memberGuid}`);
  }

  async readMemberStatus(userGuid: string, memberGuid: string) {
    let res = await this.axios.get(`/users/${userGuid}/members/${memberGuid}/status`);
    return res.data.member;
  }

  async aggregateMember(userGuid: string, memberGuid: string) {
    let res = await this.axios.post(`/users/${userGuid}/members/${memberGuid}/aggregate`);
    return res.data.member;
  }

  async verifyMember(userGuid: string, memberGuid: string) {
    let res = await this.axios.post(`/users/${userGuid}/members/${memberGuid}/verify`);
    return res.data.member;
  }

  async identifyMember(userGuid: string, memberGuid: string) {
    let res = await this.axios.post(`/users/${userGuid}/members/${memberGuid}/identify`);
    return res.data.member;
  }

  async checkBalance(userGuid: string, memberGuid: string) {
    let res = await this.axios.post(`/users/${userGuid}/members/${memberGuid}/check_balance`);
    return res.data.member;
  }

  async extendHistory(userGuid: string, memberGuid: string) {
    let res = await this.axios.post(`/users/${userGuid}/members/${memberGuid}/extend_history`);
    return res.data.member;
  }

  async fetchStatements(userGuid: string, memberGuid: string) {
    let res = await this.axios.post(
      `/users/${userGuid}/members/${memberGuid}/fetch_statements`
    );
    return res.data.member;
  }

  async listMemberCredentials(userGuid: string, memberGuid: string) {
    let res = await this.axios.get(`/users/${userGuid}/members/${memberGuid}/credentials`);
    return res.data.credentials;
  }

  async listMfaChallenges(userGuid: string, memberGuid: string) {
    let res = await this.axios.get(`/users/${userGuid}/members/${memberGuid}/challenges`);
    return res.data.challenges;
  }

  async resumeMfaChallenge(
    userGuid: string,
    memberGuid: string,
    challenges: Array<{ guid: string; value: string }>
  ) {
    let res = await this.axios.put(`/users/${userGuid}/members/${memberGuid}/resume`, {
      member: { challenges }
    });
    return res.data.member;
  }

  // ── Accounts ───────────────────────────────────────────

  async listAccounts(userGuid: string, params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get(`/users/${userGuid}/accounts`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return { accounts: res.data.accounts, pagination: res.data.pagination };
  }

  async listAccountsByMember(
    userGuid: string,
    memberGuid: string,
    params?: { page?: number; recordsPerPage?: number }
  ) {
    let res = await this.axios.get(`/users/${userGuid}/members/${memberGuid}/accounts`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return { accounts: res.data.accounts, pagination: res.data.pagination };
  }

  async readAccount(userGuid: string, accountGuid: string) {
    let res = await this.axios.get(`/users/${userGuid}/accounts/${accountGuid}`);
    return res.data.account;
  }

  async listAccountNumbers(userGuid: string, accountGuid: string) {
    let res = await this.axios.get(
      `/users/${userGuid}/accounts/${accountGuid}/account_numbers`
    );
    return res.data.account_numbers;
  }

  async listAccountOwners(userGuid: string, memberGuid: string) {
    let res = await this.axios.get(`/users/${userGuid}/members/${memberGuid}/account_owners`);
    return res.data.account_owners;
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
    let res = await this.axios.get(`/users/${userGuid}/transactions`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage,
        from_date: params?.fromDate,
        to_date: params?.toDate
      }
    });
    return { transactions: res.data.transactions, pagination: res.data.pagination };
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
    let res = await this.axios.get(`/users/${userGuid}/accounts/${accountGuid}/transactions`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage,
        from_date: params?.fromDate,
        to_date: params?.toDate
      }
    });
    return { transactions: res.data.transactions, pagination: res.data.pagination };
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
    let res = await this.axios.get(`/users/${userGuid}/members/${memberGuid}/transactions`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage,
        from_date: params?.fromDate,
        to_date: params?.toDate
      }
    });
    return { transactions: res.data.transactions, pagination: res.data.pagination };
  }

  async readTransaction(userGuid: string, transactionGuid: string) {
    let res = await this.axios.get(`/users/${userGuid}/transactions/${transactionGuid}`);
    return res.data.transaction;
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
    return { institutions: res.data.institutions, pagination: res.data.pagination };
  }

  async readInstitution(institutionCode: string) {
    let res = await this.axios.get(`/institutions/${institutionCode}`);
    return res.data.institution;
  }

  async listInstitutionCredentials(institutionCode: string) {
    let res = await this.axios.get(`/institutions/${institutionCode}/credentials`);
    return res.data.credentials;
  }

  // ── Holdings ───────────────────────────────────────────

  async listHoldings(userGuid: string, params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get(`/users/${userGuid}/investment_holdings`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return { holdings: res.data.holdings, pagination: res.data.pagination };
  }

  async listHoldingsByAccount(
    userGuid: string,
    accountGuid: string,
    params?: { page?: number; recordsPerPage?: number }
  ) {
    let res = await this.axios.get(
      `/users/${userGuid}/accounts/${accountGuid}/investment_holdings`,
      {
        params: {
          page: params?.page,
          records_per_page: params?.recordsPerPage
        }
      }
    );
    return { holdings: res.data.holdings, pagination: res.data.pagination };
  }

  async listHoldingsByMember(
    userGuid: string,
    memberGuid: string,
    params?: { page?: number; recordsPerPage?: number }
  ) {
    let res = await this.axios.get(
      `/users/${userGuid}/members/${memberGuid}/investment_holdings`,
      {
        params: {
          page: params?.page,
          records_per_page: params?.recordsPerPage
        }
      }
    );
    return { holdings: res.data.holdings, pagination: res.data.pagination };
  }

  async readHolding(userGuid: string, holdingGuid: string) {
    let res = await this.axios.get(`/users/${userGuid}/investment_holdings/${holdingGuid}`);
    return res.data.holding;
  }

  // ── Statements ─────────────────────────────────────────

  async listStatements(
    userGuid: string,
    memberGuid: string,
    params?: { page?: number; recordsPerPage?: number }
  ) {
    let res = await this.axios.get(`/users/${userGuid}/members/${memberGuid}/statements`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return { statements: res.data.statements, pagination: res.data.pagination };
  }

  async readStatement(userGuid: string, memberGuid: string, statementGuid: string) {
    let res = await this.axios.get(
      `/users/${userGuid}/members/${memberGuid}/statements/${statementGuid}`
    );
    return res.data.statement;
  }

  // ── Categories ─────────────────────────────────────────

  async listCategories(userGuid: string, params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get(`/users/${userGuid}/categories`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return { categories: res.data.categories, pagination: res.data.pagination };
  }

  async listDefaultCategories() {
    let res = await this.axios.get('/categories/default');
    return { categories: res.data.categories, pagination: res.data.pagination };
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
    let res = await this.axios.post('/transactions/enhance', {
      transactions: transactions.map(t => ({
        amount: t.amount,
        description: t.description,
        id: t.id,
        merchant_category_code: t.merchantCategoryCode,
        type: t.type
      }))
    });
    return res.data.transactions;
  }

  // ── Merchants ──────────────────────────────────────────

  async listMerchants(params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get('/merchants', {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return { merchants: res.data.merchants, pagination: res.data.pagination };
  }

  async readMerchant(merchantGuid: string) {
    let res = await this.axios.get(`/merchants/${merchantGuid}`);
    return res.data.merchant;
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
    }
  ) {
    let res = await this.axios.post(`/users/${userGuid}/widget_urls`, {
      widget_url: {
        widget_type: params.widgetType,
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
    return res.data.widget_url;
  }

  // ── Insights ───────────────────────────────────────────

  async listInsights(userGuid: string, params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get(`/users/${userGuid}/insights`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return { insights: res.data.insights, pagination: res.data.pagination };
  }

  async readInsight(userGuid: string, insightGuid: string) {
    let res = await this.axios.get(`/users/${userGuid}/insights/${insightGuid}`);
    return res.data.insight;
  }

  // ── Tags ───────────────────────────────────────────────

  async listTags(userGuid: string, params?: { page?: number; recordsPerPage?: number }) {
    let res = await this.axios.get(`/users/${userGuid}/tags`, {
      params: {
        page: params?.page,
        records_per_page: params?.recordsPerPage
      }
    });
    return { tags: res.data.tags, pagination: res.data.pagination };
  }

  async createTag(userGuid: string, name: string) {
    let res = await this.axios.post(`/users/${userGuid}/tags`, {
      tag: { name }
    });
    return res.data.tag;
  }

  // ── Taggings ───────────────────────────────────────────

  async createTagging(userGuid: string, params: { tagGuid: string; transactionGuid: string }) {
    let res = await this.axios.post(`/users/${userGuid}/taggings`, {
      tagging: {
        tag_guid: params.tagGuid,
        transaction_guid: params.transactionGuid
      }
    });
    return res.data.tagging;
  }
}
