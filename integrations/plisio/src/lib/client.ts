import { isServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';
import { redactProviderData } from './redact';
import { requireText } from './response';

let http = createAxios({
  baseURL: 'https://api.plisio.net/api/v1',
  maxRedirects: 0
});

export class PlisioClient {
  private apiKey: string;

  constructor(config: { token: string }) {
    requireText(config.token, 'API key');
    this.apiKey = config.token;
  }

  redact(value: string): string {
    return redactProviderData(value, this.apiKey);
  }

  private async get<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
    let cleanParams: Record<string, string> = { api_key: this.apiKey };
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = String(value);
      }
    }

    try {
      let response = await http.get(path, { params: cleanParams });
      let body: unknown = response.data;
      if (!isApiErrorRecord(body)) {
        throw createApiServiceError('Plisio returned an invalid response envelope.');
      }
      if (body.status === 'error') {
        throw { response: { status: response.status, data: body } };
      }
      if (body.status !== 'success' || body.data === undefined || body.data === null) {
        throw createApiServiceError('Plisio returned an invalid success response.');
      }
      return redactProviderData(body.data, this.apiKey) as T;
    } catch (error) {
      if (isServiceError(error)) throw error;
      throw buildApiServiceError(error, {
        providerLabel: 'Plisio',
        reason: 'plisio_api_error',
        parent: {},
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
        extractMessage: (input, helpers) => {
          let body = helpers.getResponseWithBody(input)?.data;
          let detail =
            isApiErrorRecord(body) && isApiErrorRecord(body.data) ? body.data : body;
          let text = helpers.extractMessage(
            { response: { data: detail } },
            {
              detailKeys: ['name', 'message', 'code'],
              nestedKeys: ['errors'],
              fallbackMessage:
                'The request could not be completed. Check your API key and shop IP restrictions.'
            }
          );
          return redactProviderData(text, this.apiKey);
        },
        extractUpstreamCode: (_input, response) => {
          let body = response?.data;
          let data = isApiErrorRecord(body) ? body.data : undefined;
          let code = isApiErrorRecord(data) ? data.code : undefined;
          return typeof code === 'number' || typeof code === 'string'
            ? this.redact(String(code))
            : undefined;
        }
      });
    }
  }

  // --- Invoices ---

  async createInvoice(params: {
    currency?: string;
    orderName: string;
    orderNumber: string;
    amount?: number;
    sourceCurrency?: string;
    sourceAmount?: number;
    allowedPsysCids?: string;
    description?: string;
    callbackUrl?: string;
    successCallbackUrl?: string;
    failCallbackUrl?: string;
    successInvoiceUrl?: string;
    failInvoiceUrl?: string;
    email?: string;
    language?: string;
    expireMin?: number;
    redirectToInvoice?: boolean;
  }) {
    return this.get('/invoices/new', {
      currency: params.currency,
      order_name: params.orderName,
      order_number: params.orderNumber,
      amount: params.amount,
      source_currency: params.sourceCurrency,
      source_amount: params.sourceAmount,
      allowed_psys_cids: params.allowedPsysCids,
      description: params.description,
      callback_url: params.callbackUrl,
      success_callback_url: params.successCallbackUrl,
      fail_callback_url: params.failCallbackUrl,
      success_invoice_url: params.successInvoiceUrl,
      fail_invoice_url: params.failInvoiceUrl,
      email: params.email,
      language: params.language,
      expire_min: params.expireMin,
      redirect_to_invoice: params.redirectToInvoice
    });
  }

  async getInvoice(invoiceId: string) {
    requireText(invoiceId, 'Invoice ID');
    return this.get(`/invoices/${encodeURIComponent(invoiceId)}`);
  }

  // --- Operations ---

  async withdraw(params: {
    currency: string;
    type: 'cash_out' | 'mass_cash_out';
    to: string;
    amount: string;
    feePlan?: string;
  }) {
    return this.get('/operations/withdraw', {
      currency: params.currency,
      type: params.type,
      to: params.to,
      amount: params.amount,
      feePlan: params.feePlan
    });
  }

  async listOperations(
    params: {
      page?: number;
      limit?: number;
      shopId?: string;
      type?: string;
      status?: string;
      currency?: string;
      search?: string;
    } = {}
  ) {
    return this.get('/operations', {
      page: params.page,
      limit: params.limit,
      shop_id: params.shopId,
      type: params.type,
      status: params.status,
      currency: params.currency,
      search: params.search
    });
  }

  async getOperation(operationId: string) {
    requireText(operationId, 'Operation ID');
    return this.get(`/operations/${encodeURIComponent(operationId)}`);
  }

  // --- Balance ---

  async getBalance(currency: string) {
    requireText(currency, 'Currency');
    return this.get(`/balances/${encodeURIComponent(currency)}`);
  }

  // --- Currencies ---

  async getCurrencies(fiat?: string) {
    if (fiat !== undefined) requireText(fiat, 'Fiat currency');
    let path = fiat ? `/currencies/${encodeURIComponent(fiat)}` : '/currencies/USD';
    return this.get(path);
  }

  // --- Fee Estimation ---

  async estimateFee(params: {
    currency: string;
    addresses: string;
    amounts: string;
    feePlan?: string;
  }) {
    return this.get(`/operations/fee/${encodeURIComponent(params.currency)}`, {
      addresses: params.addresses,
      amounts: params.amounts,
      feePlan: params.feePlan
    });
  }

  async getCommission(params: {
    currency: string;
    addresses?: string;
    amounts?: string;
    type?: string;
    feePlan?: string;
  }) {
    return this.get(`/operations/commission/${encodeURIComponent(params.currency)}`, {
      addresses: params.addresses,
      amounts: params.amounts,
      type: params.type,
      feePlan: params.feePlan
    });
  }

  // --- Fee Plans ---

  async getFeePlans(currency: string) {
    requireText(currency, 'Currency');
    return this.get(`/operations/fee-plan/${encodeURIComponent(currency)}`);
  }

  // --- Deposits ---

  async createDeposit(params: { currency: string; uid: string }) {
    return this.get('/shops/deposit/new', {
      psys_cid: params.currency,
      uid: params.uid
    });
  }

  async getShop() {
    return this.get('/shops');
  }

  async listDeposits(params: {
    uid?: string;
    currency?: string;
    page?: number;
    limit?: number;
  }) {
    return this.get('/shops/deposit', {
      uid: params.uid,
      psys_cid: params.currency,
      page: params.page,
      limit: params.limit
    });
  }
}
