import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let BASE_URL = 'https://app.docupost.com/api/1.1/wf';

// Never surface provider text: it can echo query credentials, addresses, or content.
let docupostError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'DocuPost',
    reason: 'docupost_api_error',
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractMessage: () =>
      'The request could not be completed. Check the DocuPost dashboard before retrying a mailing to avoid duplicate charges.',
    formatMessage: ({ message, status }) =>
      `DocuPost request failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}. ${message}`,
    extractUpstreamCode: (input, response) => {
      let body = response?.data;
      if (isApiErrorRecord(body) && typeof body.status === 'string') {
        let status = body.status.toLowerCase();
        if (['error', 'failed', 'failure'].includes(status)) return body.status;
      }
      // These SDK classifications are fixed values, unlike untrusted provider text.
      if (isApiErrorRecord(input) && isApiErrorRecord(input.data)) {
        let code = input.data.code;
        if (
          typeof code === 'string' &&
          [
            'auth.invalid',
            'permission.denied',
            'resource.not_found',
            'resource.conflict',
            'upstream.invalid_request',
            'upstream.rate_limited',
            'upstream.timeout',
            'upstream.network_error',
            'upstream.unavailable',
            'upstream.error'
          ].includes(code)
        )
          return code;
      }
      return undefined;
    },
    // Retaining an upstream error parent would expose its echoed personal data.
    parent: {}
  });

export interface SendResult {
  status: string;
  httpStatus: number;
  response: unknown;
}

export interface SendLetterParams {
  toName: string;
  toCompany?: string;
  toAddress1: string;
  toAddress2?: string;
  toCity: string;
  toState: string;
  toZip: string;
  fromName: string;
  fromAddress1: string;
  fromAddress2?: string;
  fromCity: string;
  fromState: string;
  fromZip: string;
  pdfUrl?: string;
  html?: string;
  color?: boolean;
  doubleSided?: boolean;
  mailClass?: string;
  serviceLevel?: string;
  returnEnvelope?: boolean;
  prepaidReturnEnvelope?: boolean;
  description?: string;
}

export interface SendPostcardParams {
  frontImageUrl: string;
  backImageUrl: string;
  size?: string;
  toName: string;
  toAddress1: string;
  toAddress2?: string;
  toCity: string;
  toState: string;
  toZip: string;
  fromName: string;
  fromAddress1: string;
  fromAddress2?: string;
  fromCity: string;
  fromState: string;
  fromZip: string;
  description?: string;
}

export class Client {
  private token: string;
  private http;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.http = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30_000,
      // Prevent a redirect from forwarding credentials or creating another mail job.
      maxRedirects: 0,
      errorAdapter: docupostError
    });
  }

  private checkResponse(data: unknown, httpStatus: number) {
    if (!isApiErrorRecord(data)) return;
    let status = typeof data.status === 'string' ? data.status.toLowerCase() : undefined;
    if (
      status === 'error' ||
      status === 'failed' ||
      status === 'failure' ||
      data.success === false
    ) {
      throw docupostError({ response: { status: httpStatus, data } });
    }
  }

  private sendResult(data: unknown, httpStatus: number): SendResult {
    this.checkResponse(data, httpStatus);
    return {
      // A transport code is an actual request result, never a delivery state.
      status:
        isApiErrorRecord(data) && typeof data.status === 'string'
          ? data.status
          : String(httpStatus),
      httpStatus,
      response: data
    };
  }

  async sendLetter(params: SendLetterParams): Promise<SendResult> {
    if (Boolean(params.pdfUrl) === Boolean(params.html)) {
      throw createApiServiceError('Provide exactly one of pdfUrl or html for the letter.', {
        reason: 'docupost_invalid_content'
      });
    }
    if (params.serviceLevel && params.mailClass && params.mailClass !== 'usps_first_class') {
      throw createApiServiceError(
        'Certified service requires the usps_first_class mail class.',
        {
          reason: 'docupost_invalid_mail_class'
        }
      );
    }
    if (params.returnEnvelope && params.prepaidReturnEnvelope) {
      throw createApiServiceError(
        'Choose either a return envelope or a prepaid return envelope.',
        {
          reason: 'docupost_invalid_return_envelope'
        }
      );
    }
    let queryParams: Record<string, string> = {
      api_token: this.token,
      to_name: params.toName,
      to_address1: params.toAddress1,
      to_city: params.toCity,
      to_state: params.toState,
      to_zip: params.toZip,
      from_name: params.fromName,
      from_address1: params.fromAddress1,
      from_city: params.fromCity,
      from_state: params.fromState,
      from_zip: params.fromZip
    };

    if (params.toCompany) queryParams.to_company = params.toCompany;
    if (params.toAddress2) queryParams.to_address2 = params.toAddress2;
    if (params.fromAddress2) queryParams.from_address2 = params.fromAddress2;
    if (params.pdfUrl) queryParams.pdf = params.pdfUrl;
    if (params.color !== undefined) queryParams.color = String(params.color);
    if (params.doubleSided !== undefined) queryParams.doublesided = String(params.doubleSided);
    if (params.mailClass) queryParams.class = params.mailClass;
    if (params.serviceLevel) queryParams.servicelevel = params.serviceLevel;
    if (params.returnEnvelope !== undefined)
      queryParams.return_envelope = String(params.returnEnvelope);
    if (params.prepaidReturnEnvelope !== undefined)
      queryParams.prepaid_return_envelope = String(params.prepaidReturnEnvelope);
    if (params.description) queryParams.description = params.description;

    let body: Record<string, string> | undefined;
    if (params.html) {
      body = { html: params.html };
    }

    let response = await this.http.post('/sendletter', body ?? {}, {
      params: queryParams
    });

    return this.sendResult(response.data, response.status);
  }

  async sendPostcard(params: SendPostcardParams): Promise<SendResult> {
    let queryParams: Record<string, string> = {
      api_token: this.token,
      front_image: params.frontImageUrl,
      back_image: params.backImageUrl,
      to_name: params.toName,
      to_address1: params.toAddress1,
      to_city: params.toCity,
      to_state: params.toState,
      to_zip: params.toZip,
      from_name: params.fromName,
      from_address1: params.fromAddress1,
      from_city: params.fromCity,
      from_state: params.fromState,
      from_zip: params.fromZip
    };

    if (params.toAddress2) queryParams.to_address2 = params.toAddress2;
    if (params.fromAddress2) queryParams.from_address2 = params.fromAddress2;
    if (params.size) queryParams.size = params.size;
    if (params.description) queryParams.description = params.description;

    let response = await this.http.post(
      '/sendpostcard',
      {},
      {
        params: queryParams
      }
    );

    return this.sendResult(response.data, response.status);
  }

  async getBalance(): Promise<unknown> {
    let response = await this.http.post(
      '/getbalance',
      {},
      {
        params: {
          api_token: this.token
        }
      }
    );

    this.checkResponse(response.data, response.status);
    return response.data;
  }
}
