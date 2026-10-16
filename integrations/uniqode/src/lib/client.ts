import { buildApiServiceError, createAuthenticatedAxios } from 'slates';
import type {
  AnalyticsOverview,
  AnalyticsPerformance,
  Beacon,
  BulkQrCode,
  Form,
  Geofence,
  MarkdownCard,
  NfcTag,
  PaginatedResponse,
  Place,
  QrCode
} from './types';

export class BeaconstacClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; organizationId?: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.uniqode.com/api/2.0',
      authHeader: { value: `Token ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Uniqode',
          reason: 'uniqode_request_failed',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          extractUpstreamCode: (_error, response, helpers) => {
            let body = response?.data;
            return helpers.isRecord(body) &&
              (typeof body.code === 'string' || typeof body.code === 'number')
              ? String(body.code)
              : undefined;
          },
          extractMessage: (error, helpers) => {
            let body = helpers.getResponseWithBody(error)?.data;
            let details: string[] = [];
            helpers.collectDetails(body, details);
            if (helpers.isRecord(body)) {
              let fields = helpers.isRecord(body.errors) ? body.errors : body;
              for (let [field, value] of Object.entries(fields)) {
                if (!Array.isArray(value)) continue;
                let messages: string[] = [];
                helpers.collectDetails(value, messages);
                if (messages.length) details.push(`${field}: ${messages.join(', ')}`);
              }
            }
            return details.length ? details.join(' - ') : undefined;
          }
        })
    });
  }

  // ---- QR Codes ----

  async listQrCodes(params?: {
    search?: string;
    ordering?: string;
    organization?: string;
    limit?: number;
    offset?: number;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<QrCode>> {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.name__icontains = params.search;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.organization) queryParams.organization = params.organization;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.pageSize !== undefined) queryParams.page_size = String(params.pageSize);

    let response = await this.axios.get('/qrcodes/', { params: queryParams });
    return response.data;
  }

  async getQrCode(qrCodeId: number): Promise<QrCode> {
    let response = await this.axios.get(`/qrcodes/${qrCodeId}/`);
    return response.data;
  }

  async createQrCode(data: {
    name: string;
    organization: number;
    qr_type: number;
    campaign?: Record<string, unknown>;
    fields_data?: Record<string, unknown>;
    attributes?: Record<string, unknown>;
    place?: number;
    location_enabled?: boolean;
    template?: number;
    tags?: number[];
  }): Promise<QrCode> {
    let response = await this.axios.post('/qrcodes/', data);
    return response.data;
  }

  async updateQrCode(qrCodeId: number, data: Record<string, unknown>): Promise<QrCode> {
    let current = await this.getQrCode(qrCodeId);
    let response = await this.axios.put(`/qrcodes/${qrCodeId}/`, {
      name: current.name,
      organization: current.organization,
      qr_type: current.qr_type,
      ...(current.campaign ? { campaign: current.campaign } : {}),
      ...data,
      ...(data.campaign
        ? { campaign: { ...current.campaign, ...(data.campaign as Record<string, unknown>) } }
        : {})
    });
    return response.data;
  }

  async deleteQrCode(qrCodeId: number): Promise<unknown> {
    return (await this.axios.delete(`/qrcodes/${qrCodeId}/`)).data;
  }

  async downloadQrCode(
    qrCodeId: number,
    params?: {
      format?: string;
      size?: number;
    }
  ): Promise<unknown> {
    let queryParams: Record<string, string> = {};
    if (params?.format) queryParams.canvas_type = params.format;
    if (params?.size !== undefined) queryParams.size = String(params.size);

    let response = await this.axios.get(`/qrcodes/${qrCodeId}/download/`, {
      params: queryParams
    });
    return response.data;
  }

  // ---- Bulk QR Codes ----

  async listBulkQrCodes(params?: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<BulkQrCode>> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/bulkqrcodes/', { params: queryParams });
    return response.data;
  }

  async getBulkQrCode(bulkId: number): Promise<BulkQrCode> {
    let response = await this.axios.get(`/bulkqrcodes/${bulkId}/`);
    return response.data;
  }

  // ---- Campaigns / Landing Pages (Markdown Cards) ----

  async listMarkdownCards(params?: {
    search?: string;
    ordering?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<MarkdownCard>> {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/markdowncards/', { params: queryParams });
    return response.data;
  }

  async getMarkdownCard(cardId: number): Promise<MarkdownCard> {
    let response = await this.axios.get(`/markdowncards/${cardId}/`);
    return response.data;
  }

  async createMarkdownCard(data: {
    title: string;
    description?: string;
    body?: string;
    language_code?: string;
    organization?: number;
  }): Promise<MarkdownCard> {
    let response = await this.axios.post('/markdowncards/', data);
    return response.data;
  }

  async updateMarkdownCard(
    cardId: number,
    data: Record<string, unknown>
  ): Promise<MarkdownCard> {
    let response = await this.axios.put(`/markdowncards/${cardId}/`, data);
    return response.data;
  }

  // ---- Forms ----

  async listForms(params?: {
    search?: string;
    ordering?: string;
    limit?: number;
    offset?: number;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Form>> {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.title__icontains = params.search;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.pageSize !== undefined) queryParams.page_size = String(params.pageSize);

    let response = await this.axios.get('/forms/', { params: queryParams });
    return response.data;
  }

  async getForm(formId: number): Promise<Form> {
    let response = await this.axios.get(`/forms/${formId}/`);
    return response.data;
  }

  async createForm(data: {
    title: string;
    organization?: number;
    form_type?: string;
  }): Promise<Form> {
    let response = await this.axios.post('/forms/', data);
    return response.data;
  }

  async updateForm(formId: number, data: Record<string, unknown>): Promise<Form> {
    let response = await this.axios.put(`/forms/${formId}/`, data);
    return response.data;
  }

  // ---- Beacons ----

  async listBeacons(params?: {
    search?: string;
    ordering?: string;
    organization?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Beacon>> {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.organization) queryParams.organization = params.organization;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/beacons/', { params: queryParams });
    return response.data;
  }

  async getBeacon(beaconId: number): Promise<Beacon> {
    let response = await this.axios.get(`/beacons/${beaconId}/`);
    return response.data;
  }

  async updateBeacon(beaconId: number, data: Record<string, unknown>): Promise<Beacon> {
    let response = await this.axios.put(`/beacons/${beaconId}/`, data);
    return response.data;
  }

  // ---- NFC Tags ----

  async listNfcTags(params?: {
    search?: string;
    ordering?: string;
    organization?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<NfcTag>> {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.organization) queryParams.organization = params.organization;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/nfctags/', { params: queryParams });
    return response.data;
  }

  async getNfcTag(nfcTagId: number): Promise<NfcTag> {
    let response = await this.axios.get(`/nfctags/${nfcTagId}/`);
    return response.data;
  }

  async updateNfcTag(nfcTagId: number, data: Record<string, unknown>): Promise<NfcTag> {
    let response = await this.axios.put(`/nfctags/${nfcTagId}/`, data);
    return response.data;
  }

  // ---- Geofences ----

  async listGeofences(params?: {
    search?: string;
    ordering?: string;
    organization?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Geofence>> {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.organization) queryParams.organization = params.organization;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/geofences/', { params: queryParams });
    return response.data;
  }

  async getGeofence(geofenceId: number): Promise<Geofence> {
    let response = await this.axios.get(`/geofences/${geofenceId}/`);
    return response.data;
  }

  async createGeofence(data: {
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    place?: number;
    campaign?: Record<string, unknown>;
    organization?: number;
  }): Promise<Geofence> {
    let response = await this.axios.post('/geofences/', data);
    return response.data;
  }

  async updateGeofence(geofenceId: number, data: Record<string, unknown>): Promise<Geofence> {
    let response = await this.axios.put(`/geofences/${geofenceId}/`, data);
    return response.data;
  }

  async deleteGeofence(geofenceId: number): Promise<unknown> {
    return (await this.axios.delete(`/geofences/${geofenceId}/`)).data;
  }

  // ---- Places ----

  async listPlaces(params?: {
    search?: string;
    ordering?: string;
    organization?: string;
    limit?: number;
    offset?: number;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Place>> {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.organization) queryParams.organization = params.organization;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.pageSize !== undefined) queryParams.page_size = String(params.pageSize);

    let response = await this.axios.get('/places/', { params: queryParams });
    return response.data;
  }

  async getPlace(placeId: number): Promise<Place> {
    let response = await this.axios.get(`/places/${placeId}/`);
    return response.data;
  }

  // ---- Analytics ----

  async getAnalyticsOverview(params: {
    organizationId: string;
    productType: string;
    startDate: string;
    endDate: string;
  }): Promise<AnalyticsOverview> {
    let response = await this.axios.post(
      '/',
      {
        product_type: params.productType,
        start_date: params.startDate,
        end_date: params.endDate
      },
      {
        params: {
          organization: params.organizationId,
          method: 'Overview.getPeriodOverview'
        },
        baseURL: 'https://api.uniqode.com/reporting/2.0'
      }
    );
    return response.data;
  }

  async getAnalyticsPerformance(params: {
    organizationId: string;
    productType: string;
    startDate: string;
    endDate: string;
    interval?: string;
    timezone?: string;
    productId?: number;
  }): Promise<AnalyticsPerformance> {
    let body: Record<string, unknown> = {
      product_type: params.productType,
      from: params.startDate,
      to: params.endDate
    };
    if (params.interval) body.interval = params.interval;
    if (params.timezone) body.timezone = params.timezone;
    if (params.productId !== undefined) body.product_id = params.productId;

    let response = await this.axios.post('/', body, {
      params: {
        organization: params.organizationId,
        method: 'Products.getPerformance'
      },
      baseURL: 'https://api.uniqode.com/reporting/2.0'
    });
    return response.data;
  }

  async getAnalyticsImpressions(params: {
    organizationId: string;
    productType: string;
    startDate: string;
    endDate: string;
    productId?: number;
    placeId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      product_type: params.productType,
      start_date: params.startDate,
      end_date: params.endDate
    };
    if (params.productId !== undefined) body.product_id = params.productId;
    if (params.placeId !== undefined) body.place_id = params.placeId;
    if (params.limit !== undefined) body.limit = params.limit;
    if (params.offset !== undefined) body.offset = params.offset;

    let response = await this.axios.post('/', body, {
      params: {
        organization: params.organizationId,
        method: 'Products.getImpressions'
      },
      baseURL: 'https://api.uniqode.com/reporting/2.0'
    });
    return response.data;
  }

  // ---- Form Responses ----

  async listFormResponses(
    formId: number,
    params?: {
      limit?: number;
      offset?: number;
      page?: number;
      pageSize?: number;
      organization?: string;
      since?: string;
      until?: string;
      timezone?: string;
    }
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.pageSize !== undefined) queryParams.page_size = String(params.pageSize);
    if (params?.organization !== undefined) queryParams.organization = params.organization;
    if (params?.since !== undefined) queryParams.since = params.since;
    if (params?.until !== undefined) queryParams.until = params.until;
    if (params?.timezone !== undefined) queryParams.timezone = params.timezone;

    let response = await this.axios.get(`/forms/${formId}/responses/`, {
      params: queryParams
    });
    return response.data;
  }

  async listOrganizations(params: { page?: number; page_size?: number }) {
    return (await this.axios.get('/organizations/', { params })).data;
  }

  async listCards(params: Record<string, unknown>) {
    return (await this.axios.get('/dbc/', { params })).data;
  }

  async getCard(id: number, organization: number) {
    return (await this.axios.get(`/dbc/${id}/`, { params: { organization } })).data;
  }

  async createCard(data: Record<string, unknown>, organization: number) {
    return (await this.axios.post('/dbc/', data, { params: { organization } })).data;
  }

  async updateCard(id: number, data: Record<string, unknown>, organization: number) {
    return (await this.axios.put(`/dbc/${id}/`, data, { params: { organization } })).data;
  }

  async deleteCard(id: number, organization: number) {
    return (await this.axios.delete(`/dbc/${id}/`, { params: { organization } })).data;
  }

  async setCardState(id: number, organization: number, active: boolean) {
    let options = { params: { organization } };
    return active
      ? (await this.axios.put(`/dbc/${id}/activate/`, undefined, options)).data
      : (await this.axios.delete(`/dbc/${id}/activate/`, options)).data;
  }

  async setQrCodeState(id: number, active: boolean) {
    return active
      ? (await this.axios.put(`/qrcodes/${id}/activate/`)).data
      : (await this.axios.delete(`/qrcodes/${id}/activate/`)).data;
  }

  async getQrAnalytics(organization: number, path: string, body: Record<string, unknown>) {
    return (await this.axios.post(`/organizations/${organization}/products/qr/${path}/`, body))
      .data;
  }
}
