import { createAxios } from 'slates';
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
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; organizationId?: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.beaconstac.com/api/2.0',
      headers: {
        Authorization: `Token ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- QR Codes ----

  async listQrCodes(params?: {
    search?: string;
    ordering?: string;
    organization?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<QrCode>> {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.organization) queryParams.organization = params.organization;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

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
  }): Promise<QrCode> {
    let response = await this.axios.post('/qrcodes/', data);
    return response.data;
  }

  async updateQrCode(qrCodeId: number, data: Record<string, unknown>): Promise<QrCode> {
    let response = await this.axios.put(`/qrcodes/${qrCodeId}/`, data);
    return response.data;
  }

  async deleteQrCode(qrCodeId: number): Promise<void> {
    await this.axios.delete(`/qrcodes/${qrCodeId}/`);
  }

  async downloadQrCode(
    qrCodeId: number,
    params?: {
      format?: string;
      size?: number;
    }
  ): Promise<string> {
    let queryParams: Record<string, string> = {};
    if (params?.format) queryParams.format = params.format;
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
  }): Promise<PaginatedResponse<Form>> {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

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

  async deleteGeofence(geofenceId: number): Promise<void> {
    await this.axios.delete(`/geofences/${geofenceId}/`);
  }

  // ---- Places ----

  async listPlaces(params?: {
    search?: string;
    ordering?: string;
    organization?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Place>> {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.organization) queryParams.organization = params.organization;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

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
      `/../../reporting/2.0/`,
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
        baseURL: 'https://api.beaconstac.com/reporting/2.0'
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
      start_date: params.startDate,
      end_date: params.endDate
    };
    if (params.interval) body.interval = params.interval;
    if (params.timezone) body.timezone = params.timezone;
    if (params.productId !== undefined) body.product_id = params.productId;

    let response = await this.axios.post('/', body, {
      params: {
        organization: params.organizationId,
        method: 'Products.getPerformance'
      },
      baseURL: 'https://api.beaconstac.com/reporting/2.0'
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
      baseURL: 'https://api.beaconstac.com/reporting/2.0'
    });
    return response.data;
  }

  // ---- Form Responses ----

  async listFormResponses(
    formId: number,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get(`/forms/${formId}/responses/`, {
      params: queryParams
    });
    return response.data;
  }
}
