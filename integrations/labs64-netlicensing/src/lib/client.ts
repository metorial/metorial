import { createAxios } from 'slates';

let BASE_URL = 'https://go.netlicensing.io/core/v2/rest';

export interface NetLicensingItem {
  type: string;
  property: Array<{ name: string; value: string }>;
  list?: Array<{
    name: string;
    property?: Array<{ name: string; value: string }>;
    list?: any[];
  }>;
}

export interface NetLicensingResponse {
  items?: {
    item?: NetLicensingItem[];
    pagenumber?: string;
    itemsnumber?: string;
    totalpages?: string;
    totalitems?: string;
    hasnext?: string;
  };
  infos?: {
    info?: Array<{ id: string; type: string; value: string }>;
  };
}

export let parseItem = (item: NetLicensingItem): Record<string, any> => {
  let result: Record<string, any> = {};

  if (item.property) {
    for (let prop of item.property) {
      try {
        result[prop.name] = JSON.parse(prop.value);
      } catch {
        result[prop.name] = prop.value;
      }
    }
  }

  if (item.list) {
    for (let listItem of item.list) {
      let name = listItem.name;
      if (!result[name]) {
        result[name] = [];
      }
      let listObj: Record<string, any> = {};
      if (listItem.property) {
        for (let prop of listItem.property) {
          try {
            listObj[prop.name] = JSON.parse(prop.value);
          } catch {
            listObj[prop.name] = prop.value;
          }
        }
      }
      (result[name] as any[]).push(listObj);
    }
  }

  return result;
};

export let parseItems = (
  response: NetLicensingResponse,
  type?: string
): Record<string, any>[] => {
  let items = response?.items?.item;
  if (!items || !Array.isArray(items)) {
    return [];
  }
  let filtered = type ? items.filter(item => item.type === type) : items;
  return filtered.map(parseItem);
};

export let parseFirstItem = (
  response: NetLicensingResponse,
  type?: string
): Record<string, any> | null => {
  let items = parseItems(response, type);
  return items.length > 0 ? (items[0] ?? null) : null;
};

export let buildFormData = (params: Record<string, any>): string => {
  let parts: string[] = [];
  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (let v of value) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join('&');
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(authToken: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Basic ${authToken}`,
        Accept: 'application/json'
      }
    });
  }

  // --- Products ---

  async listProducts(): Promise<Record<string, any>[]> {
    let res = await this.axios.get('/product');
    return parseItems(res.data, 'Product');
  }

  async getProduct(productNumber: string): Promise<Record<string, any> | null> {
    let res = await this.axios.get(`/product/${encodeURIComponent(productNumber)}`);
    return parseFirstItem(res.data, 'Product');
  }

  async createProduct(params: Record<string, any>): Promise<Record<string, any> | null> {
    let res = await this.axios.post('/product', buildFormData(params), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return parseFirstItem(res.data, 'Product');
  }

  async updateProduct(
    productNumber: string,
    params: Record<string, any>
  ): Promise<Record<string, any> | null> {
    let res = await this.axios.post(
      `/product/${encodeURIComponent(productNumber)}`,
      buildFormData(params),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return parseFirstItem(res.data, 'Product');
  }

  async deleteProduct(productNumber: string, forceCascade?: boolean): Promise<void> {
    let url = `/product/${encodeURIComponent(productNumber)}`;
    if (forceCascade) url += '?forceCascade=true';
    await this.axios.delete(url);
  }

  // --- Product Modules ---

  async listProductModules(): Promise<Record<string, any>[]> {
    let res = await this.axios.get('/productmodule');
    return parseItems(res.data, 'ProductModule');
  }

  async getProductModule(productModuleNumber: string): Promise<Record<string, any> | null> {
    let res = await this.axios.get(
      `/productmodule/${encodeURIComponent(productModuleNumber)}`
    );
    return parseFirstItem(res.data, 'ProductModule');
  }

  async createProductModule(params: Record<string, any>): Promise<Record<string, any> | null> {
    let res = await this.axios.post('/productmodule', buildFormData(params), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return parseFirstItem(res.data, 'ProductModule');
  }

  async updateProductModule(
    productModuleNumber: string,
    params: Record<string, any>
  ): Promise<Record<string, any> | null> {
    let res = await this.axios.post(
      `/productmodule/${encodeURIComponent(productModuleNumber)}`,
      buildFormData(params),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return parseFirstItem(res.data, 'ProductModule');
  }

  async deleteProductModule(
    productModuleNumber: string,
    forceCascade?: boolean
  ): Promise<void> {
    let url = `/productmodule/${encodeURIComponent(productModuleNumber)}`;
    if (forceCascade) url += '?forceCascade=true';
    await this.axios.delete(url);
  }

  // --- License Templates ---

  async listLicenseTemplates(): Promise<Record<string, any>[]> {
    let res = await this.axios.get('/licensetemplate');
    return parseItems(res.data, 'LicenseTemplate');
  }

  async getLicenseTemplate(
    licenseTemplateNumber: string
  ): Promise<Record<string, any> | null> {
    let res = await this.axios.get(
      `/licensetemplate/${encodeURIComponent(licenseTemplateNumber)}`
    );
    return parseFirstItem(res.data, 'LicenseTemplate');
  }

  async createLicenseTemplate(
    params: Record<string, any>
  ): Promise<Record<string, any> | null> {
    let res = await this.axios.post('/licensetemplate', buildFormData(params), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return parseFirstItem(res.data, 'LicenseTemplate');
  }

  async updateLicenseTemplate(
    licenseTemplateNumber: string,
    params: Record<string, any>
  ): Promise<Record<string, any> | null> {
    let res = await this.axios.post(
      `/licensetemplate/${encodeURIComponent(licenseTemplateNumber)}`,
      buildFormData(params),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return parseFirstItem(res.data, 'LicenseTemplate');
  }

  async deleteLicenseTemplate(
    licenseTemplateNumber: string,
    forceCascade?: boolean
  ): Promise<void> {
    let url = `/licensetemplate/${encodeURIComponent(licenseTemplateNumber)}`;
    if (forceCascade) url += '?forceCascade=true';
    await this.axios.delete(url);
  }

  // --- Licensees ---

  async listLicensees(): Promise<Record<string, any>[]> {
    let res = await this.axios.get('/licensee');
    return parseItems(res.data, 'Licensee');
  }

  async getLicensee(licenseeNumber: string): Promise<Record<string, any> | null> {
    let res = await this.axios.get(`/licensee/${encodeURIComponent(licenseeNumber)}`);
    return parseFirstItem(res.data, 'Licensee');
  }

  async createLicensee(params: Record<string, any>): Promise<Record<string, any> | null> {
    let res = await this.axios.post('/licensee', buildFormData(params), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return parseFirstItem(res.data, 'Licensee');
  }

  async updateLicensee(
    licenseeNumber: string,
    params: Record<string, any>
  ): Promise<Record<string, any> | null> {
    let res = await this.axios.post(
      `/licensee/${encodeURIComponent(licenseeNumber)}`,
      buildFormData(params),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return parseFirstItem(res.data, 'Licensee');
  }

  async deleteLicensee(licenseeNumber: string, forceCascade?: boolean): Promise<void> {
    let url = `/licensee/${encodeURIComponent(licenseeNumber)}`;
    if (forceCascade) url += '?forceCascade=true';
    await this.axios.delete(url);
  }

  async validateLicensee(
    licenseeNumber: string,
    params?: Record<string, any>
  ): Promise<NetLicensingResponse> {
    let body = params ? buildFormData(params) : '';
    let res = await this.axios.post(
      `/licensee/${encodeURIComponent(licenseeNumber)}/validate`,
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return res.data;
  }

  async transferLicenses(
    targetLicenseeNumber: string,
    sourceLicenseeNumber: string
  ): Promise<void> {
    let body = buildFormData({ sourceLicenseeNumber });
    await this.axios.post(
      `/licensee/${encodeURIComponent(targetLicenseeNumber)}/transfer`,
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  }

  // --- Licenses ---

  async listLicenses(): Promise<Record<string, any>[]> {
    let res = await this.axios.get('/license');
    return parseItems(res.data, 'License');
  }

  async getLicense(licenseNumber: string): Promise<Record<string, any> | null> {
    let res = await this.axios.get(`/license/${encodeURIComponent(licenseNumber)}`);
    return parseFirstItem(res.data, 'License');
  }

  async createLicense(params: Record<string, any>): Promise<Record<string, any> | null> {
    let res = await this.axios.post('/license', buildFormData(params), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return parseFirstItem(res.data, 'License');
  }

  async updateLicense(
    licenseNumber: string,
    params: Record<string, any>
  ): Promise<Record<string, any> | null> {
    let res = await this.axios.post(
      `/license/${encodeURIComponent(licenseNumber)}`,
      buildFormData(params),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return parseFirstItem(res.data, 'License');
  }

  async deleteLicense(licenseNumber: string): Promise<void> {
    await this.axios.delete(`/license/${encodeURIComponent(licenseNumber)}`);
  }

  // --- Bundles ---

  async listBundles(): Promise<Record<string, any>[]> {
    let res = await this.axios.get('/bundle');
    return parseItems(res.data, 'Bundle');
  }

  async getBundle(bundleNumber: string): Promise<Record<string, any> | null> {
    let res = await this.axios.get(`/bundle/${encodeURIComponent(bundleNumber)}`);
    return parseFirstItem(res.data, 'Bundle');
  }

  async createBundle(params: Record<string, any>): Promise<Record<string, any> | null> {
    let res = await this.axios.post('/bundle', buildFormData(params), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return parseFirstItem(res.data, 'Bundle');
  }

  async updateBundle(
    bundleNumber: string,
    params: Record<string, any>
  ): Promise<Record<string, any> | null> {
    let res = await this.axios.post(
      `/bundle/${encodeURIComponent(bundleNumber)}`,
      buildFormData(params),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return parseFirstItem(res.data, 'Bundle');
  }

  async deleteBundle(bundleNumber: string): Promise<void> {
    await this.axios.delete(`/bundle/${encodeURIComponent(bundleNumber)}`);
  }

  async obtainBundle(
    bundleNumber: string,
    licenseeNumber: string
  ): Promise<Record<string, any>[]> {
    let body = buildFormData({ licenseeNumber });
    let res = await this.axios.post(
      `/bundle/${encodeURIComponent(bundleNumber)}/obtain`,
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return parseItems(res.data, 'License');
  }

  // --- Tokens ---

  async listTokens(): Promise<Record<string, any>[]> {
    let res = await this.axios.get('/token');
    return parseItems(res.data, 'Token');
  }

  async getToken(tokenNumber: string): Promise<Record<string, any> | null> {
    let res = await this.axios.get(`/token/${encodeURIComponent(tokenNumber)}`);
    return parseFirstItem(res.data, 'Token');
  }

  async createToken(params: Record<string, any>): Promise<Record<string, any> | null> {
    let res = await this.axios.post('/token', buildFormData(params), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return parseFirstItem(res.data, 'Token');
  }

  async deleteToken(tokenNumber: string): Promise<void> {
    await this.axios.delete(`/token/${encodeURIComponent(tokenNumber)}`);
  }

  // --- Transactions ---

  async listTransactions(): Promise<Record<string, any>[]> {
    let res = await this.axios.get('/transaction');
    return parseItems(res.data, 'Transaction');
  }

  async getTransaction(transactionNumber: string): Promise<Record<string, any> | null> {
    let res = await this.axios.get(`/transaction/${encodeURIComponent(transactionNumber)}`);
    return parseFirstItem(res.data, 'Transaction');
  }

  async createTransaction(params: Record<string, any>): Promise<Record<string, any> | null> {
    let res = await this.axios.post('/transaction', buildFormData(params), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return parseFirstItem(res.data, 'Transaction');
  }

  async updateTransaction(
    transactionNumber: string,
    params: Record<string, any>
  ): Promise<Record<string, any> | null> {
    let res = await this.axios.post(
      `/transaction/${encodeURIComponent(transactionNumber)}`,
      buildFormData(params),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return parseFirstItem(res.data, 'Transaction');
  }
}
