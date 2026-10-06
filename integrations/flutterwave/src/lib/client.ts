import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import { z } from 'zod';
import { validateSecretKey } from '../auth';
import {
  nonblank,
  normalizeResponse,
  positiveAmount,
  positiveId,
  responseSchemas,
  validateDates
} from './contracts';

type Row = Record<string, any>;
export type ApiResult = {
  status: string;
  message: string;
  data: any;
  meta?: { page_info?: { total?: number; current_page?: number; total_pages?: number } };
};
const envelope = z.object({
  status: z.literal('success'),
  message: z.string(),
  data: z.unknown().optional(),
  meta: z
    .object({
      page_info: z
        .object({
          total: z.number().optional(),
          current_page: z.number().optional(),
          total_pages: z.number().optional()
        })
        .optional()
    })
    .optional()
});
export class Client {
  private token: string;
  private http: ReturnType<typeof createAxios>;
  constructor(config: { token: string; environment?: 'sandbox' | 'production' }) {
    this.token = validateSecretKey(config.token);
    const mode = config.token.startsWith('FLWSECK_TEST-') ? 'sandbox' : 'production';
    if (config.environment !== undefined && config.environment !== mode)
      throw createApiServiceError(
        'The configured environment does not match the API v3 Secret Key. Select sandbox for a test key, production for a live key. No request was sent.'
      );
    this.http = createAxios({
      baseURL: 'https://api.flutterwave.com/v3',
      timeout: 30000,
      maxRedirects: 0,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }
  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    values: Row = {},
    schema?: z.ZodType,
    list = false
  ): Promise<ApiResult> {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) continue;
      if (typeof value === 'number') {
        if (key === 'amount') positiveAmount(value);
        else if (['page', 'page_size', 'duration', 'plan', 'transaction_id'].includes(key))
          positiveId(value, key);
      } else if (typeof value === 'string') nonblank(value, key);
    }
    validateDates(values.from, values.to);
    validateDates(values.subscribed_from, values.subscribed_to);
    let response: { status: number; data: unknown };
    try {
      response = await this.http.request({
        method,
        url: path,
        ...(method === 'get' ? { params: pickDefined(values) } : { data: pickDefined(values) })
      });
    } catch (error) {
      const upstream =
        getApiErrorStatus(error) ??
        (error instanceof ServiceError ? error.data.upstreamStatus : undefined);
      const numericStatus =
        typeof upstream === 'number'
          ? upstream
          : typeof upstream === 'string' && /^\d{3}$/.test(upstream)
            ? Number(upstream)
            : undefined;
      const status =
        numericStatus !== undefined &&
        Number.isInteger(numericStatus) &&
        numericStatus >= 100 &&
        numericStatus <= 599
          ? numericStatus
          : undefined;
      throw buildApiServiceError(
        {
          response: {
            status,
            data: {
              message:
                'Request failed. Check credentials, permissions and account requirements. A financial write may have been accepted; inspect its reference before retrying.'
            }
          }
        },
        {
          providerLabel: 'Flutterwave',
          reason: 'flutterwave_api_error',
          operation: 'request',
          parent: {}
        }
      );
    }
    if (response.status !== 200)
      throw createApiServiceError(
        'Flutterwave returned an unexpected HTTP status; acceptance is unconfirmed. Check the resource before repeating a financial request.'
      );
    const data = normalizeResponse(response.data, this.token);
    const parsed = envelope.safeParse(data);
    if (!parsed.success)
      throw createApiServiceError(
        'Flutterwave did not confirm a successful API response. Financial acceptance or completion is unconfirmed; inspect the supplied reference before retrying.'
      );
    if (schema) {
      const result = (list ? z.array(schema) : schema).safeParse(parsed.data.data);
      if (!result.success)
        throw createApiServiceError(
          'Flutterwave returned an unexpected response shape. The operation may be accepted; check its reference before retrying.'
        );
      parsed.data.data = result.data;
    }
    return parsed.data as ApiResult;
  }
  private path(value: string | number, label: string) {
    return encodeURIComponent(
      typeof value === 'number' ? String(positiveId(value, label)) : nonblank(value, label)
    );
  }
  private async one(
    method: 'get' | 'post' | 'put',
    path: string,
    schema: z.ZodType,
    values?: Row,
    expectedId?: number
  ) {
    const result = await this.request(method, path, values, schema);
    if (expectedId !== undefined && result.data.id !== expectedId)
      throw createApiServiceError(
        'Flutterwave returned a different resource ID; no matching readback was established.'
      );
    return result;
  }
  async listTransactions(
    params: {
      from?: string;
      to?: string;
      page?: number;
      status?: string;
      currency?: string;
      customerEmail?: string;
      paymentType?: string;
      txRef?: string;
    } = {}
  ) {
    if (params.from === undefined || params.to === undefined)
      throw createApiServiceError(
        'API v3 transaction listing requires from and to dates. Supply YYYY-MM-DD dates; no guessed time range is used.'
      );
    if (params.paymentType)
      throw createApiServiceError(
        'paymentType filtering is not documented for API v3 transaction listing. Omit it and inspect paymentType on returned records; no silently ignored filter is sent.'
      );
    return this.request(
      'get',
      '/transactions',
      {
        from: params.from,
        to: params.to,
        page: params.page,
        status: params.status,
        currency: params.currency,
        customer_email: params.customerEmail,
        tx_ref: params.txRef
      },
      responseSchemas.transaction,
      true
    );
  }
  async verifyTransaction(id: number) {
    return this.one(
      'get',
      `/transactions/${this.path(id, 'transactionId')}/verify`,
      responseSchemas.transaction,
      {},
      id
    );
  }
  async verifyTransactionByReference(ref: string) {
    const result = await this.one(
      'get',
      '/transactions/verify_by_reference',
      responseSchemas.transaction,
      { tx_ref: nonblank(ref, 'txRef') }
    );
    if (result.data.tx_ref !== ref)
      throw createApiServiceError(
        'The returned transaction reference does not match the request.'
      );
    return result;
  }
  async getTransactionFee(amount: number, currency: string) {
    return this.request('get', '/transactions/fee', { amount, currency }, responseSchemas.fee);
  }
  async createTransfer(data: {
    accountBank: string;
    accountNumber: string;
    amount: number;
    currency: string;
    narration: string;
    reference?: string;
    debitCurrency?: string;
    beneficiaryName?: string;
    destinationBranchCode?: string;
    meta?: Row[];
  }) {
    return this.request(
      'post',
      '/transfers',
      {
        account_bank: data.accountBank,
        account_number: data.accountNumber,
        amount: data.amount,
        currency: data.currency,
        narration: data.narration,
        reference: data.reference,
        debit_currency: data.debitCurrency,
        beneficiary_name: data.beneficiaryName,
        destination_branch_code: data.destinationBranchCode,
        meta: data.meta
      },
      responseSchemas.transfer
    );
  }
  async listTransfers(
    params: {
      page?: number;
      status?: string;
      from?: string;
      to?: string;
      reference?: string;
      pageSize?: number;
    } = {}
  ) {
    return this.request(
      'get',
      '/transfers',
      {
        page: params.page,
        status: params.status,
        from: params.from,
        to: params.to,
        reference: params.reference,
        page_size: params.pageSize
      },
      responseSchemas.transfer,
      true
    );
  }
  async getTransfer(id: number) {
    return this.one(
      'get',
      `/transfers/${this.path(id, 'transferId')}`,
      responseSchemas.transfer,
      {},
      id
    );
  }
  async getTransferFee(amount: number, currency: string) {
    return this.request(
      'get',
      '/transfers/fee',
      { amount, currency },
      responseSchemas.fee,
      true
    );
  }
  async getTransferRates(amount: number, destinationCurrency: string, sourceCurrency: string) {
    return this.request(
      'get',
      '/transfers/rates',
      { amount, destination_currency: destinationCurrency, source_currency: sourceCurrency },
      responseSchemas.rate
    );
  }
  async createPaymentPlan(data: {
    amount: number;
    name: string;
    interval: string;
    duration?: number;
  }) {
    return this.request('post', '/payment-plans', data, responseSchemas.plan);
  }
  async listPaymentPlans(params: { page?: number; from?: string; to?: string } = {}) {
    return this.request('get', '/payment-plans', params, responseSchemas.plan, true);
  }
  async getPaymentPlan(id: number) {
    return this.one(
      'get',
      `/payment-plans/${this.path(id, 'planId')}`,
      responseSchemas.plan,
      {},
      id
    );
  }
  async updatePaymentPlan(id: number, data: { name?: string; status?: string }) {
    this.path(id, 'planId');
    if (data.name === undefined && data.status === undefined)
      throw createApiServiceError('Provide updateName or updateStatus.');
    if (data.name !== undefined) nonblank(data.name, 'updateName');
    const existing = (await this.getPaymentPlan(id)).data;
    if (data.status === 'cancelled' && data.name === undefined) {
      await this.request('put', `/payment-plans/${id}/cancel`);
    } else {
      await this.request('put', `/payment-plans/${id}`, {
        name: data.name ?? existing.name,
        status: data.status ?? existing.status
      });
    }
    const result = await this.getPaymentPlan(id);
    if (
      (data.name !== undefined && result.data.name !== data.name) ||
      (data.status !== undefined && result.data.status !== data.status)
    )
      throw createApiServiceError(
        'Payment plan change was accepted but its requested state was not confirmed. Read the plan before retrying.'
      );
    return result;
  }
  async listSubscriptions(
    params: { email?: string; plan?: number; status?: string; page?: number } = {}
  ) {
    return this.request('get', '/subscriptions', params, responseSchemas.subscription, true);
  }
  async cancelSubscription(id: number) {
    return this.changeSubscription(id, 'cancelled', 'cancel');
  }
  async activateSubscription(id: number) {
    return this.changeSubscription(id, 'active', 'activate');
  }
  private async changeSubscription(id: number, status: string, action: string) {
    const accepted = await this.request(
      'put',
      `/subscriptions/${this.path(id, 'subscriptionId')}/${action}`
    );
    if (accepted.data?.id === id && accepted.data.status === status) {
      const parsed = responseSchemas.subscription.safeParse(accepted.data);
      if (parsed.success) return { ...accepted, data: parsed.data };
    }
    for (let page = 1; page <= 20; page++) {
      const result = await this.listSubscriptions({ page, status });
      const matches = result.data.filter((row: Row) => row.id === id);
      if (matches.length === 1 && matches[0].status === status)
        return { ...result, data: matches[0] };
      if (matches.length || !result.data.length) break;
      const pages = result.meta?.page_info?.total_pages;
      if (!Number.isSafeInteger(pages) || pages === undefined || page >= pages) break;
    }
    throw createApiServiceError(
      'The subscription change was accepted, but its requested state was not confirmed within the bounded readback. List the subscription before retrying; no second mutation was sent.'
    );
  }
  async createVirtualAccount(data: {
    email: string;
    isPermanent?: boolean;
    bvn?: string;
    nin?: string;
    txRef: string;
    amount?: number;
    currency?: string;
    firstname?: string;
    lastname?: string;
    phonenumber?: string;
    narration?: string;
    expires?: number;
  }) {
    if (!data.isPermanent && data.amount === undefined)
      throw createApiServiceError('amount is required for a dynamic virtual account.');
    if (data.isPermanent && (data.currency ?? 'NGN') === 'NGN' && !data.bvn && !data.nin)
      throw createApiServiceError('Static NGN accounts require the customer BVN or NIN.');
    if (
      data.expires !== undefined &&
      (!Number.isSafeInteger(data.expires) ||
        data.expires < 60 ||
        data.expires > (data.currency === 'GHS' ? 172800 : 5270401))
    )
      throw createApiServiceError(
        'expires must be 60–172800 seconds for GHS or 60–5270401 seconds for NGN.'
      );
    return this.request(
      'post',
      '/virtual-account-numbers',
      {
        email: data.email,
        is_permanent: data.isPermanent,
        bvn: data.bvn,
        nin: data.nin,
        tx_ref: data.txRef,
        amount: data.amount,
        currency: data.currency,
        firstname: data.firstname,
        lastname: data.lastname,
        phonenumber: data.phonenumber,
        narration: data.narration,
        expires: data.expires === undefined ? undefined : String(data.expires)
      },
      responseSchemas.virtual
    );
  }
  async getVirtualAccount(ref: string) {
    const result = await this.request(
      'get',
      `/virtual-account-numbers/${this.path(ref, 'orderRef')}`,
      {},
      responseSchemas.virtual
    );
    if (result.data.order_ref !== ref)
      throw createApiServiceError('The virtual account order reference does not match.');
    return result;
  }
  async getBillCategories(country?: string) {
    return this.request(
      'get',
      '/top-bill-categories',
      { country },
      responseSchemas.record,
      true
    );
  }
  async getBillers(category?: string, country?: string) {
    if (!category)
      throw createApiServiceError(
        'category is required to list billers. Use list_bill_categories without category to discover category codes.'
      );
    return this.request(
      'get',
      `/bills/${this.path(category, 'category')}/billers`,
      { country: country ?? 'NG' },
      responseSchemas.record,
      true
    );
  }
  async getBillItems(code: string) {
    return this.request(
      'get',
      `/billers/${this.path(code, 'billerCode')}/items`,
      {},
      responseSchemas.record,
      true
    );
  }
  async createBillPayment(
    biller: string,
    item: string,
    data: {
      country: string;
      customer: string;
      amount: number;
      recurrence?: string;
      type: string;
      reference?: string;
    }
  ) {
    if (data.recurrence !== undefined && data.recurrence !== 'ONCE')
      throw createApiServiceError(
        'The current bill-item payment endpoint accepts one payment, not a recurrence schedule. Omit recurrence or use ONCE; no recurring payment was created.'
      );
    nonblank(data.type, 'type'); // Retained legacy descriptive field; current bill/item codes select the product.
    return this.request(
      'post',
      `/billers/${this.path(biller, 'billerCode')}/items/${this.path(item, 'itemCode')}/payment`,
      {
        country: data.country,
        customer_id: data.customer,
        amount: data.amount,
        reference: data.reference
      },
      responseSchemas.record
    );
  }
  async getBillPaymentStatus(reference: string) {
    return this.request(
      'get',
      `/bills/${this.path(reference, 'reference')}`,
      { verbose: 1 },
      responseSchemas.record
    );
  }
  async createRefund(id: number, data: { amount?: number; comments?: string } = {}) {
    const result = await this.request(
      'post',
      `/transactions/${this.path(id, 'transactionId')}/refund`,
      data,
      responseSchemas.refund
    );
    if (result.data.tx_id !== id)
      throw createApiServiceError(
        'Refund acceptance did not return the requested transaction ID. Check the transaction before retrying.'
      );
    return result;
  }
  async listRefunds(params: { page?: number; from?: string; to?: string } = {}) {
    return this.request('get', '/refunds', params, responseSchemas.refund, true);
  }
  async getRefund(id: number) {
    return this.one(
      'get',
      `/refunds/${this.path(id, 'refundId')}`,
      responseSchemas.refund,
      {},
      id
    );
  }
  async listSettlements(
    params: { page?: number; from?: string; to?: string; subaccountId?: string } = {}
  ) {
    return this.request(
      'get',
      '/settlements',
      {
        page: params.page,
        from: params.from,
        to: params.to,
        subaccount_id: params.subaccountId
      },
      responseSchemas.settlement,
      true
    );
  }
  async getSettlement(id: number) {
    return this.one(
      'get',
      `/settlements/${this.path(id, 'settlementId')}`,
      responseSchemas.settlement,
      {},
      id
    );
  }
  async resolveBankAccount(account: string, bank: string) {
    const result = await this.request(
      'post',
      '/accounts/resolve',
      { account_number: account, account_bank: bank },
      responseSchemas.resolve
    );
    if (result.data.account_number !== account)
      throw createApiServiceError(
        'The resolved account number does not match the requested account.'
      );
    return result;
  }
  async listBanks(country: string) {
    return this.request(
      'get',
      `/banks/${this.path(country, 'countryCode')}`,
      {},
      responseSchemas.bank,
      true
    );
  }
  async getBankBranches(id: number) {
    return this.request(
      'get',
      `/banks/${this.path(id, 'bankId')}/branches`,
      {},
      responseSchemas.branch,
      true
    );
  }
  async createBeneficiary(data: {
    accountNumber: string;
    accountBank: string;
    beneficiaryName: string;
    currency?: string;
  }) {
    return this.request(
      'post',
      '/beneficiaries',
      {
        account_number: data.accountNumber,
        account_bank: data.accountBank,
        beneficiary_name: data.beneficiaryName,
        currency: data.currency
      },
      responseSchemas.beneficiary
    );
  }
  async listBeneficiaries(page?: number) {
    return this.request('get', '/beneficiaries', { page }, responseSchemas.beneficiary, true);
  }
  async getBeneficiary(id: number) {
    return this.one(
      'get',
      `/beneficiaries/${this.path(id, 'beneficiaryId')}`,
      responseSchemas.beneficiary,
      {},
      id
    );
  }
  async deleteBeneficiary(id: number) {
    return this.request('delete', `/beneficiaries/${this.path(id, 'beneficiaryId')}`);
  }
}
