import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData
} from 'slates';

let http = createAxios({
  baseURL: 'https://api.optimoroute.com/v1',
  timeout: 30_000
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('An OptimoRoute API key is required.');
    }
    this.token = config.token;
  }

  private async request(
    method: 'GET' | 'POST',
    endpoint: string,
    values: Record<string, unknown> = {}
  ) {
    let result = await requestAxiosData(
      endpoint.slice(1),
      () =>
        http.request({
          method,
          url: endpoint,
          params: method === 'GET' ? { ...values, key: this.token } : { key: this.token },
          ...(method === 'POST' ? { data: values } : {})
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'OptimoRoute',
          reason: 'optimoroute_api_error',
          operation
        })
    );

    if (!result || typeof result.success !== 'boolean') {
      throw createApiServiceError('OptimoRoute returned an invalid API response.');
    }
    // Bulk responses retain their per-item failures, including when every item failed.
    if (!result.success && !Array.isArray(result.orders) && !Array.isArray(result.updates)) {
      let error = createApiServiceError(
        `OptimoRoute ${endpoint.slice(1)} failed: ${result.message || result.code || 'Unknown API error'}`,
        { reason: 'optimoroute_api_error', upstreamCode: result.code }
      );
      error.data.baggage = {
        planningId: result.planningId === undefined ? undefined : String(result.planningId),
        missingOrders: result.missingOrders,
        missingDrivers: result.missingDrivers,
        ordersWithInvalidLocation: result.ordersWithInvalidLocation
      };
      throw error;
    }
    return result;
  }

  async createOrder(order: Record<string, unknown>) {
    return this.request('POST', '/create_order', order);
  }

  async createOrUpdateOrders(orders: Record<string, unknown>[]) {
    validateBatch(orders, 'orders');
    return this.request('POST', '/create_or_update_orders', { orders });
  }

  async getOrders(orders: Record<string, unknown>[]) {
    validateOrderReferences(orders);
    return this.request('POST', '/get_orders', { orders });
  }

  async deleteOrder(orderNo?: string, orderId?: string, forceDelete?: boolean) {
    validateOrderReference({ orderNo, id: orderId });
    return this.request('POST', '/delete_order', {
      orderNo,
      id: orderId,
      forceDelete
    });
  }

  async deleteOrders(
    orders: Record<string, unknown>[],
    forceDelete?: boolean,
    deleteMultiple?: boolean
  ) {
    validateOrderReferences(orders);
    return this.request('POST', '/delete_orders', { orders, forceDelete, deleteMultiple });
  }

  async deleteAllOrders(date?: string) {
    return this.request('POST', '/delete_all_orders', { date });
  }

  async searchOrders(params: Record<string, unknown>) {
    return this.request('POST', '/search_orders', params);
  }

  async getSchedulingInfo(orderNo?: string, orderId?: string) {
    validateOrderReference({ orderNo, id: orderId });
    return this.request('GET', '/get_scheduling_info', { orderNo, id: orderId });
  }

  async startPlanning(params: Record<string, unknown>) {
    return this.request('POST', '/start_planning', params);
  }

  async getPlanningStatus(planningId: string) {
    return this.request('GET', '/get_planning_status', {
      planningId: parsePlanningId(planningId)
    });
  }

  async stopPlanning(planningId: string) {
    return this.request('POST', '/stop_planning', { planningId: parsePlanningId(planningId) });
  }

  async getRoutes(params: Record<string, unknown>) {
    return this.request('GET', '/get_routes', params);
  }

  async sendRoutes(params: Record<string, unknown>) {
    return this.request('POST', '/send_routes', params);
  }

  async getDispatchStatus(params: Record<string, unknown>) {
    return this.request('GET', '/get_dispatch_status', params);
  }

  async updateDriverParameters(params: Record<string, unknown>) {
    return this.request('POST', '/update_driver_parameters', params);
  }

  async updateDriversParameters(updates: Record<string, unknown>[]) {
    validateBatch(updates, 'driver updates');
    return this.request('POST', '/update_drivers_parameters', { updates });
  }

  async updateDriversPositions(updates: Record<string, unknown>[]) {
    return this.request('POST', '/update_drivers_positions', { updates });
  }

  async getCompletionDetails(orders: Record<string, unknown>[]) {
    validateOrderReferences(orders);
    return this.request('POST', '/get_completion_details', { orders });
  }

  async updateCompletionDetails(params: Record<string, unknown>) {
    return this.request('POST', '/update_completion_details', { updates: [params] });
  }

  async getEvents(afterTag?: string) {
    return this.request('GET', '/get_events', { after_tag: afterTag });
  }
}

export let validateBatch = (items: unknown[], label: string) => {
  if (items.length === 0 || items.length > 500) {
    throw createApiServiceError(`Provide between 1 and 500 ${label} per request.`);
  }
};

export let validateOrderReference = (order: Record<string, unknown>) => {
  if (
    !(typeof order.orderNo === 'string' && order.orderNo.trim()) &&
    !(typeof order.id === 'string' && order.id.trim())
  ) {
    throw createApiServiceError('Provide an orderNo or orderId for each order.');
  }
};

export let validateOrderReferences = (orders: Record<string, unknown>[]) => {
  validateBatch(orders, 'orders');
  for (let order of orders) validateOrderReference(order);
};

let parsePlanningId = (planningId: string) => {
  let id = Number(planningId);
  if (!/^\d+$/.test(planningId) || !Number.isSafeInteger(id) || id < 1) {
    throw createApiServiceError(
      'Provide the positive planning ID returned by Optimize Routes.'
    );
  }
  return id;
};
