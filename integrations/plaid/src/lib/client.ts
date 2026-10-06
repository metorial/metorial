import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createAuthenticatedAxios,
  getApiErrorResponse,
  getResponseHeaderValue,
  isApiErrorRecord,
  requestAxios
} from 'slates';
import type { z } from 'zod';
import * as dto from './contracts';
import {
  amount,
  date,
  dateRange,
  finite,
  httpsUrl,
  integer,
  invalid,
  strings,
  text,
  timestamp
} from './validation';

export const API_VERSION = '2020-09-14';
export const BASE_URLS = {
  sandbox: 'https://sandbox.plaid.com',
  production: 'https://production.plaid.com'
} as const;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
const metadataText = (value: unknown, pattern: RegExp, secrets: string[]) =>
  typeof value === 'string' &&
  pattern.test(value) &&
  !secrets.some(secret => value.includes(secret))
    ? value
    : undefined;
const errorBody = (body: unknown): unknown => {
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    const bytes =
      body instanceof ArrayBuffer
        ? new Uint8Array(body)
        : new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    if (bytes.byteLength <= 64 * 1024) {
      try {
        return JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        return {};
      }
    }
    return {};
  }
  return body;
};
export const safePlaidError = (error: unknown, operation: string, secrets: string[] = []) => {
  const response = getApiErrorResponse(error);
  const existing = isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : {};
  const upstream = isApiErrorRecord(existing.upstream) ? existing.upstream : {};
  const baggage = isApiErrorRecord(existing.baggage) ? existing.baggage : {};
  const body = errorBody(response?.data ?? baggage.response);
  const data = isApiErrorRecord(body) ? body : {};
  const rawStatus = response?.status ?? existing.upstreamStatus ?? upstream.status;
  const status =
    typeof rawStatus === 'number' &&
    Number.isInteger(rawStatus) &&
    rawStatus >= 100 &&
    rawStatus <= 599
      ? rawStatus
      : typeof rawStatus === 'string' && /^[1-5]\d{2}$/.test(rawStatus)
        ? Number(rawStatus)
        : undefined;
  const code = metadataText(
    data.error_code ?? existing.upstreamCode ?? upstream.code,
    /^[A-Z][A-Z0-9_]{0,99}$/,
    secrets
  );
  const requestId = metadataText(
    data.request_id ?? existing.requestId ?? upstream.requestId,
    /^[A-Za-z0-9_-]{1,200}$/,
    secrets
  );
  const guidance =
    code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION'
      ? 'Restart the entire update batch from its original cursor; do not commit a partial batch.'
      : code === 'PRODUCT_NOT_READY'
        ? 'The product is still preparing data. Wait and retry the read.'
        : operation === '/transfer/cancel/readback'
          ? 'Cancellation was acknowledged but its current state could not be confirmed. Read the same transfer before any further action.'
          : operation === '/transfer/create'
            ? 'The outcome may be uncertain. Recover the transfer using the same authorization before any retry; do not create a new authorization.'
            : operation === '/item/public_token/exchange'
              ? 'The single-use public token may have been consumed. Do not retry it or claim cleanup without the returned Item capability.'
              : 'Check permissions, selected environment, input and current provider state before retrying.';
  const result = buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'Plaid',
    reason: 'plaid_api_error',
    operation,
    extractMessage: () => `${code ? code + '. ' : ''}${guidance}`,
    extractUpstreamCode: () => code,
    parent: {}
  });
  if (requestId !== undefined) result.data.requestId = requestId;
  return result;
};
type Page = {
  count?: number;
  offset?: number;
  accountIds?: string[];
  personalFinanceCategoryVersion?: 'v1' | 'v2';
};
type TransferAuthorization = {
  accessToken: string;
  accountId: string;
  type: string;
  network: string;
  amount: string;
  achClass?: string;
  userLegalName: string;
  idempotencyKey?: string;
};
export class PlaidClient {
  private readonly http: ReturnType<typeof createAuthenticatedAxios>;
  private readonly secrets: string[];
  readonly environment: keyof typeof BASE_URLS;
  constructor(opts: { clientId: string; secret: string; environment?: string }) {
    text(opts.clientId, 'Plaid client ID');
    text(opts.secret, 'Plaid secret');
    const environment = opts.environment ?? 'sandbox';
    if (environment !== 'sandbox' && environment !== 'production')
      invalid(
        'Choose sandbox or production; unknown environments are never silently redirected.'
      );
    this.environment = environment;
    this.secrets = [opts.clientId, opts.secret];
    this.http = createAuthenticatedAxios({
      baseURL: BASE_URLS[environment],
      timeout: 60_000,
      maxRedirects: 0,
      headers: {
        'PLAID-CLIENT-ID': opts.clientId,
        'PLAID-SECRET': opts.secret,
        'Plaid-Version': API_VERSION
      },
      errorMapping: { extractResponseData: response => errorBody(response.data) },
      errorAdapter: error => safePlaidError(error, 'request', this.secrets)
    });
  }
  private token(value: string) {
    return text(value, 'Plaid token');
  }
  private filter(accountIds?: string[]) {
    return accountIds === undefined
      ? undefined
      : { account_ids: strings(accountIds, 'account IDs') };
  }
  private page(options: Page = {}, max = 500) {
    return {
      ...(options.count === undefined
        ? {}
        : { count: integer(options.count, 'page count', 1, max) }),
      ...(options.offset === undefined
        ? {}
        : { offset: integer(options.offset, 'page offset', 0) }),
      ...this.filter(options.accountIds),
      ...(options.personalFinanceCategoryVersion === undefined
        ? {}
        : {
            personal_finance_category_version: this.categoryVersion(
              options.personalFinanceCategoryVersion
            )
          })
    };
  }
  private categoryVersion(value: string) {
    if (value !== 'v1' && value !== 'v2') invalid('Choose category taxonomy v1 or v2.');
    return value;
  }
  private assertPrivate(value: unknown, secrets: string[]) {
    try {
      const serialized = JSON.stringify(value);
      if (
        serialized !==
        new AuthConfigSecretRedactor(
          Object.fromEntries(
            secrets
              .flatMap(secret => [secret, JSON.stringify(secret).slice(1, -1)])
              .map((secret, i) => [String(i), secret])
          )
        ).redactEmbedded(serialized)
      )
        invalid('Plaid returned credential-bearing data. No sensitive response was exposed.');
    } catch {
      invalid('Plaid returned invalid or credential-bearing response data.');
    }
  }
  private async post<T>(
    path: string,
    body: Record<string, unknown>,
    schema: z.ZodType<T>,
    tokens: string[] = []
  ) {
    const secrets = [...this.secrets, ...tokens];
    const response = await requestAxios(
      path,
      () => this.http.post<unknown>(path, body),
      error => safePlaidError(error, path, secrets)
    );
    if (
      response.status !== 200 ||
      (isApiErrorRecord(response.data) && response.data.error_code)
    )
      throw safePlaidError({ response }, path, secrets);
    this.assertPrivate(response.data, secrets);
    const parsed = schema.safeParse(response.data);
    if (!parsed.success)
      invalid(
        'Plaid returned an incomplete or invalid response. No missing identifiers, totals or values were fabricated.'
      );
    return parsed.data;
  }
  getAccounts(accessToken: string, accountIds?: string[]) {
    return this.post(
      '/accounts/get',
      { access_token: this.token(accessToken), options: this.filter(accountIds) },
      dto.accountsResponse,
      [accessToken]
    );
  }
  getBalance(accessToken: string, accountIds?: string[]) {
    return this.post(
      '/accounts/balance/get',
      { access_token: this.token(accessToken), options: this.filter(accountIds) },
      dto.accountsResponse,
      [accessToken]
    );
  }
  syncTransactions(
    accessToken: string,
    cursor?: string,
    count?: number,
    categoryVersion?: 'v1' | 'v2'
  ) {
    if (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 256))
      invalid(
        'Provide the returned sync cursor of at most 256 characters, or omit it to start.'
      );
    return this.post(
      '/transactions/sync',
      {
        access_token: this.token(accessToken),
        ...(cursor === undefined ? {} : { cursor }),
        ...(count === undefined ? {} : { count: integer(count, 'page count', 1, 500) }),
        ...(categoryVersion === undefined
          ? {}
          : {
              options: {
                personal_finance_category_version: this.categoryVersion(categoryVersion)
              }
            })
      },
      dto.syncResponse,
      [accessToken]
    );
  }
  getTransactions(accessToken: string, startDate: string, endDate: string, opts?: Page) {
    dateRange(startDate, endDate);
    return this.post(
      '/transactions/get',
      {
        access_token: this.token(accessToken),
        start_date: startDate,
        end_date: endDate,
        options: this.page(opts)
      },
      dto.transactionsResponse,
      [accessToken]
    );
  }
  getAuth(accessToken: string, accountIds?: string[]) {
    return this.post(
      '/auth/get',
      { access_token: this.token(accessToken), options: this.filter(accountIds) },
      dto.authResponse,
      [accessToken]
    );
  }
  getIdentity(accessToken: string, accountIds?: string[]) {
    return this.post(
      '/identity/get',
      { access_token: this.token(accessToken), options: this.filter(accountIds) },
      dto.identityResponse,
      [accessToken]
    );
  }
  getHoldings(accessToken: string, accountIds?: string[]) {
    return this.post(
      '/investments/holdings/get',
      { access_token: this.token(accessToken), options: this.filter(accountIds) },
      dto.holdingsResponse,
      [accessToken]
    );
  }
  getInvestmentTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
    opts?: Page
  ) {
    dateRange(startDate, endDate);
    return this.post(
      '/investments/transactions/get',
      {
        access_token: this.token(accessToken),
        start_date: startDate,
        end_date: endDate,
        options: this.page(opts)
      },
      dto.investmentsResponse,
      [accessToken]
    );
  }
  getLiabilities(accessToken: string, accountIds?: string[]) {
    return this.post(
      '/liabilities/get',
      { access_token: this.token(accessToken), options: this.filter(accountIds) },
      dto.liabilitiesResponse,
      [accessToken]
    );
  }
  private countries(values: string[]) {
    const result = strings(values, 'country codes');
    if (result.some(value => !/^[A-Z]{2}$/.test(value)))
      invalid('Provide uppercase ISO country codes.');
    return result;
  }
  searchInstitutions(
    query: string,
    countryCodes: string[],
    products?: string[],
    opts?: { includeOptionalMetadata?: boolean }
  ) {
    text(query, 'institution search');
    return this.post(
      '/institutions/search',
      {
        query,
        country_codes: this.countries(countryCodes),
        products: products === undefined ? null : strings(products, 'products'),
        options: { include_optional_metadata: opts?.includeOptionalMetadata ?? true }
      },
      dto.searchResponse
    );
  }
  async getInstitutionById(
    institutionId: string,
    countryCodes: string[],
    opts?: { includeOptionalMetadata?: boolean; includeStatus?: boolean }
  ) {
    text(institutionId, 'institution ID');
    const result = await this.post(
      '/institutions/get_by_id',
      {
        institution_id: institutionId,
        country_codes: this.countries(countryCodes),
        options: {
          include_optional_metadata: opts?.includeOptionalMetadata ?? true,
          include_status: opts?.includeStatus ?? false
        }
      },
      dto.institutionResponse
    );
    if (result.institution.institution_id !== institutionId)
      invalid('Plaid returned a different institution identity.');
    return result;
  }
  createLinkToken(params: {
    clientName: string;
    language: string;
    countryCodes: string[];
    userId: string;
    products?: string[];
    webhook?: string;
    redirectUri?: string;
    accessToken?: string;
    transferAuthorizationId?: string;
  }) {
    text(params.clientName, 'client name', 30);
    text(params.language, 'language');
    text(params.userId, 'opaque client user ID');
    if (
      params.accessToken === undefined &&
      params.transferAuthorizationId === undefined &&
      params.products === undefined
    )
      invalid(
        'Provide products for a new Link flow, an access token for update mode, or a transfer authorization for required user action.'
      );
    if (params.webhook !== undefined) httpsUrl(params.webhook, 'webhook URL');
    if (params.redirectUri !== undefined) {
      text(params.redirectUri, 'redirect URI');
      let uri: URL;
      try {
        uri = new URL(params.redirectUri);
      } catch {
        return invalid('Provide a registered absolute redirect URI.');
      }
      if (
        uri.username ||
        uri.password ||
        uri.search ||
        uri.hash ||
        (this.environment === 'production' && uri.protocol !== 'https:') ||
        ['javascript:', 'data:', 'file:'].includes(uri.protocol)
      )
        invalid(
          'Provide a registered redirect URI without credentials, query or fragment; Production requires HTTPS.'
        );
    }
    return this.post(
      '/link/token/create',
      {
        client_name: params.clientName,
        language: params.language,
        country_codes: this.countries(params.countryCodes),
        user: { client_user_id: params.userId },
        ...(params.products === undefined
          ? {}
          : { products: strings(params.products, 'products') }),
        ...(params.webhook === undefined ? {} : { webhook: params.webhook }),
        ...(params.redirectUri === undefined ? {} : { redirect_uri: params.redirectUri }),
        ...(params.accessToken === undefined
          ? {}
          : { access_token: this.token(params.accessToken) }),
        ...(params.transferAuthorizationId === undefined
          ? {}
          : {
              transfer: {
                authorization_id: text(
                  params.transferAuthorizationId,
                  'transfer authorization ID'
                )
              }
            })
      },
      dto.linkResponse,
      params.accessToken === undefined ? [] : [params.accessToken]
    );
  }
  exchangePublicToken(publicToken: string) {
    return this.post(
      '/item/public_token/exchange',
      { public_token: this.token(publicToken) },
      dto.exchangeResponse,
      [publicToken]
    );
  }
  getItem(accessToken: string) {
    return this.post(
      '/item/get',
      { access_token: this.token(accessToken) },
      dto.itemResponse,
      [accessToken]
    );
  }
  removeItem(accessToken: string) {
    return this.post('/item/remove', { access_token: this.token(accessToken) }, dto.receipt, [
      accessToken
    ]);
  }
  createAssetReport(
    accessTokens: string[],
    daysRequested: number,
    opts?: { webhook?: string; clientReportId?: string }
  ) {
    strings(accessTokens, 'Item access tokens', 99);
    integer(daysRequested, 'days requested', 0, 731);
    if (opts?.webhook !== undefined) httpsUrl(opts.webhook, 'report webhook URL');
    if (opts?.clientReportId !== undefined) text(opts.clientReportId, 'client report ID');
    return this.post(
      '/asset_report/create',
      {
        access_tokens: accessTokens,
        days_requested: daysRequested,
        options: {
          ...(opts?.webhook === undefined ? {} : { webhook: opts.webhook }),
          ...(opts?.clientReportId === undefined
            ? {}
            : { client_report_id: opts.clientReportId })
        }
      },
      dto.assetCreateResponse,
      accessTokens
    );
  }
  getAssetReport(assetReportToken: string) {
    return this.post(
      '/asset_report/get',
      { asset_report_token: this.token(assetReportToken) },
      dto.assetResponse,
      [assetReportToken]
    );
  }
  removeAssetReport(assetReportToken: string) {
    return this.post(
      '/asset_report/remove',
      { asset_report_token: this.token(assetReportToken) },
      dto.assetRemoveResponse,
      [assetReportToken]
    );
  }
  async getAssetReportPdf(assetReportToken: string) {
    this.token(assetReportToken);
    const secrets = [...this.secrets, assetReportToken];
    const response = await requestAxios(
      '/asset_report/pdf/get',
      () =>
        this.http.post<ArrayBuffer>(
          '/asset_report/pdf/get',
          { asset_report_token: assetReportToken },
          {
            responseType: 'arraybuffer',
            maxContentLength: MAX_PDF_BYTES,
            headers: { Accept: 'application/pdf' }
          }
        ),
      error => safePlaidError(error, '/asset_report/pdf/get', secrets)
    );
    if (response.status !== 200)
      throw safePlaidError(
        { response: { status: response.status } },
        '/asset_report/pdf/get',
        secrets
      );
    const contentType = (
      (getResponseHeaderValue(response.headers, 'content-type') ?? '').split(';')[0] ?? ''
    )
      .trim()
      .toLowerCase();
    const bytes = new Uint8Array(response.data);
    if (
      contentType !== 'application/pdf' ||
      !bytes.length ||
      bytes.byteLength > MAX_PDF_BYTES ||
      new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-'
    )
      invalid('Plaid did not return a valid PDF within the 20 MiB download limit.');
    return bytes;
  }
  async createTransferAuthorization(params: TransferAuthorization) {
    this.token(params.accessToken);
    text(params.accountId, 'account ID');
    amount(params.amount);
    text(params.userLegalName, 'legal name');
    if (
      !['debit', 'credit'].includes(params.type) ||
      !['ach', 'same-day-ach', 'rtp'].includes(params.network)
    )
      invalid('Choose a supported transfer type and network.');
    if (['ach', 'same-day-ach'].includes(params.network) && !params.achClass)
      invalid('ACH authorization requires an explicit ACH class.');
    if (
      params.achClass !== undefined &&
      !['ccd', 'ppd', 'tel', 'web'].includes(params.achClass)
    )
      invalid('Choose a supported ACH class.');
    if (
      ['ach', 'same-day-ach'].includes(params.network) &&
      params.type === 'credit' &&
      params.achClass !== 'ccd' &&
      params.achClass !== 'ppd'
    )
      invalid('ACH credits require ccd or ppd; tel and web apply only to debits.');
    if (params.idempotencyKey !== undefined)
      text(params.idempotencyKey, 'authorization idempotency key', 50);
    const result = await this.post(
      '/transfer/authorization/create',
      {
        access_token: params.accessToken,
        account_id: params.accountId,
        type: params.type,
        network: params.network,
        amount: params.amount,
        user: { legal_name: params.userLegalName },
        ...(params.achClass === undefined ? {} : { ach_class: params.achClass }),
        ...(params.idempotencyKey === undefined
          ? {}
          : { idempotency_key: params.idempotencyKey })
      },
      dto.authorizationResponse,
      [params.accessToken]
    );
    const proposed = result.authorization.proposed_transfer;
    if (
      proposed.type !== params.type ||
      proposed.network !== params.network ||
      proposed.requested_amount !== params.amount ||
      proposed.iso_currency_code !== 'USD' ||
      (proposed.account_id !== undefined && proposed.account_id !== params.accountId)
    )
      invalid(
        'Plaid returned a different authorization proposal or currency. Do not create a transfer from this receipt.'
      );
    return result;
  }
  cancelTransferAuthorization(authorizationId: string) {
    return this.post(
      '/transfer/authorization/cancel',
      { authorization_id: text(authorizationId, 'authorization ID') },
      dto.receipt
    );
  }
  async createTransfer(params: {
    accessToken: string;
    accountId: string;
    authorizationId: string;
    amount: string;
    description: string;
    metadata?: Record<string, string>;
    network?: 'ach' | 'same-day-ach' | 'rtp';
  }) {
    this.token(params.accessToken);
    text(params.accountId, 'account ID');
    text(params.authorizationId, 'authorization ID');
    amount(params.amount);
    text(
      params.description,
      'transfer description',
      params.network === 'ach' || params.network === 'same-day-ach' ? 10 : 15
    );
    if (
      params.network !== undefined &&
      !['ach', 'same-day-ach', 'rtp'].includes(params.network)
    )
      invalid('Choose the network returned by the authorization.');
    if (params.metadata !== undefined) {
      this.assertPrivate(params.metadata, [...this.secrets, params.accessToken]);
      if (
        Object.keys(params.metadata).length > 50 ||
        Object.entries(params.metadata).some(
          ([key, value]) =>
            !key ||
            key.length > 40 ||
            typeof value !== 'string' ||
            value.length > 500 ||
            [...key, ...value].some(c => c.charCodeAt(0) > 127)
        )
      )
        invalid(
          'Transfer metadata permits up to 50 ASCII string pairs, keys up to 40 and values up to 500 characters.'
        );
    }
    const result = await this.post(
      '/transfer/create',
      {
        access_token: params.accessToken,
        account_id: params.accountId,
        authorization_id: params.authorizationId,
        amount: params.amount,
        description: params.description,
        ...(params.metadata === undefined ? {} : { metadata: params.metadata })
      },
      dto.transferResponse,
      [params.accessToken]
    );
    if (
      result.transfer.authorization_id !== params.authorizationId ||
      result.transfer.amount !== params.amount ||
      result.transfer.description !== params.description ||
      (result.transfer.account_id !== undefined &&
        result.transfer.account_id !== params.accountId)
    )
      invalid(
        'Plaid returned a transfer receipt that does not match the requested authorization, amount, description or account. Recover using the same authorization before any retry.'
      );
    if (params.network !== undefined && result.transfer.network !== params.network)
      invalid(
        'Plaid returned a different transfer network. Recover using the same authorization before any retry.'
      );
    return result;
  }
  async getTransfer(transferId: string) {
    text(transferId, 'transfer ID');
    const result = await this.post(
      '/transfer/get',
      { transfer_id: transferId },
      dto.transferResponse
    );
    if (result.transfer.id !== transferId)
      invalid('Plaid returned a different transfer identity.');
    return result;
  }
  cancelTransfer(transferId: string) {
    return this.post(
      '/transfer/cancel',
      { transfer_id: text(transferId, 'transfer ID') },
      dto.receipt
    );
  }
  listTransfers(opts?: {
    startDate?: string;
    endDate?: string;
    count?: number;
    offset?: number;
  }) {
    if (opts?.startDate !== undefined) timestamp(opts.startDate, 'start time');
    if (opts?.endDate !== undefined) timestamp(opts.endDate, 'end time');
    if (
      opts?.startDate &&
      opts.endDate &&
      Date.parse(opts.startDate) > Date.parse(opts.endDate)
    )
      invalid('Transfer start time must not be after end time.');
    return this.post(
      '/transfer/list',
      {
        ...(opts?.startDate === undefined ? {} : { start_date: opts.startDate }),
        ...(opts?.endDate === undefined ? {} : { end_date: opts.endDate }),
        ...this.page(opts, 25)
      },
      dto.transfersResponse
    );
  }
  evaluateSignal(params: {
    accessToken: string;
    accountId: string;
    clientTransactionId: string;
    amount: number;
    userPresent?: boolean;
    rulesetKey?: string;
  }) {
    text(params.accountId, 'account ID');
    text(params.clientTransactionId, 'client transaction ID', 36);
    finite(params.amount, 'evaluation amount', 0);
    if (params.rulesetKey !== undefined) text(params.rulesetKey, 'ruleset key');
    return this.post(
      '/signal/evaluate',
      {
        access_token: this.token(params.accessToken),
        account_id: params.accountId,
        client_transaction_id: params.clientTransactionId,
        amount: params.amount,
        ...(params.userPresent === undefined ? {} : { user_present: params.userPresent }),
        ...(params.rulesetKey === undefined ? {} : { ruleset_key: params.rulesetKey })
      },
      dto.signalResponse,
      [params.accessToken]
    );
  }
  async enrichTransactions(
    accountType: string,
    transactions: Array<{
      id: string;
      description: string;
      amount: number;
      direction: string;
      isoCurrencyCode?: string;
      datePosted?: string;
    }>,
    categoryVersion?: 'v1' | 'v2'
  ) {
    if (
      !['depository', 'credit'].includes(accountType) ||
      !transactions.length ||
      transactions.length > 100
    )
      invalid('Choose depository or credit and provide between 1 and 100 transactions.');
    const ids = new Set<string>();
    const payload = transactions.map(t => {
      text(t.id, 'transaction ID');
      text(t.description, 'transaction description');
      finite(t.amount, 'transaction amount', 0);
      if (ids.has(t.id)) invalid('Provide distinct transaction IDs.');
      ids.add(t.id);
      if (
        !['INFLOW', 'OUTFLOW'].includes(t.direction) ||
        !t.isoCurrencyCode ||
        !/^[A-Z]{3}$/.test(t.isoCurrencyCode)
      )
        invalid(
          'Each transaction requires INFLOW or OUTFLOW and an explicit uppercase ISO currency code.'
        );
      if (t.datePosted !== undefined) date(t.datePosted, 'posted date');
      return {
        id: t.id,
        description: t.description,
        amount: t.amount,
        direction: t.direction,
        iso_currency_code: t.isoCurrencyCode,
        ...(t.datePosted === undefined ? {} : { date_posted: t.datePosted })
      };
    });
    const result = await this.post(
      '/transactions/enrich',
      {
        account_type: accountType,
        transactions: payload,
        ...(categoryVersion === undefined
          ? {}
          : {
              options: {
                personal_finance_category_version: this.categoryVersion(categoryVersion)
              }
            })
      },
      dto.enrichResponse
    );
    const returned = result.enriched_transactions.map(t => t.id);
    if (
      returned.length !== ids.size ||
      new Set(returned).size !== returned.length ||
      returned.some(id => !ids.has(id))
    )
      invalid('Plaid returned enrichment IDs that do not match the submitted transactions.');
    return result;
  }
}
