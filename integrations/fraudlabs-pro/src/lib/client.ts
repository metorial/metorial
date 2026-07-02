import { createAxios } from 'slates';

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

export class Client {
  constructor(private token: string) {}

  async screenOrder(params: ScreenOrderParams) {
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

    let response = await http.post('/order/screen', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async feedbackOrder(params: FeedbackParams) {
    let body = new URLSearchParams();
    body.append('key', this.token);
    body.append('format', 'json');
    body.append('id', params.fraudlabsproId);
    body.append('action', params.action);
    if (params.note) body.append('note', params.note);

    let response = await http.post('/order/feedback', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async getOrderResult(params: GetOrderParams) {
    let queryParams: Record<string, string> = {
      key: this.token,
      format: 'json',
      id: params.transactionId
    };
    if (params.idType) {
      queryParams.id_type = params.idType;
    }

    let response = await http.get('/order/result', { params: queryParams });
    return response.data;
  }

  async sendSmsVerification(params: SendSmsParams) {
    let body = new URLSearchParams();
    body.append('key', this.token);
    body.append('format', 'json');
    body.append('tel', params.phoneNumber);
    body.append('mesg', params.messageTemplate);
    if (params.countryCode) body.append('country_code', params.countryCode);
    if (params.otpTimeout !== undefined) body.append('otp_timeout', String(params.otpTimeout));

    let response = await http.post('/verification/send', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async verifyOtp(params: VerifyOtpParams) {
    let queryParams = {
      key: this.token,
      format: 'json',
      tran_id: params.transactionId,
      otp: params.otp
    };

    let response = await http.get('/verification/result', { params: queryParams });
    return response.data;
  }
}
