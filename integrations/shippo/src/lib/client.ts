import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class ShippoClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.goshippo.com',
      headers: {
        Authorization: `ShippoToken ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Addresses ──────────────────────────────────────────────────────

  async createAddress(data: Record<string, unknown>) {
    let response = await this.axios.post('/addresses', data);
    return response.data;
  }

  async getAddress(addressId: string) {
    let response = await this.axios.get(`/addresses/${addressId}`);
    return response.data;
  }

  async listAddresses(params?: { page?: number; results?: number }) {
    let response = await this.axios.get('/addresses', { params });
    return response.data as PaginatedResponse<Record<string, unknown>>;
  }

  async validateAddress(addressId: string) {
    let response = await this.axios.get(`/addresses/${addressId}/validate`);
    return response.data;
  }

  // ─── Parcels ────────────────────────────────────────────────────────

  async createParcel(data: Record<string, unknown>) {
    let response = await this.axios.post('/parcels', data);
    return response.data;
  }

  async getParcel(parcelId: string) {
    let response = await this.axios.get(`/parcels/${parcelId}`);
    return response.data;
  }

  async listParcels(params?: { page?: number; results?: number }) {
    let response = await this.axios.get('/parcels', { params });
    return response.data as PaginatedResponse<Record<string, unknown>>;
  }

  // ─── Shipments ──────────────────────────────────────────────────────

  async createShipment(data: Record<string, unknown>) {
    let response = await this.axios.post('/shipments', data);
    return response.data;
  }

  async getShipment(shipmentId: string) {
    let response = await this.axios.get(`/shipments/${shipmentId}`);
    return response.data;
  }

  async listShipments(params?: { page?: number; results?: number }) {
    let response = await this.axios.get('/shipments', { params });
    return response.data as PaginatedResponse<Record<string, unknown>>;
  }

  // ─── Rates ──────────────────────────────────────────────────────────

  async getRate(rateId: string) {
    let response = await this.axios.get(`/rates/${rateId}`);
    return response.data;
  }

  async getShipmentRates(shipmentId: string, params?: { page?: number; results?: number }) {
    let response = await this.axios.get(`/shipments/${shipmentId}/rates`, { params });
    return response.data as PaginatedResponse<Record<string, unknown>>;
  }

  // ─── Transactions (Labels) ─────────────────────────────────────────

  async createTransaction(data: Record<string, unknown>) {
    let response = await this.axios.post('/transactions', data);
    return response.data;
  }

  async getTransaction(transactionId: string) {
    let response = await this.axios.get(`/transactions/${transactionId}`);
    return response.data;
  }

  async listTransactions(params?: {
    page?: number;
    results?: number;
    rate?: string;
    tracking_status?: string;
  }) {
    let response = await this.axios.get('/transactions', { params });
    return response.data as PaginatedResponse<Record<string, unknown>>;
  }

  // ─── Tracking ───────────────────────────────────────────────────────

  async getTrackingStatus(carrier: string, trackingNumber: string) {
    let response = await this.axios.get(`/tracks/${carrier}/${trackingNumber}`);
    return response.data;
  }

  async registerTrackingWebhook(data: {
    carrier: string;
    tracking_number: string;
    metadata?: string;
  }) {
    let response = await this.axios.post('/tracks', data);
    return response.data;
  }

  // ─── Customs Items ──────────────────────────────────────────────────

  async createCustomsItem(data: Record<string, unknown>) {
    let response = await this.axios.post('/customs/items', data);
    return response.data;
  }

  async getCustomsItem(itemId: string) {
    let response = await this.axios.get(`/customs/items/${itemId}`);
    return response.data;
  }

  async listCustomsItems(params?: { page?: number; results?: number }) {
    let response = await this.axios.get('/customs/items', { params });
    return response.data as PaginatedResponse<Record<string, unknown>>;
  }

  // ─── Customs Declarations ───────────────────────────────────────────

  async createCustomsDeclaration(data: Record<string, unknown>) {
    let response = await this.axios.post('/customs/declarations', data);
    return response.data;
  }

  async getCustomsDeclaration(declarationId: string) {
    let response = await this.axios.get(`/customs/declarations/${declarationId}`);
    return response.data;
  }

  async listCustomsDeclarations(params?: { page?: number; results?: number }) {
    let response = await this.axios.get('/customs/declarations', { params });
    return response.data as PaginatedResponse<Record<string, unknown>>;
  }

  // ─── Orders ─────────────────────────────────────────────────────────

  async createOrder(data: Record<string, unknown>) {
    let response = await this.axios.post('/orders', data);
    return response.data;
  }

  async getOrder(orderId: string) {
    let response = await this.axios.get(`/orders/${orderId}`);
    return response.data;
  }

  async listOrders(params?: { page?: number; results?: number }) {
    let response = await this.axios.get('/orders', { params });
    return response.data as PaginatedResponse<Record<string, unknown>>;
  }

  // ─── Carrier Accounts ──────────────────────────────────────────────

  async createCarrierAccount(data: Record<string, unknown>) {
    let response = await this.axios.post('/carrier_accounts', data);
    return response.data;
  }

  async getCarrierAccount(accountId: string) {
    let response = await this.axios.get(`/carrier_accounts/${accountId}`);
    return response.data;
  }

  async listCarrierAccounts(params?: { page?: number; results?: number; carrier?: string }) {
    let response = await this.axios.get('/carrier_accounts', { params });
    return response.data as PaginatedResponse<Record<string, unknown>>;
  }

  async updateCarrierAccount(accountId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/carrier_accounts/${accountId}`, data);
    return response.data;
  }

  // ─── Manifests ──────────────────────────────────────────────────────

  async createManifest(data: Record<string, unknown>) {
    let response = await this.axios.post('/manifests', data);
    return response.data;
  }

  async getManifest(manifestId: string) {
    let response = await this.axios.get(`/manifests/${manifestId}`);
    return response.data;
  }

  async listManifests(params?: { page?: number; results?: number }) {
    let response = await this.axios.get('/manifests', { params });
    return response.data as PaginatedResponse<Record<string, unknown>>;
  }

  // ─── Pickups ────────────────────────────────────────────────────────

  async createPickup(data: Record<string, unknown>) {
    let response = await this.axios.post('/pickups', data);
    return response.data;
  }

  // ─── Refunds ────────────────────────────────────────────────────────

  async createRefund(data: { transaction: string }) {
    let response = await this.axios.post('/refunds', data);
    return response.data;
  }

  async getRefund(refundId: string) {
    let response = await this.axios.get(`/refunds/${refundId}`);
    return response.data;
  }

  async listRefunds(params?: { page?: number; results?: number }) {
    let response = await this.axios.get('/refunds', { params });
    return response.data as PaginatedResponse<Record<string, unknown>>;
  }

  // ─── Batches ────────────────────────────────────────────────────────

  async createBatch(data: Record<string, unknown>) {
    let response = await this.axios.post('/batches', data);
    return response.data;
  }

  async getBatch(batchId: string) {
    let response = await this.axios.get(`/batches/${batchId}`);
    return response.data;
  }

  async purchaseBatch(batchId: string) {
    let response = await this.axios.post(`/batches/${batchId}/purchase`);
    return response.data;
  }

  async addShipmentsToBatch(batchId: string, shipments: Record<string, unknown>[]) {
    let response = await this.axios.post(`/batches/${batchId}/add_shipments`, shipments);
    return response.data;
  }

  async removeShipmentsFromBatch(batchId: string, shipmentIds: string[]) {
    let response = await this.axios.post(`/batches/${batchId}/remove_shipments`, shipmentIds);
    return response.data;
  }

  // ─── Webhooks ───────────────────────────────────────────────────────

  async createWebhook(data: { url: string; event: string; is_test?: boolean }) {
    let response = await this.axios.post('/webhooks', data);
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async listWebhooks() {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    data: { url?: string; event?: string; is_test?: boolean }
  ) {
    let response = await this.axios.put(`/webhooks/${webhookId}`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  // ─── User Parcel Templates ─────────────────────────────────────────

  async createUserParcelTemplate(data: Record<string, unknown>) {
    let response = await this.axios.post('/user-parcel-templates', data);
    return response.data;
  }

  async getUserParcelTemplate(templateId: string) {
    let response = await this.axios.get(`/user-parcel-templates/${templateId}`);
    return response.data;
  }

  async listUserParcelTemplates() {
    let response = await this.axios.get('/user-parcel-templates');
    return response.data;
  }

  async updateUserParcelTemplate(templateId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/user-parcel-templates/${templateId}`, data);
    return response.data;
  }

  async deleteUserParcelTemplate(templateId: string) {
    await this.axios.delete(`/user-parcel-templates/${templateId}`);
  }

  // ─── Carrier Parcel Templates ──────────────────────────────────────

  async listCarrierParcelTemplates(params?: { carrier?: string }) {
    let response = await this.axios.get('/parcel-templates', { params });
    return response.data;
  }

  async getCarrierParcelTemplate(templateToken: string) {
    let response = await this.axios.get(`/parcel-templates/${templateToken}`);
    return response.data;
  }

  // ─── Service Groups ────────────────────────────────────────────────

  async createServiceGroup(data: Record<string, unknown>) {
    let response = await this.axios.post('/service-groups', data);
    return response.data;
  }

  async listServiceGroups() {
    let response = await this.axios.get('/service-groups');
    return response.data;
  }

  async updateServiceGroup(data: Record<string, unknown>) {
    let response = await this.axios.put('/service-groups', data);
    return response.data;
  }

  async deleteServiceGroup(serviceGroupId: string) {
    await this.axios.delete(`/service-groups/${serviceGroupId}`);
  }
}
