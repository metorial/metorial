import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.optimoroute.com/v1'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  // ─── Order Management ────────────────────────────────────────

  async createOrder(order: Record<string, unknown>) {
    let res = await http.post('/create_order', order, {
      params: { key: this.token }
    });
    return res.data;
  }

  async createOrUpdateOrders(orders: Record<string, unknown>[]) {
    let res = await http.post(
      '/create_or_update_orders',
      { orders },
      {
        params: { key: this.token }
      }
    );
    return res.data;
  }

  async getOrders(orders: Record<string, unknown>[]) {
    let res = await http.post(
      '/get_orders',
      { orders },
      {
        params: { key: this.token }
      }
    );
    return res.data;
  }

  async deleteOrder(orderNo?: string, orderId?: string, forceDelete?: boolean) {
    let body: Record<string, unknown> = {};
    if (orderNo) body.orderNo = orderNo;
    if (orderId) body.id = orderId;
    if (forceDelete !== undefined) body.forceDelete = forceDelete;
    let res = await http.post('/delete_order', body, {
      params: { key: this.token }
    });
    return res.data;
  }

  async deleteOrders(
    orders: Record<string, unknown>[],
    forceDelete?: boolean,
    deleteMultiple?: boolean
  ) {
    let body: Record<string, unknown> = { orders };
    if (forceDelete !== undefined) body.forceDelete = forceDelete;
    if (deleteMultiple !== undefined) body.deleteMultiple = deleteMultiple;
    let res = await http.post('/delete_orders', body, {
      params: { key: this.token }
    });
    return res.data;
  }

  async deleteAllOrders(date?: string) {
    let body: Record<string, unknown> = {};
    if (date) body.date = date;
    let res = await http.post('/delete_all_orders', body, {
      params: { key: this.token }
    });
    return res.data;
  }

  // ─── Search Orders ───────────────────────────────────────────

  async searchOrders(params: Record<string, unknown>) {
    let res = await http.post('/search_orders', params, {
      params: { key: this.token }
    });
    return res.data;
  }

  // ─── Scheduling Info ─────────────────────────────────────────

  async getSchedulingInfo(orderNo?: string, orderId?: string) {
    let params: Record<string, string> = { key: this.token };
    if (orderNo) params.orderNo = orderNo;
    if (orderId) params.id = orderId;
    let res = await http.get('/get_scheduling_info', { params });
    return res.data;
  }

  // ─── Route Optimization ──────────────────────────────────────

  async startPlanning(params: Record<string, unknown>) {
    let res = await http.post('/start_planning', params, {
      params: { key: this.token }
    });
    return res.data;
  }

  async getPlanningStatus(planningId: string) {
    let res = await http.get('/get_planning_status', {
      params: { key: this.token, planningId }
    });
    return res.data;
  }

  async stopPlanning(planningId: string) {
    let res = await http.post(
      '/stop_planning',
      { planningId },
      {
        params: { key: this.token }
      }
    );
    return res.data;
  }

  // ─── Routes ──────────────────────────────────────────────────

  async getRoutes(params: Record<string, unknown>) {
    let res = await http.get('/get_routes', {
      params: { key: this.token, ...params }
    });
    return res.data;
  }

  // ─── Driver Management ───────────────────────────────────────

  async updateDriverParameters(params: Record<string, unknown>) {
    let res = await http.post('/update_driver_parameters', params, {
      params: { key: this.token }
    });
    return res.data;
  }

  async updateDriversParameters(updates: Record<string, unknown>[]) {
    let res = await http.post(
      '/update_drivers_parameters',
      { updates },
      {
        params: { key: this.token }
      }
    );
    return res.data;
  }

  // ─── Driver Positions ────────────────────────────────────────

  async updateDriversPositions(positions: Record<string, unknown>[]) {
    let res = await http.post(
      '/update_drivers_positions',
      { positions },
      {
        params: { key: this.token }
      }
    );
    return res.data;
  }

  // ─── Completion / Proof of Delivery ──────────────────────────

  async getCompletionDetails(orders: Record<string, unknown>[]) {
    let res = await http.post(
      '/get_completion_details',
      { orders },
      {
        params: { key: this.token }
      }
    );
    return res.data;
  }

  async updateCompletionDetails(params: Record<string, unknown>) {
    let res = await http.post('/update_completion_details', params, {
      params: { key: this.token }
    });
    return res.data;
  }

  // ─── Events ──────────────────────────────────────────────────

  async getEvents(afterTag?: string) {
    let params: Record<string, string> = { key: this.token };
    if (afterTag) params.after_tag = afterTag;
    let res = await http.get('/get_events', { params });
    return res.data;
  }
}
