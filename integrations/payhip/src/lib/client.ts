import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

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
  raw: Record<string, unknown>;
}

export interface LicenseResponse {
  enabled: boolean;
  licenseKey: string;
  productLink: string;
  buyerEmail: string;
  uses: number;
  productName: string;
  date: string;
  variantName?: string;
  variantId?: string;
  raw: Record<string, unknown>;
}

let createPayhipHttp = (header: string, key: string) => {
  if (!key.trim()) {
    throw createApiServiceError(
      'Configure the required Payhip API key or product secret key.'
    );
  }

  return createAuthenticatedAxios({
    baseURL: 'https://payhip.com/api/v2',
    timeout: 30_000,
    authHeader: { name: header, value: key },
    contentType: 'application/x-www-form-urlencoded',
    headers: { Accept: 'application/json' },
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Payhip',
        reason: 'payhip_api_error',
        extractResponse: (value, helpers) => helpers.getResponseWithBody(value)
      })
  });
};

let unwrapData = (response: unknown) =>
  isApiErrorRecord(response) && 'data' in response ? response.data : response;

let mapCouponFromApi = (value: unknown): CouponResponse => {
  if (
    !isApiErrorRecord(value) ||
    (typeof value.id !== 'number' &&
      typeof value.id !== 'string' &&
      typeof value.coupon_id !== 'string')
  ) {
    throw createApiServiceError(
      'Payhip did not return a coupon. Check the coupon ID and API key.'
    );
  }

  return {
    couponId: String(value.id ?? value.coupon_id),
    code: typeof value.code === 'string' ? value.code : '',
    couponType: typeof value.coupon_type === 'string' ? value.coupon_type : '',
    percentOff: typeof value.percent_off === 'number' ? value.percent_off : null,
    amountOff: typeof value.amount_off === 'number' ? value.amount_off : null,
    productKey: typeof value.product_key === 'string' ? value.product_key : null,
    collectionId: typeof value.collection_id === 'string' ? value.collection_id : null,
    startDate: typeof value.start_date === 'string' ? value.start_date : null,
    endDate: typeof value.end_date === 'string' ? value.end_date : null,
    minimumPurchaseAmount:
      typeof value.minimum_purchase_amount === 'number' ? value.minimum_purchase_amount : null,
    usageLimit: typeof value.usage_limit === 'number' ? value.usage_limit : null,
    notes: typeof value.notes === 'string' ? value.notes : null,
    raw: value
  };
};

let mapLicenseFromApi = (value: unknown): LicenseResponse => {
  if (
    !isApiErrorRecord(value) ||
    typeof value.license_key !== 'string' ||
    !value.license_key ||
    typeof value.enabled !== 'boolean'
  ) {
    throw createApiServiceError(
      'Payhip did not return a license key. Check that the license key belongs to the configured product secret key.'
    );
  }

  return {
    enabled: value.enabled,
    licenseKey: value.license_key,
    productLink: typeof value.product_link === 'string' ? value.product_link : '',
    buyerEmail: typeof value.buyer_email === 'string' ? value.buyer_email : '',
    uses: typeof value.uses === 'number' ? value.uses : 0,
    productName: typeof value.product_name === 'string' ? value.product_name : '',
    date: typeof value.date === 'string' ? value.date : '',
    ...pickDefined({
      variantName: typeof value.variant_name === 'string' ? value.variant_name : undefined,
      variantId: typeof value.variant_id === 'string' ? value.variant_id : undefined
    }),
    raw: value
  };
};

let validateCoupon = (params: CouponCreateParams) => {
  if (!params.code.trim()) throw createApiServiceError('Provide a non-empty coupon code.');
  if ((params.percentOff === undefined) === (params.amountOff === undefined)) {
    throw createApiServiceError('Provide exactly one of percentOff or amountOff.');
  }
  if (
    params.percentOff !== undefined &&
    (!Number.isFinite(params.percentOff) || params.percentOff <= 0 || params.percentOff > 100)
  ) {
    throw createApiServiceError('percentOff must be greater than 0 and at most 100.');
  }
  for (let [field, value] of Object.entries({
    amountOff: params.amountOff,
    minimumPurchaseAmount: params.minimumPurchaseAmount,
    usageLimit: params.usageLimit
  })) {
    if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
      throw createApiServiceError(`${field} must be a positive whole number.`);
    }
  }
  if (params.couponType === 'single' && !params.productKey?.trim()) {
    throw createApiServiceError('Provide productKey when couponType is "single".');
  }
  if (params.couponType === 'collection' && !params.collectionId?.trim()) {
    throw createApiServiceError('Provide collectionId when couponType is "collection".');
  }
  for (let [field, value] of Object.entries({
    startDate: params.startDate,
    endDate: params.endDate
  })) {
    if (
      value !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ||
        !Number.isFinite(Date.parse(value)))
    ) {
      throw createApiServiceError(
        `${field} must be an RFC 3339 date and time with a timezone.`
      );
    }
  }
  if (
    params.startDate &&
    params.endDate &&
    Date.parse(params.startDate) > Date.parse(params.endDate)
  ) {
    throw createApiServiceError('endDate must be on or after startDate.');
  }
};

export class CouponClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { apiKey: string }) {
    this.http = createPayhipHttp('payhip-api-key', params.apiKey);
  }

  async createCoupon(params: CouponCreateParams): Promise<CouponResponse> {
    validateCoupon(params);
    let fields = pickDefined({
      code: params.code,
      coupon_type: params.couponType,
      percent_off: params.percentOff,
      amount_off: params.amountOff,
      product_key: params.productKey,
      collection_id: params.collectionId,
      start_date: params.startDate,
      end_date: params.endDate,
      minimum_purchase_amount: params.minimumPurchaseAmount,
      usage_limit: params.usageLimit,
      notes: params.notes
    });
    let body = new URLSearchParams();
    for (let [key, value] of Object.entries(fields)) body.set(key, String(value));
    let response = await this.http.post('/coupons', body.toString());
    return mapCouponFromApi(unwrapData(response.data));
  }

  async listCoupons(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ coupons: CouponResponse[]; total: number; raw: unknown }> {
    if (
      params?.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
    ) {
      throw createApiServiceError('limit must be a whole number from 1 to 100.');
    }
    if (
      params?.offset !== undefined &&
      (!Number.isInteger(params.offset) || params.offset < 0)
    ) {
      throw createApiServiceError('offset must be a non-negative whole number.');
    }
    let response = await this.http.get('/coupons', { params: pickDefined(params ?? {}) });
    let data = unwrapData(response.data);
    let values = Array.isArray(data)
      ? data
      : isApiErrorRecord(data)
        ? data.coupons
        : undefined;
    if (!Array.isArray(values)) {
      throw createApiServiceError('Payhip did not return a coupon list. Check the API key.');
    }
    let coupons = values.map(mapCouponFromApi);
    let total =
      isApiErrorRecord(data) && typeof data.total === 'number'
        ? data.total
        : isApiErrorRecord(response.data) && typeof response.data.total === 'number'
          ? response.data.total
          : coupons.length;
    return { coupons, total, raw: response.data };
  }

  async getCoupon(couponId: string): Promise<CouponResponse> {
    if (!couponId.trim()) throw createApiServiceError('Provide a non-empty coupon ID.');
    let response = await this.http.get(`/coupons/${encodeURIComponent(couponId)}`);
    return mapCouponFromApi(unwrapData(response.data));
  }
}

export class LicenseClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { productSecretKey: string }) {
    this.http = createPayhipHttp('product-secret-key', params.productSecretKey);
  }

  private async requestLicense(
    endpoint: 'verify' | 'enable' | 'disable' | 'usage' | 'decrease',
    licenseKey: string
  ): Promise<LicenseResponse> {
    if (!licenseKey.trim()) throw createApiServiceError('Provide a non-empty license key.');
    let response =
      endpoint === 'verify'
        ? await this.http.get('/license/verify', { params: { license_key: licenseKey } })
        : await this.http.put(
            `/license/${endpoint}`,
            new URLSearchParams({ license_key: licenseKey }).toString()
          );
    return mapLicenseFromApi(unwrapData(response.data));
  }

  verifyLicense(licenseKey: string): Promise<LicenseResponse> {
    return this.requestLicense('verify', licenseKey);
  }

  enableLicense(licenseKey: string): Promise<LicenseResponse> {
    return this.requestLicense('enable', licenseKey);
  }

  disableLicense(licenseKey: string): Promise<LicenseResponse> {
    return this.requestLicense('disable', licenseKey);
  }

  increaseUsage(licenseKey: string): Promise<LicenseResponse> {
    return this.requestLicense('usage', licenseKey);
  }

  decreaseUsage(licenseKey: string): Promise<LicenseResponse> {
    return this.requestLicense('decrease', licenseKey);
  }
}
