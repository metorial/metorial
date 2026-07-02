import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  sandbox: 'https://sandbox.plaid.com',
  production: 'https://production.plaid.com'
};

export class PlaidClient {
  private axios;
  private clientId: string;
  private secret: string;

  constructor(opts: { clientId: string; secret: string; environment: string }) {
    this.clientId = opts.clientId;
    this.secret = opts.secret;
    this.axios = createAxios({
      baseURL: BASE_URLS[opts.environment] || BASE_URLS.sandbox,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private body(extra: Record<string, unknown> = {}) {
    return {
      client_id: this.clientId,
      secret: this.secret,
      ...extra
    };
  }

  // ── Accounts ──────────────────────────────────────────────

  async getAccounts(accessToken: string, accountIds?: string[]) {
    let { data } = await this.axios.post(
      '/accounts/get',
      this.body({
        access_token: accessToken,
        ...(accountIds?.length && { options: { account_ids: accountIds } })
      })
    );
    return data;
  }

  async getBalance(accessToken: string, accountIds?: string[]) {
    let { data } = await this.axios.post(
      '/accounts/balance/get',
      this.body({
        access_token: accessToken,
        ...(accountIds?.length && { options: { account_ids: accountIds } })
      })
    );
    return data;
  }

  // ── Transactions ──────────────────────────────────────────

  async syncTransactions(accessToken: string, cursor?: string, count?: number) {
    let { data } = await this.axios.post(
      '/transactions/sync',
      this.body({
        access_token: accessToken,
        ...(cursor && { cursor }),
        ...(count && { count })
      })
    );
    return data;
  }

  async getTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
    opts?: { count?: number; offset?: number; accountIds?: string[] }
  ) {
    let options: Record<string, unknown> = {};
    if (opts?.count) options.count = opts.count;
    if (opts?.offset !== undefined) options.offset = opts.offset;
    if (opts?.accountIds?.length) options.account_ids = opts.accountIds;

    let { data } = await this.axios.post(
      '/transactions/get',
      this.body({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        ...(Object.keys(options).length > 0 && { options })
      })
    );
    return data;
  }

  // ── Auth ──────────────────────────────────────────────────

  async getAuth(accessToken: string, accountIds?: string[]) {
    let { data } = await this.axios.post(
      '/auth/get',
      this.body({
        access_token: accessToken,
        ...(accountIds?.length && { options: { account_ids: accountIds } })
      })
    );
    return data;
  }

  // ── Identity ──────────────────────────────────────────────

  async getIdentity(accessToken: string, accountIds?: string[]) {
    let { data } = await this.axios.post(
      '/identity/get',
      this.body({
        access_token: accessToken,
        ...(accountIds?.length && { options: { account_ids: accountIds } })
      })
    );
    return data;
  }

  // ── Investments ───────────────────────────────────────────

  async getHoldings(accessToken: string, accountIds?: string[]) {
    let { data } = await this.axios.post(
      '/investments/holdings/get',
      this.body({
        access_token: accessToken,
        ...(accountIds?.length && { options: { account_ids: accountIds } })
      })
    );
    return data;
  }

  async getInvestmentTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
    opts?: { count?: number; offset?: number; accountIds?: string[] }
  ) {
    let options: Record<string, unknown> = {};
    if (opts?.count) options.count = opts.count;
    if (opts?.offset !== undefined) options.offset = opts.offset;
    if (opts?.accountIds?.length) options.account_ids = opts.accountIds;

    let { data } = await this.axios.post(
      '/investments/transactions/get',
      this.body({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        ...(Object.keys(options).length > 0 && { options })
      })
    );
    return data;
  }

  // ── Liabilities ───────────────────────────────────────────

  async getLiabilities(accessToken: string, accountIds?: string[]) {
    let { data } = await this.axios.post(
      '/liabilities/get',
      this.body({
        access_token: accessToken,
        ...(accountIds?.length && { options: { account_ids: accountIds } })
      })
    );
    return data;
  }

  // ── Institutions ──────────────────────────────────────────

  async searchInstitutions(
    query: string,
    countryCodes: string[],
    products?: string[],
    opts?: { includeOptionalMetadata?: boolean }
  ) {
    let { data } = await this.axios.post(
      '/institutions/search',
      this.body({
        query,
        products: products?.length ? products : null,
        country_codes: countryCodes,
        options: {
          include_optional_metadata: opts?.includeOptionalMetadata ?? true
        }
      })
    );
    return data;
  }

  async getInstitutionById(
    institutionId: string,
    countryCodes: string[],
    opts?: { includeOptionalMetadata?: boolean; includeStatus?: boolean }
  ) {
    let { data } = await this.axios.post(
      '/institutions/get_by_id',
      this.body({
        institution_id: institutionId,
        country_codes: countryCodes,
        options: {
          include_optional_metadata: opts?.includeOptionalMetadata ?? true,
          include_status: opts?.includeStatus ?? false
        }
      })
    );
    return data;
  }

  // ── Link Token ────────────────────────────────────────────

  async createLinkToken(params: {
    clientName: string;
    language: string;
    countryCodes: string[];
    userId: string;
    products?: string[];
    webhook?: string;
    redirectUri?: string;
    accessToken?: string;
  }) {
    let { data } = await this.axios.post(
      '/link/token/create',
      this.body({
        client_name: params.clientName,
        language: params.language,
        country_codes: params.countryCodes,
        user: { client_user_id: params.userId },
        ...(params.products?.length && { products: params.products }),
        ...(params.webhook && { webhook: params.webhook }),
        ...(params.redirectUri && { redirect_uri: params.redirectUri }),
        ...(params.accessToken && { access_token: params.accessToken })
      })
    );
    return data;
  }

  // ── Item ──────────────────────────────────────────────────

  async exchangePublicToken(publicToken: string) {
    let { data } = await this.axios.post(
      '/item/public_token/exchange',
      this.body({
        public_token: publicToken
      })
    );
    return data;
  }

  async getItem(accessToken: string) {
    let { data } = await this.axios.post(
      '/item/get',
      this.body({
        access_token: accessToken
      })
    );
    return data;
  }

  async removeItem(accessToken: string) {
    let { data } = await this.axios.post(
      '/item/remove',
      this.body({
        access_token: accessToken
      })
    );
    return data;
  }

  async updateItemWebhook(accessToken: string, webhook: string) {
    let { data } = await this.axios.post(
      '/item/webhook/update',
      this.body({
        access_token: accessToken,
        webhook
      })
    );
    return data;
  }

  // ── Asset Reports ─────────────────────────────────────────

  async createAssetReport(
    accessTokens: string[],
    daysRequested: number,
    opts?: { webhook?: string; clientReportId?: string }
  ) {
    let reportOpts: Record<string, unknown> = {};
    if (opts?.webhook) reportOpts.webhook = opts.webhook;
    if (opts?.clientReportId) reportOpts.client_report_id = opts.clientReportId;

    let { data } = await this.axios.post(
      '/asset_report/create',
      this.body({
        access_tokens: accessTokens,
        days_requested: daysRequested,
        ...(Object.keys(reportOpts).length > 0 && { options: reportOpts })
      })
    );
    return data;
  }

  async getAssetReport(assetReportToken: string) {
    let { data } = await this.axios.post(
      '/asset_report/get',
      this.body({
        asset_report_token: assetReportToken
      })
    );
    return data;
  }

  // ── Transfer ──────────────────────────────────────────────

  async createTransferAuthorization(params: {
    accessToken: string;
    accountId: string;
    type: string;
    network: string;
    amount: string;
    achClass?: string;
    userLegalName: string;
  }) {
    let { data } = await this.axios.post(
      '/transfer/authorization/create',
      this.body({
        access_token: params.accessToken,
        account_id: params.accountId,
        type: params.type,
        network: params.network,
        amount: params.amount,
        ...(params.achClass && { ach_class: params.achClass }),
        user: {
          legal_name: params.userLegalName
        }
      })
    );
    return data;
  }

  async createTransfer(params: {
    accessToken: string;
    accountId: string;
    authorizationId: string;
    amount: string;
    description: string;
    metadata?: Record<string, string>;
  }) {
    let { data } = await this.axios.post(
      '/transfer/create',
      this.body({
        access_token: params.accessToken,
        account_id: params.accountId,
        authorization_id: params.authorizationId,
        amount: params.amount,
        description: params.description,
        ...(params.metadata && { metadata: params.metadata })
      })
    );
    return data;
  }

  async getTransfer(transferId: string) {
    let { data } = await this.axios.post(
      '/transfer/get',
      this.body({
        transfer_id: transferId
      })
    );
    return data;
  }

  async cancelTransfer(transferId: string) {
    let { data } = await this.axios.post(
      '/transfer/cancel',
      this.body({
        transfer_id: transferId
      })
    );
    return data;
  }

  async listTransfers(opts?: {
    startDate?: string;
    endDate?: string;
    count?: number;
    offset?: number;
  }) {
    let { data } = await this.axios.post(
      '/transfer/list',
      this.body({
        ...(opts?.startDate && { start_date: opts.startDate }),
        ...(opts?.endDate && { end_date: opts.endDate }),
        ...(opts?.count && { count: opts.count }),
        ...(opts?.offset !== undefined && { offset: opts.offset })
      })
    );
    return data;
  }

  async syncTransferEvents(afterId?: number) {
    let { data } = await this.axios.post(
      '/transfer/event/sync',
      this.body({
        after_id: afterId ?? 0
      })
    );
    return data;
  }

  // ── Signal ────────────────────────────────────────────────

  async evaluateSignal(params: {
    accessToken: string;
    accountId: string;
    clientTransactionId: string;
    amount: number;
    userPresent?: boolean;
  }) {
    let { data } = await this.axios.post(
      '/signal/evaluate',
      this.body({
        access_token: params.accessToken,
        account_id: params.accountId,
        client_transaction_id: params.clientTransactionId,
        amount: params.amount,
        ...(params.userPresent !== undefined && { user_present: params.userPresent })
      })
    );
    return data;
  }

  // ── Enrich ────────────────────────────────────────────────

  async enrichTransactions(
    accountType: string,
    transactions: Array<{
      id: string;
      description: string;
      amount: number;
      direction: string;
      isoCurrencyCode?: string;
      datePosted?: string;
    }>
  ) {
    let { data } = await this.axios.post(
      '/transactions/enrich',
      this.body({
        account_type: accountType,
        transactions: transactions.map(t => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          direction: t.direction,
          ...(t.isoCurrencyCode && { iso_currency_code: t.isoCurrencyCode }),
          ...(t.datePosted && { date_posted: t.datePosted })
        }))
      })
    );
    return data;
  }
}
