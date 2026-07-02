import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.shipday.com'
});

export class ShipdayClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      Authorization: `Basic ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ---- Delivery Orders ----

  async getActiveOrders() {
    let response = await api.get('/orders', { headers: this.headers });
    return response.data;
  }

  async getOrderDetails(orderNumber: string) {
    let response = await api.get(`/orders/${orderNumber}`, { headers: this.headers });
    return response.data;
  }

  async queryOrders(params: {
    startTime?: string;
    endTime?: string;
    orderStatus?: string;
    startCursor?: number;
    endCursor?: number;
  }) {
    let response = await api.post('/orders/query', params, { headers: this.headers });
    return response.data;
  }

  async createDeliveryOrder(order: Record<string, unknown>) {
    let response = await api.post('/orders', order, { headers: this.headers });
    return response.data;
  }

  async editDeliveryOrder(orderId: number, order: Record<string, unknown>) {
    let response = await api.put(`/order/edit/${orderId}`, order, { headers: this.headers });
    return response.data;
  }

  async deleteOrder(orderId: number) {
    let response = await api.delete(`/orders/${orderId}`, { headers: this.headers });
    return response.data;
  }

  async assignOrderToCarrier(orderId: number, carrierId: number) {
    let response = await api.put(
      `/orders/assign/${orderId}/${carrierId}`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async unassignOrderFromCarrier(orderId: number) {
    let response = await api.put(`/orders/unassign/${orderId}`, {}, { headers: this.headers });
    return response.data;
  }

  async markOrderReadyToPickup(orderId: number, readyToPickup: boolean) {
    let response = await api.put(
      `/orders/${orderId}/meta`,
      { readyToPickup },
      { headers: this.headers }
    );
    return response.data;
  }

  async updateOrderStatus(orderId: number, status: string) {
    let response = await api.put(
      `/orders/${orderId}/status`,
      { status },
      { headers: this.headers }
    );
    return response.data;
  }

  // ---- Pickup Orders ----

  async getPickupOrderDetails(orderNumber: string) {
    let response = await api.get(`/pickup-orders/${orderNumber}`, { headers: this.headers });
    return response.data;
  }

  async createPickupOrder(order: Record<string, unknown>) {
    let response = await api.post('/pickup-orders', order, { headers: this.headers });
    return response.data;
  }

  async editPickupOrder(orderId: number, order: Record<string, unknown>) {
    let response = await api.put(`/pickup-orders/edit/${orderId}`, order, {
      headers: this.headers
    });
    return response.data;
  }

  async deletePickupOrder(orderId: number) {
    let response = await api.delete(`/pickup-orders/${orderId}`, { headers: this.headers });
    return response.data;
  }

  // ---- Carriers ----

  async getCarriers() {
    let response = await api.get('/carriers', { headers: this.headers });
    return response.data;
  }

  async addCarrier(carrier: { name: string; email: string; phoneNumber: string }) {
    let response = await api.post('/carriers', carrier, { headers: this.headers });
    return response.data;
  }

  async deleteCarrier(carrierId: number) {
    let response = await api.delete(`/carriers/${carrierId}`, { headers: this.headers });
    return response.data;
  }

  // ---- Delivery Tracking ----

  async getOrderDeliveryProgress(trackingId: string, isStaticDataRequired: boolean = true) {
    let response = await api.get(`/order/progress/${trackingId}`, {
      headers: this.headers,
      params: { isStaticDataRequired: String(isStaticDataRequired) }
    });
    return response.data;
  }

  // ---- On-Demand Delivery ----

  async getOnDemandServices() {
    let response = await api.get('/on-demand/services', { headers: this.headers });
    return response.data;
  }

  async getOnDemandEstimate(orderId: number) {
    let response = await api.get(`/on-demand/estimate/${orderId}`, { headers: this.headers });
    return response.data;
  }

  async assignOnDemandDelivery(params: {
    orderId: number;
    name: string;
    tip?: number;
    estimateReference?: string;
    contactlessDelivery?: boolean;
    podType?: string;
  }) {
    let response = await api.post('/on-demand/assign', params, { headers: this.headers });
    return response.data;
  }

  async getOnDemandDetails(orderId: number) {
    let response = await api.get(`/on-demand/details/${orderId}`, { headers: this.headers });
    return response.data;
  }

  async cancelOnDemandDelivery(orderId: number) {
    let response = await api.post(
      `/on-demand/cancel/${orderId}`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }
}
