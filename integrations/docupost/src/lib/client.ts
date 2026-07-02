import { createAxios } from 'slates';

let BASE_URL = 'https://app.docupost.com/api/1.1/wf';

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
    this.http = createAxios({
      baseURL: BASE_URL
    });
  }

  async sendLetter(params: SendLetterParams): Promise<any> {
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

    return response.data;
  }

  async sendPostcard(params: SendPostcardParams): Promise<any> {
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

    return response.data;
  }

  async getBalance(): Promise<any> {
    let response = await this.http.post(
      '/getbalance',
      {},
      {
        params: {
          api_token: this.token
        }
      }
    );

    return response.data;
  }
}
