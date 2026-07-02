import { createAxios } from 'slates';
import type {
  CheckoutStartedParams,
  CustomEventParams,
  LineItem,
  OrderFulfilledParams,
  OrderPlacedParams
} from './client';

export class SendlaneEcommerceClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.sendlane.com/v2',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  async trackOrderPlaced(params: OrderPlacedParams): Promise<void> {
    let body: Record<string, any> = {
      event: 'order_placed',
      token: params.token,
      event_id: params.eventId,
      email: params.email,
      total: params.total,
      line_items: params.lineItems.map(item => this.formatLineItem(item))
    };

    if (params.orderId !== undefined) body.order_id = params.orderId;
    if (params.subtotal !== undefined) body.subtotal = params.subtotal;
    if (params.totalTax !== undefined) body.total_tax = params.totalTax;
    if (params.totalItems !== undefined) body.total_items = params.totalItems;
    if (params.currency) body.currency = params.currency;
    if (params.time !== undefined) body.time = params.time;
    if (params.dateCreated) body.date_created = params.dateCreated;
    if (params.initialSync !== undefined) body.initial_sync = params.initialSync;
    if (params.billingAddress) body.billing_address = params.billingAddress;
    if (params.shippingAddress) body.shipping_address = params.shippingAddress;

    await this.axios.post('/custom-integration/order-placed', body);
  }

  async trackCheckoutStarted(params: CheckoutStartedParams): Promise<void> {
    let body: Record<string, any> = {
      event: 'checkout_started',
      token: params.token,
      email: params.email,
      checkout_id: params.checkoutId,
      total: params.total,
      line_items: params.lineItems.map(item => this.formatLineItem(item))
    };

    if (params.status) body.status = params.status;
    if (params.checkoutUrl) body.checkout_url = params.checkoutUrl;
    if (params.subtotal !== undefined) body.subtotal = params.subtotal;
    if (params.totalTax !== undefined) body.total_tax = params.totalTax;
    if (params.totalItems !== undefined) body.total_items = params.totalItems;
    if (params.currency) body.currency = params.currency;

    await this.axios.post('/custom-integration/checkout-started', body);
  }

  async trackOrderFulfilled(params: OrderFulfilledParams): Promise<void> {
    let body: Record<string, any> = {
      event: 'order_fulfilled',
      token: params.token,
      event_id: params.eventId,
      email: params.email
    };

    if (params.orderId !== undefined) body.order_id = params.orderId;
    if (params.total !== undefined) body.total = params.total;
    if (params.time !== undefined) body.time = params.time;

    await this.axios.post('/custom-integration/order-fulfilled', body);
  }

  async trackCustomEvent(params: CustomEventParams): Promise<void> {
    let body: Record<string, any> = {
      event: params.eventName,
      token: params.token,
      email: params.email
    };

    if (params.eventId) body.event_id = params.eventId;
    if (params.properties) {
      Object.assign(body, params.properties);
    }

    await this.axios.post('/custom-integration/custom-event', body);
  }

  private formatLineItem(item: LineItem): Record<string, any> {
    let formatted: Record<string, any> = {
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      item_price: item.item_price,
      total: item.total
    };

    if (item.sku) formatted.sku = item.sku;
    if (item.product_url) formatted.product_url = item.product_url;
    if (item.product_image_url) formatted.product_image_url = item.product_image_url;

    return formatted;
  }
}
