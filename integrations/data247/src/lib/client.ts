import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.data247.com/v3.0'
});

export interface Data247Response {
  response: {
    status: string;
    results?: Record<string, string>[];
    message?: string;
  };
}

export class Client {
  constructor(private token: string) {}

  private async request(params: Record<string, string>): Promise<Data247Response> {
    let response = await http.get<Data247Response>('', {
      params: {
        key: this.token,
        ...params
      }
    });
    return response.data;
  }

  private validateResponse(data: Data247Response): Record<string, string>[] {
    if (data.response.status !== 'OK') {
      throw new Error(
        `Data247 API error: ${data.response.status} - ${data.response.message || 'Unknown error'}`
      );
    }
    return data.response.results || [];
  }

  // Balance check
  async getBalance(): Promise<{ balance: string }> {
    let data = await this.request({ api: 'B' });
    let results = this.validateResponse(data);
    return { balance: results[0]?.balance || '0' };
  }

  // Text@ / SMS Gateway lookup
  async smsGatewayLookup(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'MT', phone });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  async smsGatewayLookupBatch(phones: string[]): Promise<Record<string, string>[]> {
    let params: Record<string, string> = { api: 'MT' };
    phones.forEach((phone, i) => {
      params[`p${i + 1}`] = phone;
    });
    let data = await this.request(params);
    return this.validateResponse(data);
  }

  // Carrier247 USA
  async carrierLookupUSA(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'CU', phone });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  async carrierLookupUSABatch(phones: string[]): Promise<Record<string, string>[]> {
    let params: Record<string, string> = { api: 'CU' };
    phones.forEach((phone, i) => {
      params[`p${i + 1}`] = phone;
    });
    let data = await this.request(params);
    return this.validateResponse(data);
  }

  // Carrier247 International
  async carrierLookupInternational(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'CI', phone });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  async carrierLookupInternationalBatch(phones: string[]): Promise<Record<string, string>[]> {
    let params: Record<string, string> = { api: 'CI' };
    phones.forEach((phone, i) => {
      params[`p${i + 1}`] = phone;
    });
    let data = await this.request(params);
    return this.validateResponse(data);
  }

  // Carrier Type
  async carrierTypeLookup(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'CT', phone });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  async carrierTypeLookupBatch(phones: string[]): Promise<Record<string, string>[]> {
    let params: Record<string, string> = { api: 'CT' };
    phones.forEach((phone, i) => {
      params[`p${i + 1}`] = phone;
    });
    let data = await this.request(params);
    return this.validateResponse(data);
  }

  // Verify247 Email
  async verifyEmail(email: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'VE', email });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  async verifyEmailBatch(emails: string[]): Promise<Record<string, string>[]> {
    let params: Record<string, string> = { api: 'VE' };
    emails.forEach((email, i) => {
      params[`p${i + 1}`] = email;
    });
    let data = await this.request(params);
    return this.validateResponse(data);
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
    return results[0] || {};
  }

  // Verify247 Phone
  async verifyPhone(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'VP', phone });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  async verifyPhoneBatch(phones: string[]): Promise<Record<string, string>[]> {
    let params: Record<string, string> = { api: 'VP' };
    phones.forEach((phone, i) => {
      params[`p${i + 1}`] = phone;
    });
    let data = await this.request(params);
    return this.validateResponse(data);
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
      firstname: params.firstname,
      lastname: params.lastname
    };
    if (params.address) reqParams.address = params.address;
    if (params.city) reqParams.city = params.city;
    if (params.state) reqParams.state = params.state;
    if (params.zip) reqParams.zip = params.zip;
    let data = await this.request(reqParams);
    let results = this.validateResponse(data);
    return results[0] || {};
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
      firstname: params.firstname,
      lastname: params.lastname
    };
    if (params.address) reqParams.address = params.address;
    if (params.city) reqParams.city = params.city;
    if (params.state) reqParams.state = params.state;
    if (params.zip) reqParams.zip = params.zip;
    if (params.phone) reqParams.phone = params.phone;
    let data = await this.request(reqParams);
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  // Reverse Phone Lookup
  async reversePhone(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'APR', phone });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  async reversePhoneBatch(phones: string[]): Promise<Record<string, string>[]> {
    let params: Record<string, string> = { api: 'APR' };
    phones.forEach((phone, i) => {
      params[`p${i + 1}`] = phone;
    });
    let data = await this.request(params);
    return this.validateResponse(data);
  }

  // Reverse Email Lookup
  async reverseEmail(email: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'RE', email });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  // Name Lookup (CNAM)
  async nameLookup(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'NL', phone });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  async nameLookupBatch(phones: string[]): Promise<Record<string, string>[]> {
    let params: Record<string, string> = { api: 'NL' };
    phones.forEach((phone, i) => {
      params[`p${i + 1}`] = phone;
    });
    let data = await this.request(params);
    return this.validateResponse(data);
  }

  // Gender Lookup
  async genderLookup(name: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'GL', name });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  // Zipcode Append
  async zipcodeAppend(params: {
    address: string;
    city: string;
    state: string;
  }): Promise<Record<string, string>> {
    let data = await this.request({
      api: 'ZA',
      address: params.address,
      city: params.city,
      state: params.state
    });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  // Reverse Zipcode
  async reverseZipcode(zip: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'RZ', zip });
    let results = this.validateResponse(data);
    return results[0] || {};
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
      firstname: params.firstname,
      lastname: params.lastname,
      address: params.address,
      city: params.city,
      state: params.state,
      zip: params.zip
    });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  // Property Data
  async propertyData(params: {
    address: string;
    city: string;
    state: string;
    zip: string;
  }): Promise<Record<string, string>> {
    let data = await this.request({
      api: 'PD',
      address: params.address,
      city: params.city,
      state: params.state,
      zip: params.zip
    });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  // IP Geolocation
  async ipGeolocation(ip: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'GI', ip });
    let results = this.validateResponse(data);
    return results[0] || {};
  }

  async ipGeolocationBatch(ips: string[]): Promise<Record<string, string>[]> {
    let params: Record<string, string> = { api: 'GI' };
    ips.forEach((ip, i) => {
      params[`p${i + 1}`] = ip;
    });
    let data = await this.request(params);
    return this.validateResponse(data);
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
    return results[0] || {};
  }

  async dncCheckBatch(
    phones: string[],
    orgId?: string,
    san?: string
  ): Promise<Record<string, string>[]> {
    let params: Record<string, string> = { api: 'DC' };
    if (orgId) params.org_id = orgId;
    if (san) params.san = san;
    phones.forEach((phone, i) => {
      params[`p${i + 1}`] = phone;
    });
    let data = await this.request(params);
    return this.validateResponse(data);
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
    return results[0] || {};
  }

  // Trust247 Phone (Spam Check)
  async trustPhone(phone: string): Promise<Record<string, string>> {
    let data = await this.request({ api: 'TP', phone });
    let results = this.validateResponse(data);
    return results[0] || {};
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
