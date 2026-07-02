import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://payhip.com/api/v2'
});

export interface CouponCreateParams {
  code: string;
  couponType: 'single' | 'multi' | 'collection';
  percentOff?: number;
  amountOff?: number;
  productKey?: string;
  collectionId?: string;
  startDate?: string;
  endDate?: string;
  minimumPurchaseAmount?: number;
  usageLimit?: number;
  notes?: string;
}

export interface CouponResponse {
  couponId: string;
  code: string;
  couponType: string;
  percentOff: number | null;
  amountOff: number | null;
  productKey: string | null;
  collectionId: string | null;
  startDate: string | null;
  endDate: string | null;
  minimumPurchaseAmount: number | null;
  usageLimit: number | null;
  notes: string | null;
}

export interface LicenseResponse {
  enabled: boolean;
  licenseKey: string;
  productLink: string;
  buyerEmail: string;
  uses: number;
  productName: string;
  date: string;
}

let mapCouponFromApi = (raw: any): CouponResponse => ({
  couponId: raw.id ?? raw.coupon_id ?? '',
  code: raw.code ?? '',
  couponType: raw.coupon_type ?? '',
  percentOff: raw.percent_off ?? null,
  amountOff: raw.amount_off ?? null,
  productKey: raw.product_key ?? null,
  collectionId: raw.collection_id ?? null,
  startDate: raw.start_date ?? null,
  endDate: raw.end_date ?? null,
  minimumPurchaseAmount: raw.minimum_purchase_amount ?? null,
  usageLimit: raw.usage_limit ?? null,
  notes: raw.notes ?? null
});

let mapLicenseFromApi = (raw: any): LicenseResponse => ({
  enabled: raw.enabled ?? false,
  licenseKey: raw.license_key ?? '',
  productLink: raw.product_link ?? '',
  buyerEmail: raw.buyer_email ?? '',
  uses: raw.uses ?? 0,
  productName: raw.product_name ?? '',
  date: raw.date ?? ''
});

export class CouponClient {
  private apiKey: string;

  constructor(params: { apiKey: string }) {
    this.apiKey = params.apiKey;
  }

  async createCoupon(params: CouponCreateParams): Promise<CouponResponse> {
    let body: Record<string, any> = {
      code: params.code,
      coupon_type: params.couponType
    };

    if (params.percentOff !== undefined) body.percent_off = params.percentOff;
    if (params.amountOff !== undefined) body.amount_off = params.amountOff;
    if (params.productKey) body.product_key = params.productKey;
    if (params.collectionId) body.collection_id = params.collectionId;
    if (params.startDate) body.start_date = params.startDate;
    if (params.endDate) body.end_date = params.endDate;
    if (params.minimumPurchaseAmount !== undefined)
      body.minimum_purchase_amount = params.minimumPurchaseAmount;
    if (params.usageLimit !== undefined) body.usage_limit = params.usageLimit;
    if (params.notes) body.notes = params.notes;

    let response = await http.post('/coupons', body, {
      headers: { 'payhip-api-key': this.apiKey }
    });

    return mapCouponFromApi(response.data?.data ?? response.data);
  }

  async listCoupons(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ coupons: CouponResponse[]; total: number }> {
    let queryParams: Record<string, any> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;

    let response = await http.get('/coupons', {
      headers: { 'payhip-api-key': this.apiKey },
      params: queryParams
    });

    let data = response.data?.data ?? response.data;
    let coupons = Array.isArray(data) ? data.map(mapCouponFromApi) : [];
    let total = response.data?.total ?? coupons.length;

    return { coupons, total };
  }

  async getCoupon(couponId: string): Promise<CouponResponse> {
    let response = await http.get(`/coupons/${couponId}`, {
      headers: { 'payhip-api-key': this.apiKey }
    });

    return mapCouponFromApi(response.data?.data ?? response.data);
  }
}

export class LicenseClient {
  private productSecretKey: string;

  constructor(params: { productSecretKey: string }) {
    this.productSecretKey = params.productSecretKey;
  }

  async verifyLicense(licenseKey: string): Promise<LicenseResponse> {
    let response = await http.get('/license/verify', {
      headers: { 'product-secret-key': this.productSecretKey },
      params: { license_key: licenseKey }
    });

    return mapLicenseFromApi(response.data?.data ?? response.data);
  }

  async enableLicense(licenseKey: string): Promise<LicenseResponse> {
    let response = await http.put(
      '/license/enable',
      { license_key: licenseKey },
      { headers: { 'product-secret-key': this.productSecretKey } }
    );

    return mapLicenseFromApi(response.data?.data ?? response.data);
  }

  async disableLicense(licenseKey: string): Promise<LicenseResponse> {
    let response = await http.put(
      '/license/disable',
      { license_key: licenseKey },
      { headers: { 'product-secret-key': this.productSecretKey } }
    );

    return mapLicenseFromApi(response.data?.data ?? response.data);
  }

  async increaseUsage(licenseKey: string): Promise<LicenseResponse> {
    let response = await http.put(
      '/license/usage',
      { license_key: licenseKey },
      { headers: { 'product-secret-key': this.productSecretKey } }
    );

    return mapLicenseFromApi(response.data?.data ?? response.data);
  }

  async decreaseUsage(licenseKey: string): Promise<LicenseResponse> {
    let response = await http.put(
      '/license/decrease',
      { license_key: licenseKey },
      { headers: { 'product-secret-key': this.productSecretKey } }
    );

    return mapLicenseFromApi(response.data?.data ?? response.data);
  }
}
