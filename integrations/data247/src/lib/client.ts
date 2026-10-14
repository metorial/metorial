import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

let http = createAxios({
  baseURL: 'https://api.data247.com/v3.0',
  errorMapping: {
    extractResponseData: response => {
      let body: unknown = response.data;
      if (!isApiErrorRecord(body) || !isApiErrorRecord(body.response)) return body;
      let envelope = body.response;
      return {
        ...envelope,
        code: envelope.status,
        message: envelope.message ?? envelope.status
      };
    }
  }
});

let rawResults = new WeakMap<Record<string, string>, Record<string, unknown>>();

export let getRawData247Result = (result: Record<string, string>) =>
  rawResults.get(result) ?? result;

export class Client {
  constructor(private token: string) {
    if (!token?.trim()) {
      throw createApiServiceError('A Data247 API key is required. Reconnect your account.', {
        reason: 'missing_api_key'
      });
    }
  }

  private async request(params: Record<string, string>): Promise<unknown> {
    return requestAxiosData(
      params.api ?? 'request',
      () => http.get('', { params: { key: this.token, out: 'json', ...params } }),
      (error, operation) => this.mapError(error, operation)
    );
  }

  private mapError(error: unknown, operation: string) {
    return buildApiServiceError(error, {
      providerLabel: 'Data247',
      reason: 'data247_api_error',
      operation,
      extractUpstreamCode: error => {
        if (!isApiErrorRecord(error) || !isApiErrorRecord(error.data)) return undefined;
        let upstream = error.data.upstream;
        return isApiErrorRecord(upstream) && typeof upstream.code === 'string'
          ? upstream.code
          : undefined;
      }
    });
  }

  private validateResponse(data: unknown): Record<string, string>[] {
    if (!isApiErrorRecord(data) || !isApiErrorRecord(data.response)) {
      throw createApiServiceError('Data247 returned an invalid response.', {
        reason: 'invalid_response'
      });
    }
    let response = data.response;
    if (response.status !== 'OK') {
      let status = typeof response.status === 'string' ? response.status : undefined;
      let message = typeof response.message === 'string' ? response.message : undefined;
      throw createApiServiceError(
        `Data247 API request failed: ${[status, message].filter(Boolean).join(' - ') || 'Unknown error'}`,
        { reason: 'data247_api_error', upstreamCode: status }
      );
    }
    if (!Array.isArray(response.results) || !response.results.every(isApiErrorRecord)) {
      throw createApiServiceError('Data247 did not return a valid results array.', {
        reason: 'invalid_response'
      });
    }
    return response.results.map(raw => {
      let result: Record<string, string> = {};
      for (let [key, value] of Object.entries(raw)) {
        if (value === undefined || value === null) continue;
        result[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
      rawResults.set(result, raw);
      return result;
    });
  }

  private firstResult(results: Record<string, string>[]): Record<string, string> {
    let result = results[0];
    if (!result) {
      throw createApiServiceError('Data247 returned no result for this query.', {
        reason: 'invalid_response'
      });
    }
    if (result.status && result.status !== 'OK') {
      throw createApiServiceError(
        `Data247 API query failed: ${result.status}${result.message ? ` - ${result.message}` : ''}`,
        { reason: 'data247_api_error', upstreamCode: result.status }
      );
    }
    return result;
  }

  private async requestBatch(
    api: string,
    queries: Record<string, string>[]
  ): Promise<Record<string, string>[]> {
    let data = await requestAxiosData(
      api,
      () => http.post('', { [api]: queries }, { params: { key: this.token, out: 'json' } }),
      (error, operation) => this.mapError(error, operation)
    );
    return this.validateResponse(data);
  }

  async getAccountInfo(): Promise<Record<string, unknown>> {
    let data = await this.request({ api: 'QR' });
    return getRawData247Result(this.firstResult(this.validateResponse(data)));
  }

  async getUsage(period: 'today' | 'month' | 'year'): Promise<Record<string, unknown>> {
    let data = await this.request({ api: 'QU', period });
    return getRawData247Result(this.firstResult(this.validateResponse(data)));
  }

  async verifyPhoneOwner(params: {
    phone: string;
    name?: string;
    company?: string;
  }): Promise<Record<string, string>> {
    let data = await this.request({ api: 'VO', ...pickDefined(params) });
    return this.firstResult(this.validateResponse(data));
  }

  // Balance check
  async getBalance(): Promise<{ balance: string }> {
    let data = await this.request({ api: 'B' });
    let results = this.validateResponse(data);
    let result = this.firstResult(results);
    if (result.balance === undefined) {
      throw createApiServiceError('Data247 did not return an account balance.', {
        reason: 'invalid_response'
      });
    }
    return { balance: result.balance };
  }

  // Text@ / SMS Gateway lookup
  async smsGatewayLookup(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'MT', phone });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  async smsGatewayLookupBatch(phones: string[]): Promise<Record<string, string>[]> {
    return this.requestBatch(
      'MT',
      phones.map(phone => ({ phone }))
    );
  }

  // Carrier247 USA
  async carrierLookupUSA(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'CU', phone, addfields: 'type,timezone' });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  async carrierLookupUSABatch(phones: string[]): Promise<Record<string, string>[]> {
    return this.requestBatch(
      'CU',
      phones.map(phone => ({ phone, addfields: 'type,timezone' }))
    );
  }

  // Carrier247 International
  async carrierLookupInternational(phone: string): Promise<Record<string, string>> {
    let data = await this.request({
      api: 'CI',
      phone,
      addfields: 'type,sms_address,mms_address'
    });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  async carrierLookupInternationalBatch(phones: string[]): Promise<Record<string, string>[]> {
    return this.requestBatch(
      'CI',
      phones.map(phone => ({ phone, addfields: 'type,sms_address,mms_address' }))
    );
  }

  // Carrier Type
  async carrierTypeLookup(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'CT', phone });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  async carrierTypeLookupBatch(phones: string[]): Promise<Record<string, string>[]> {
    return this.requestBatch(
      'CT',
      phones.map(phone => ({ phone }))
    );
  }

  // Verify247 Email
  async verifyEmail(email: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'VE', email });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  async verifyEmailBatch(emails: string[]): Promise<Record<string, string>[]> {
    return this.requestBatch(
      'VE',
      emails.map(email => ({ email }))
    );
  }

  // Verify247 Postal Address
  async verifyPostalAddress(address: {
    address: string;
    city: string;
    state: string;
    zip: string;
  }): Promise<Record<string, string>> {
    let data = await this.request({
      api: 'VA',
      address: address.address,
      city: address.city,
      state: address.state,
      zip: address.zip
    });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  // Verify247 Phone
  async verifyPhone(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'VP', phone });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  async verifyPhoneBatch(phones: string[]): Promise<Record<string, string>[]> {
    return this.requestBatch(
      'VP',
      phones.map(phone => ({ phone }))
    );
  }

  // Append247 Phone Append
  async phoneAppend(params: {
    firstname: string;
    lastname: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  }): Promise<Record<string, string>> {
    let reqParams: Record<string, string> = {
      api: 'AP',
      fname: params.firstname,
      lname: params.lastname
    };
    if (params.address) reqParams.address = params.address;
    if (params.city) reqParams.city = params.city;
    if (params.state) reqParams.state = params.state;
    if (params.zip) reqParams.zip = params.zip;
    let data = await this.request(reqParams);
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  // Append247 Email Append
  async emailAppend(params: {
    firstname: string;
    lastname: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
  }): Promise<Record<string, string>> {
    let reqParams: Record<string, string> = {
      api: 'AE',
      fname: params.firstname,
      lname: params.lastname
    };
    if (params.address) reqParams.address = params.address;
    if (params.city) reqParams.city = params.city;
    if (params.state) reqParams.state = params.state;
    if (params.zip) reqParams.zip = params.zip;
    if (params.phone) reqParams.phone = params.phone;
    let data = await this.request(reqParams);
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  // Reverse Phone Lookup
  async reversePhone(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'APR', phone });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  async reversePhoneBatch(phones: string[]): Promise<Record<string, string>[]> {
    return this.requestBatch(
      'APR',
      phones.map(phone => ({ phone }))
    );
  }

  // Reverse Email Lookup
  async reverseEmail(email: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'AER', email });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  // Name Lookup (CNAM)
  async nameLookup(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'AN', phone });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  async nameLookupBatch(phones: string[]): Promise<Record<string, string>[]> {
    return this.requestBatch(
      'AN',
      phones.map(phone => ({ phone }))
    );
  }

  // Gender Lookup
  async genderLookup(name: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'AG', fname: name });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  // Zipcode Append
  async zipcodeAppend(params: {
    address: string;
    city: string;
    state: string;
  }): Promise<Record<string, string>> {
    let data = await this.request({
      api: 'AZ',
      address: params.address,
      city: params.city,
      state: params.state
    });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  // Reverse Zipcode
  async reverseZipcode(zip: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'AZR', zip });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  // Profile Data
  async profileData(params: {
    firstname: string;
    lastname: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  }): Promise<Record<string, string>> {
    let data = await this.request({
      api: 'AR',
      fname: params.firstname,
      lname: params.lastname,
      address: params.address,
      city: params.city,
      state: params.state,
      zip: params.zip
    });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  // Property Data
  async propertyData(params: {
    address: string;
    city: string;
    state: string;
    zip: string;
  }): Promise<Record<string, string>> {
    let data = await this.request({
      api: 'ARE',
      address: params.address,
      city: params.city,
      state: params.state,
      zip: params.zip
    });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  // IP Geolocation
  async ipGeolocation(ip: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'GI', ip });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  async ipGeolocationBatch(ips: string[]): Promise<Record<string, string>[]> {
    return this.requestBatch(
      'GI',
      ips.map(ip => ({ ip }))
    );
  }

  // Do-Not-Call Check
  async dncCheck(
    phone: string,
    orgId?: string,
    san?: string
  ): Promise<Record<string, string>> {
    let params: Record<string, string> = { api: 'DC', phone };
    if (orgId) params.org_id = orgId;
    if (san) params.san = san;
    let data = await this.request(params);
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  async dncCheckBatch(
    phones: string[],
    orgId?: string,
    san?: string
  ): Promise<Record<string, string>[]> {
    return this.requestBatch(
      'DC',
      phones.map(phone => ({ phone, ...pickDefined({ org_id: orgId, san }) }))
    );
  }

  // Trust247 User Identity
  async trustIdentity(params: {
    firstname?: string;
    lastname?: string;
    companyName?: string;
    companyUrl?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    ip?: string;
    email?: string;
    phone?: string;
  }): Promise<Record<string, string>> {
    let reqParams: Record<string, string> = { api: 'TI' };
    if (params.firstname) reqParams.firstname = params.firstname;
    if (params.lastname) reqParams.lastname = params.lastname;
    if (params.companyName) reqParams.company_name = params.companyName;
    if (params.companyUrl) reqParams.company_url = params.companyUrl;
    if (params.address) reqParams.address = params.address;
    if (params.city) reqParams.city = params.city;
    if (params.state) reqParams.state = params.state;
    if (params.zip) reqParams.zip = params.zip;
    if (params.ip) reqParams.ip = params.ip;
    if (params.email) reqParams.email = params.email;
    if (params.phone) reqParams.phone = params.phone;
    let data = await this.request(reqParams);
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  // Trust247 Phone (Spam Check)
  async trustPhone(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'TP', phone });
    let results = this.validateResponse(data);
    return this.firstResult(results);
  }

  async trustPhoneBatch(phones: string[]): Promise<Record<string, string>[]> {
    let params: Record<string, string> = { api: 'TP' };
    phones.forEach((phone, i) => {
      params[`p${i + 1}`] = phone;
    });
    let data = await this.request(params);
    return this.validateResponse(data);
  }
}
