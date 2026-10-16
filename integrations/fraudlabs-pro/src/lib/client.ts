import { isIP } from 'node:net';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  decodeApiErrorBody,
  isApiErrorRecord
} from 'slates';

export let requireText = (value: string, label: string) => {
  if (!value.trim()) throw createApiServiceError(`${label} must not be empty.`);
};

let sanitize = (value: unknown, token: string): unknown => {
  if (typeof value === 'string') {
    let redacted = value;
    for (let secret of [token, encodeURIComponent(token)]) {
      if (secret) redacted = redacted.split(secret).join('[redacted]');
    }
    return redacted.replace(/([?&](?:key|api_key|token)=)[^&#\s]+/gi, '$1[redacted]');
  }
  if (Array.isArray(value)) return value.map(item => sanitize(item, token));
  if (isApiErrorRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /^(?:key|api_?key|token|authorization)$/i.test(key)
          ? '[redacted]'
          : sanitize(item, token)
      ])
    );
  }
  return value;
};

let http = createAxios({
  baseURL: 'https://api.fraudlabspro.com/v2'
});

export interface ScreenOrderParams {
  ip: string;
  firstName?: string;
  lastName?: string;
  billCompany?: string;
  billAddress?: string;
  billCity?: string;
  billState?: string;
  billCountry?: string;
  billZipCode?: string;
  shipFirstName?: string;
  shipLastName?: string;
  shipAddress?: string;
  shipCity?: string;
  shipState?: string;
  shipCountry?: string;
  shipZipCode?: string;
  shippingMethod?: 'standard_delivery' | 'local_pickup';
  items?: {
    sku: string;
    quantity: number;
    price: number;
    type?: string;
    name?: string;
    purchaseType?: string;
  }[];
  userPhone?: string;
  email?: string;
  emailHash?: string;
  emailDomain?: string;
  username?: string;
  binNo?: string;
  cardHash?: string;
  avsResult?: string;
  cvvResult?: string;
  userOrderId?: string;
  amount?: number;
  quantity?: number;
  currency?: string;
  department?: string;
  paymentGateway?: string;
  paymentMode?: string;
  couponCode?: string;
  flpChecksum?: string;
}

export interface FeedbackParams {
  fraudlabsproId: string;
  action: 'APPROVE' | 'REJECT' | 'REJECT_BLACKLIST';
  note?: string;
}

export interface GetOrderParams {
  transactionId: string;
  idType?: 'FLP_ID' | 'ORDER_ID';
}

export interface SendSmsParams {
  phoneNumber: string;
  countryCode?: string;
  messageTemplate: string;
  otpTimeout?: number;
}

export interface VerifyOtpParams {
  transactionId: string;
  otp: string;
}

export interface PaymentFeedbackParams {
  email: string;
  status: string;
  message: string;
  fraudlabsproId?: string;
}

export class Client {
  constructor(private token: string) {
    requireText(token, 'FraudLabs Pro API key');
  }

  private toServiceError(error: unknown, operation: string) {
    return buildApiServiceError(error, {
      providerLabel: 'FraudLabs Pro',
      reason: 'fraudlabs_pro_api_error',
      operation,
      parent: {},
      extractResponse: (input, helpers) => {
        let response = helpers.getResponseWithBody(input);
        return response
          ? { ...response, data: sanitize(decodeApiErrorBody(response.data), this.token) }
          : undefined;
      },
      detailKeys: ['error_message', 'error_code', 'message', 'detail', 'code'],
      nestedKeys: ['error', 'errors'],
      fallbackMessage: 'The request could not be completed.',
      extractMessage: (input, helpers) => {
        let response = helpers.getResponseWithBody(input);
        let details: string[] = [];
        helpers.collectDetails(
          sanitize(decodeApiErrorBody(response?.data), this.token),
          details,
          {
            detailKeys: ['error_message', 'error_code', 'message', 'detail', 'code'],
            nestedKeys: ['error', 'errors']
          }
        );
        return details.length
          ? details.slice(0, 5).join(' - ').slice(0, 1000)
          : 'The request could not be completed.';
      },
      extractUpstreamCode: (_input, response) => {
        let data = response?.data;
        let providerError =
          isApiErrorRecord(data) && isApiErrorRecord(data.error) ? data.error : data;
        let code = isApiErrorRecord(providerError) ? providerError.error_code : undefined;
        return typeof code === 'number' || typeof code === 'string' ? String(code) : undefined;
      }
    });
  }

  private async request(
    operation: string,
    path: string,
    method: 'GET' | 'POST',
    params: URLSearchParams | Record<string, string>
  ): Promise<Record<string, unknown>> {
    try {
      let response = await http.request({
        url: path,
        method,
        ...(method === 'GET'
          ? { params }
          : params instanceof URLSearchParams
            ? {
                data: params.toString(),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
              }
            : {
                data: JSON.stringify(params),
                headers: { 'Content-Type': 'application/json' }
              })
      });
      let data = decodeApiErrorBody(response.data);
      if (!isApiErrorRecord(data)) {
        throw createApiServiceError(
          `FraudLabs Pro returned an invalid ${operation} response.`
        );
      }
      if (data.error !== undefined && data.error !== null) {
        throw this.toServiceError({ response: { status: response.status, data } }, operation);
      }
      if (path === '/order/screen' || path === '/order/result') {
        if (
          typeof data.fraudlabspro_id !== 'string' ||
          !data.fraudlabspro_id.trim() ||
          typeof data.fraudlabspro_score !== 'number' ||
          !Number.isFinite(data.fraudlabspro_score) ||
          typeof data.fraudlabspro_status !== 'string' ||
          !['APPROVE', 'REJECT', 'REVIEW'].includes(data.fraudlabspro_status)
        ) {
          throw createApiServiceError(
            `FraudLabs Pro returned an invalid ${operation} response.`
          );
        }
      } else if (
        path === '/order/feedback' &&
        (typeof data.fraudlabspro_id !== 'string' || !data.fraudlabspro_id.trim())
      ) {
        throw createApiServiceError(
          'FraudLabs Pro returned an invalid order feedback response.'
        );
      } else if (
        path === '/verification/send' &&
        (typeof data.tran_id !== 'string' || !data.tran_id.trim())
      ) {
        throw createApiServiceError(
          'FraudLabs Pro returned an invalid SMS verification response.'
        );
      }
      let safe = sanitize(data, this.token);
      if (!isApiErrorRecord(safe))
        throw createApiServiceError('FraudLabs Pro returned an invalid response.');
      return safe;
    } catch (error) {
      throw this.toServiceError(error, operation);
    }
  }

  async screenOrder(params: ScreenOrderParams) {
    if (!isIP(params.ip))
      throw createApiServiceError('ip must be a valid IPv4 or IPv6 address.');
    if (
      params.quantity !== undefined &&
      (!Number.isInteger(params.quantity) || params.quantity < 0 || params.quantity > 100000)
    ) {
      throw createApiServiceError('quantity must be a whole number between 0 and 100000.');
    }
    if (
      params.amount !== undefined &&
      (!Number.isFinite(params.amount) || params.amount < 0 || params.amount > 10000000)
    ) {
      throw createApiServiceError('amount must be between 0 and 10000000.');
    }
    if (params.userOrderId !== undefined && params.userOrderId.length > 15) {
      throw createApiServiceError('userOrderId must contain at most 15 characters.');
    }
    for (let item of params.items ?? []) {
      requireText(item.sku, 'Item SKU');
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        !Number.isFinite(item.price) ||
        item.price < 0
      ) {
        throw createApiServiceError(
          'Each item must have a positive whole-number quantity and a non-negative price.'
        );
      }
    }
    let body = new URLSearchParams();
    body.append('key', this.token);
    body.append('format', 'json');
    body.append('ip', params.ip);

    if (params.firstName) body.append('first_name', params.firstName);
    if (params.lastName) body.append('last_name', params.lastName);
    if (params.billCompany) body.append('bill_to', params.billCompany);
    if (params.billAddress) body.append('bill_addr', params.billAddress);
    if (params.billCity) body.append('bill_city', params.billCity);
    if (params.billState) body.append('bill_state', params.billState);
    if (params.billCountry) body.append('bill_country', params.billCountry);
    if (params.billZipCode) body.append('bill_zip_code', params.billZipCode);
    if (params.shipFirstName) body.append('ship_first_name', params.shipFirstName);
    if (params.shipLastName) body.append('ship_last_name', params.shipLastName);
    if (params.shipAddress) body.append('ship_addr', params.shipAddress);
    if (params.shipCity) body.append('ship_city', params.shipCity);
    if (params.shipState) body.append('ship_state', params.shipState);
    if (params.shipCountry) body.append('ship_country', params.shipCountry);
    if (params.shipZipCode) body.append('ship_zip_code', params.shipZipCode);
    if (params.shippingMethod) body.append('ship_method', params.shippingMethod);
    if (params.items !== undefined) {
      body.append(
        'items',
        JSON.stringify(
          params.items.map(({ purchaseType, ...item }) => ({
            ...item,
            ...(purchaseType !== undefined ? { purchase_type: purchaseType } : {})
          }))
        )
      );
    }
    if (params.userPhone) body.append('user_phone', params.userPhone);
    if (params.email) body.append('email', params.email);
    if (params.emailHash) body.append('email_hash', params.emailHash);
    if (params.emailDomain) body.append('email_domain', params.emailDomain);
    if (params.username) body.append('username', params.username);
    if (params.binNo) body.append('bin_no', params.binNo);
    if (params.cardHash) body.append('card_hash', params.cardHash);
    if (params.avsResult) body.append('avs_result', params.avsResult);
    if (params.cvvResult) body.append('cvv_result', params.cvvResult);
    if (params.userOrderId) body.append('user_order_id', params.userOrderId);
    if (params.amount !== undefined) body.append('amount', String(params.amount));
    if (params.quantity !== undefined) body.append('quantity', String(params.quantity));
    if (params.currency) body.append('currency', params.currency);
    if (params.department) body.append('department', params.department);
    if (params.paymentGateway) body.append('payment_gateway', params.paymentGateway);
    if (params.paymentMode) body.append('payment_mode', params.paymentMode);
    if (params.couponCode) body.append('coupon_code', params.couponCode);
    if (params.flpChecksum) body.append('flp_checksum', params.flpChecksum);

    return this.request('order screening', '/order/screen', 'POST', body);
  }

  async feedbackOrder(params: FeedbackParams) {
    requireText(params.fraudlabsproId, 'Transaction ID');
    let body = new URLSearchParams();
    body.append('key', this.token);
    body.append('format', 'json');
    body.append('id', params.fraudlabsproId);
    body.append('action', params.action);
    if (params.note) body.append('note', params.note);

    return this.request('order feedback', '/order/feedback', 'POST', body);
  }

  async getOrderResult(params: GetOrderParams) {
    requireText(params.transactionId, 'Transaction ID');
    let queryParams: Record<string, string> = {
      key: this.token,
      format: 'json',
      id: params.transactionId
    };
    if (params.idType) {
      queryParams.id_type = params.idType === 'ORDER_ID' ? 'user_order_id' : 'fraudlabspro_id';
    }

    return this.request('order result', '/order/result', 'GET', queryParams);
  }

  async sendSmsVerification(params: SendSmsParams) {
    if (!/^\+[1-9]\d{1,14}$/.test(params.phoneNumber)) {
      throw createApiServiceError('phoneNumber must use E.164 format, such as +12015550123.');
    }
    if (!params.messageTemplate.includes('<otp>') || params.messageTemplate.length > 140) {
      throw createApiServiceError(
        'messageTemplate must contain <otp> and contain at most 140 characters.'
      );
    }
    if (
      params.otpTimeout !== undefined &&
      (!Number.isInteger(params.otpTimeout) ||
        params.otpTimeout < 15 ||
        params.otpTimeout > 86400)
    ) {
      throw createApiServiceError(
        'otpTimeout must be a whole number between 15 and 86400 seconds.'
      );
    }
    let body = new URLSearchParams();
    body.append('key', this.token);
    body.append('format', 'json');
    body.append('tel', params.phoneNumber);
    body.append('mesg', params.messageTemplate);
    if (params.countryCode) body.append('country_code', params.countryCode);
    if (params.otpTimeout !== undefined) body.append('otp_timeout', String(params.otpTimeout));

    return this.request('SMS verification', '/verification/send', 'POST', body);
  }

  async verifyOtp(params: VerifyOtpParams) {
    requireText(params.transactionId, 'SMS transaction ID');
    requireText(params.otp, 'OTP');
    let queryParams = {
      key: this.token,
      format: 'json',
      tran_id: params.transactionId,
      otp: params.otp
    };

    return this.request('OTP verification', '/verification/result', 'GET', queryParams);
  }

  async feedbackPayment(params: PaymentFeedbackParams) {
    requireText(params.email, 'Payment email');
    requireText(params.status, 'Payment status');
    requireText(params.message, 'Payment gateway message');
    let body: Record<string, string> = {
      key: this.token,
      email: params.email,
      status: params.status,
      message: params.message
    };
    if (params.fraudlabsproId !== undefined) body.fraudlabspro_id = params.fraudlabsproId;
    return this.request('payment feedback', '/payment/feedback', 'POST', body);
  }
}
