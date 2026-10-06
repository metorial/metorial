import { createApiServiceError, createAxios, pickDefined } from 'slates';
import {
  apiError,
  fail,
  id,
  items,
  missing,
  type Row,
  receipt,
  row,
  rows,
  sanitize,
  text,
  validateFields
} from './validation';
export class ShipdayClient {
  private readonly token: string;
  private readonly api: ReturnType<typeof createAxios>;
  constructor(config: { token: string }) {
    this.token = text(config.token, 'API key');
    this.api = createAxios({
      baseURL: 'https://api.shipday.com',
      timeout: 30000,
      maxRedirects: 0,
      headers: {
        Authorization: `Basic ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  async request(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    data?: Row,
    params?: Row
  ) {
    if (!/^\/[a-z][a-z0-9_/%=.+-]*$/i.test(path)) fail('Invalid Shipday route.');
    let response: { status: number; data: unknown };
    try {
      response = await this.api.request<unknown>({
        method,
        url: path,
        data: data ? pickDefined(data) : undefined,
        params
      });
    } catch (error) {
      apiError(error, `${method.toUpperCase()} Shipday request`);
    }
    return {
      status: response.status,
      data:
        response.data === '' || response.data === undefined
          ? undefined
          : sanitize(response.data, this.token)
    };
  }
  private segment(value: string) {
    text(value, 'Order number or tracking ID');
    try {
      return encodeURIComponent(value).replace(
        /[!'()*]/g,
        character => `%${character.charCodeAt(0).toString(16)}`
      );
    } catch {
      fail('Order number or tracking ID is not a valid Unicode string.');
    }
  }

  async getActiveOrders() {
    return rows((await this.request('get', '/orders')).data).map(order => {
      id(order.orderId, 'Order response ID');
      return order;
    });
  }
  async getOrderDetails(orderNumber: string) {
    const raw = (await this.request('get', `/orders/${this.segment(orderNumber)}`)).data;
    const result = Array.isArray(raw) ? rows(raw) : [row(raw)];
    for (const order of result) {
      id(order.orderId, 'Order response ID');
      if (order.orderNumber !== orderNumber)
        fail(
          'Shipday returned a different order number. Read the exact order before continuing.'
        );
    }
    return result;
  }
  async exactOrder(orderId: number, currentOrderNumber?: string): Promise<Row> {
    id(orderId, 'Order ID');
    let number = currentOrderNumber;
    if (number === undefined) {
      const found = (await this.getActiveOrders()).filter(order => order.orderId === orderId);
      if (found.length !== 1)
        fail(
          'The exact order is not uniquely present in active orders. Provide currentOrderNumber for an inactive order; order IDs are not order numbers.'
        );
      number = text(found[0]?.orderNumber, 'Current order number');
    }
    const found = (await this.getOrderDetails(number)).filter(
      order => order.orderId === orderId
    );
    if (found.length !== 1)
      fail(
        'The order ID and current order number do not identify exactly one readable order. No mutation was started.'
      );
    return row(found[0]);
  }
  async queryOrders(params: {
    startTime?: string;
    endTime?: string;
    orderStatus?: string;
    startCursor?: number;
    endCursor?: number;
  }) {
    const start = params.startCursor ?? 1,
      end = params.endCursor ?? 100;
    for (const [label, value] of [
      ['startCursor', start],
      ['endCursor', end]
    ] as const)
      if (!Number.isInteger(value) || value < 1 || value > 2147483647)
        fail(`${label} must be a positive 32-bit integer.`);
    if (end < start) fail('endCursor must not be smaller than startCursor.');
    for (const value of [params.startTime, params.endTime])
      if (
        value !== undefined &&
        (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) ||
          !Number.isFinite(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value.slice(0, 10))
      )
        fail('Query times must be valid UTC ISO timestamps ending in Z.');
    if (
      params.startTime &&
      params.endTime &&
      Date.parse(params.startTime) > Date.parse(params.endTime)
    )
      fail('startTime must not be later than endTime.');
    const result = rows(
      (
        await this.request('post', '/orders/query', {
          ...params,
          startCursor: start,
          endCursor: end
        })
      ).data
    );
    for (const order of result) id(order.orderId, 'Order response ID');
    return result;
  }
  async createDeliveryOrder(order: Row) {
    for (const key of [
      'orderNumber',
      'customerName',
      'customerAddress',
      'customerPhoneNumber',
      'restaurantName',
      'restaurantAddress'
    ])
      text(order[key], key);
    validateFields(order);
    if (order.orderItem !== undefined) order = { ...order, orderItem: items(order.orderItem) };
    const result = receipt((await this.request('post', '/orders', order)).data);
    id(result.orderId, 'Created order ID');
    return result;
  }
  async editDeliveryOrder(orderId: number, order: Row) {
    validateFields(order, true);
    for (const key of [
      'orderNo',
      'customerName',
      'customerAddress',
      'customerPhoneNumber',
      'restaurantName',
      'restaurantAddress'
    ])
      text(order[key], key);
    if (typeof order.customerEmail !== 'string')
      fail(
        'A readable customer email or explicit customerEmail is required by the documented edit contract.'
      );
    if (order.orderItems !== undefined)
      order = { ...order, orderItems: items(order.orderItems) };
    return receipt(
      (await this.request('put', `/order/edit/${id(orderId)}`, order)).data,
      orderId
    );
  }
  async deleteOrder(orderId: number, currentOrderNumber?: string) {
    const before = await this.exactOrder(orderId, currentOrderNumber);
    const result = await this.request('delete', `/orders/${id(orderId)}`);
    if (result.status !== 204) receipt(result.data, orderId);
    let after: Row[];
    try {
      after = await this.getOrderDetails(text(before.orderNumber, 'Current order number'));
    } catch (error) {
      if (missing(error)) return { success: true, orderId };
      throw error;
    }
    if (after.some(order => order.orderId === orderId))
      fail(
        'The order remains readable after deletion. Read current state before retrying.',
        'shipday_unconfirmed_mutation'
      );
    return { success: true, orderId };
  }
  async assignOrderToCarrier(orderId: number, carrierId: number) {
    if (
      !(await this.getCarriers()).some(carrier => carrier.id === id(carrierId, 'Carrier ID'))
    )
      fail('That exact carrier is not in the current fleet.');
    const result = await this.request('put', `/orders/assign/${id(orderId)}/${carrierId}`, {});
    if (result.status !== 204) receipt(result.data, orderId);
    return result;
  }
  async unassignOrderFromCarrier(orderId: number) {
    const result = await this.request('put', `/orders/unassign/${id(orderId)}`, {});
    if (result.data !== undefined) receipt(result.data, orderId);
    return result;
  }
  async markOrderReadyToPickup(orderId: number, readyToPickup: boolean) {
    const result = await this.request('put', `/orders/${id(orderId)}/meta`, { readyToPickup });
    if (result.status !== 202 && result.data !== undefined) receipt(result.data, orderId);
    return result;
  }
  async updateOrderStatus(orderId: number, status: string) {
    return receipt(
      (await this.request('put', `/orders/${id(orderId)}/status`, { status })).data,
      orderId
    );
  }
  async getPickupOrderDetails(orderNumber: string) {
    const result = row(
      (await this.request('get', `/pickup-orders/${this.segment(orderNumber)}`)).data
    );
    if (result.orderNumber !== orderNumber)
      fail(
        'The legacy orderNumber lookup did not return that exact pickup reference. Use the documented orderId input instead.'
      );
    id(result.orderId, 'Pickup response ID');
    return result;
  }
  async getPickupById(orderId: number) {
    const result = row((await this.request('get', `/pickup-orders/${id(orderId)}`)).data);
    if (id(result.orderId, 'Pickup response ID') !== orderId)
      fail('Shipday returned a different pickup ID.');
    return result;
  }
  async createPickupOrder(order: Row) {
    validateFields(order);
    text(order.orderNumber, 'Order number');
    const customer = row(order.customer, 'customer'),
      restaurant = row(order.restaurant, 'restaurant');
    text(customer.name, 'Customer name');
    text(customer.phone, 'Customer phone');
    text(restaurant.name, 'Restaurant name');
    text(restaurant.address, 'Restaurant address');
    if (order.orderItem !== undefined) order = { ...order, orderItem: items(order.orderItem) };
    const result = receipt((await this.request('post', '/pickup-orders', order)).data);
    id(result.orderId, 'Created pickup ID');
    return result;
  }
  async editPickupOrder(orderId: number, order: Row) {
    validateFields(order, true);
    text(order.orderNumber, 'Order number');
    const customer = row(order.customer, 'customer'),
      restaurant = row(order.restaurant, 'restaurant');
    text(customer.name, 'Customer name');
    text(customer.phone, 'Customer phone');
    text(restaurant.name, 'Restaurant name');
    text(restaurant.address, 'Restaurant address');
    if (order.orderItem !== undefined) order = { ...order, orderItem: items(order.orderItem) };
    return receipt(
      (await this.request('put', `/pickup-orders/${id(orderId)}`, order)).data,
      orderId
    );
  }
  async deletePickupOrder(orderId: number) {
    await this.getPickupById(orderId);
    const result = await this.request('delete', `/pickup-orders/${id(orderId)}`);
    if (result.status !== 204) receipt(result.data, orderId);
    try {
      await this.getPickupById(orderId);
    } catch (error) {
      if (missing(error)) return { success: true, orderId };
      throw error;
    }
    fail(
      'The pickup order remains readable after deletion. Read current state before retrying.',
      'shipday_unconfirmed_mutation'
    );
  }
  async getCarriers() {
    return rows((await this.request('get', '/carriers')).data).map(carrier => {
      id(carrier.id, 'Carrier ID');
      return carrier;
    });
  }
  async addCarrier(carrier: { name: string; email: string; phoneNumber: string }) {
    for (const [key, value] of Object.entries(carrier)) text(value, key);
    const result = row((await this.request('post', '/carriers', carrier)).data);
    id(result.carrierId, 'Created carrier ID');
    return result;
  }
  async deleteCarrier(carrierId: number) {
    id(carrierId, 'Carrier ID');
    if (!(await this.getCarriers()).some(carrier => carrier.id === carrierId))
      fail('That exact carrier is not currently readable. No deletion was started.');
    const result = receipt((await this.request('delete', `/carriers/${carrierId}`)).data);
    if ((await this.getCarriers()).some(carrier => carrier.id === carrierId))
      fail('The carrier remains readable after deletion. Read current state before retrying.');
    return result;
  }
  async getOrderDeliveryProgress(trackingId: string, isStaticDataRequired = true) {
    return row(
      (
        await this.request('get', `/order/progress/${this.segment(trackingId)}`, undefined, {
          isStaticDataRequired: String(isStaticDataRequired)
        })
      ).data
    );
  }
  async getOnDemandServices() {
    return rows((await this.request('get', '/on-demand/services')).data);
  }
  async getOnDemandEstimate(orderId: number) {
    return row((await this.request('get', `/on-demand/estimate/${id(orderId)}`)).data);
  }
  async assignOnDemandDelivery(params: {
    orderId: number;
    name: string;
    tip?: number;
    estimateReference?: string;
    contactlessDelivery?: boolean;
    podType?: string;
  }) {
    id(params.orderId, 'Order ID');
    text(params.name, 'Provider name');
    validateFields(params);
    const result = row((await this.request('post', '/on-demand/assign', params)).data);
    id(result.id, 'Assignment ID');
    if (result.orderId !== params.orderId)
      fail(
        'Assignment receipt did not identify the requested order. Read current state before retrying.'
      );
    return result;
  }
  async getOnDemandDetails(orderId: number) {
    const result = row((await this.request('get', `/on-demand/details/${id(orderId)}`)).data);
    if (result.orderId !== orderId) fail('Shipday returned another on-demand order.');
    id(result.id, 'Assignment ID');
    return result;
  }
  async cancelOnDemandDelivery(orderId: number) {
    return receipt(
      (await this.request('post', `/on-demand/cancel/${id(orderId)}`, {})).data,
      orderId
    );
  }
  partial(orderId: number, actions: string[]): never {
    throw createApiServiceError(
      `Order ${orderId}: completed/accepted steps: ${actions.length ? actions.join('; ') : 'none confirmed'}. A subsequent request or readback failed. Earlier effects may remain; read exact current state before retrying.`,
      { reason: 'shipday_partial_update', parent: {} }
    );
  }
}
