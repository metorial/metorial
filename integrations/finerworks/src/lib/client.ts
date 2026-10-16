import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';

export interface FinerworksClientConfig {
  webApiKey: string;
  appKey: string;
  testMode?: boolean;
}

// These checks preserve the public number schemas while validating provider IDs.
export function requireInteger(value: number, label: string, minimum = 1, maximum?: number) {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    (maximum !== undefined && value > maximum)
  ) {
    throw createApiServiceError(
      `${label} must be an integer between ${minimum} and ${maximum ?? Number.MAX_SAFE_INTEGER}.`
    );
  }
}

export function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createApiServiceError(`FinerWorks returned an invalid or missing ${field}.`, {
      reason: 'invalid_provider_response'
    });
  }
  return value;
}

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw createApiServiceError(`FinerWorks returned an invalid or missing ${field}.`, {
      reason: 'invalid_provider_response'
    });
  }
  return value;
}

export function requiredArray(value: unknown, field: string): any[] {
  if (!Array.isArray(value)) {
    throw createApiServiceError(`FinerWorks returned an invalid or missing ${field}.`, {
      reason: 'invalid_provider_response'
    });
  }
  return value;
}

export function assertSuccess(data: any) {
  let status = data?.status ?? data;
  if (typeof status?.success !== 'boolean') {
    throw createApiServiceError('FinerWorks returned a response without a success status.', {
      reason: 'invalid_provider_response'
    });
  }
  if (!status.success) {
    throw createApiServiceError(
      `FinerWorks request failed: ${typeof status.message === 'string' && status.message ? status.message : 'The provider rejected the request.'}`,
      {
        reason: 'finerworks_api_error',
        upstreamCode: status.status_code === undefined ? undefined : String(status.status_code)
      }
    );
  }
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private config: FinerworksClientConfig;

  constructor(config: FinerworksClientConfig) {
    this.config = config;
    this.axios = createAxios({
      baseURL: 'https://v2.api.finerworks.com',
      headers: {
        'Content-Type': 'application/json',
        web_api_key: config.webApiKey,
        app_key: config.appKey
      }
    });
  }

  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    data?: unknown,
    allowFailure = false
  ): Promise<any> {
    try {
      let response = await this.axios.request({ method, url: `/v3/${path}`, data });
      let result = response.data;
      if (!allowFailure) assertSuccess(result);
      else if (typeof result?.status?.success !== 'boolean') {
        throw createApiServiceError(
          'FinerWorks returned a response without a success status.',
          { reason: 'invalid_provider_response' }
        );
      }
      return result;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'FinerWorks',
        reason: 'finerworks_api_error',
        operation: path.startsWith('submit_orders')
          ? 'order submission (check list_orders before retrying an uncertain submission)'
          : path.split('?')[0],
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
        detailKeys: ['message', 'Message', 'detail', 'error'],
        nestedKeys: ['status', 'errors', 'ModelState', 'modelState'],
        extractUpstreamCode: (_error, response) => {
          let body = response?.data as
            | { status?: { status_code?: unknown }; status_code?: unknown }
            | undefined;
          let code = body?.status?.status_code ?? body?.status_code;
          return code === undefined ? undefined : String(code);
        }
      });
    }
  }

  testCredentials() {
    return this.request('get', 'test_my_credentials', {
      credentials: { web_api_key: this.config.webApiKey, app_key: this.config.appKey }
    });
  }

  submitOrders(orders: any[], validateOnly?: boolean, paymentToken?: string) {
    return this.request(
      'post',
      'submit_orders_v2',
      {
        orders: orders.map(order => ({
          ...order,
          ...(this.config.testMode ? { test_mode: true } : {})
        })),
        validate_only: validateOnly,
        payment_token: paymentToken
      },
      true
    );
  }

  fetchOrderStatus(params: { orderPos?: string[]; orderIds?: number[] }) {
    if (!params.orderPos?.length && !params.orderIds?.length) {
      throw createApiServiceError(
        'Provide at least one order ID or purchase order reference. Call list_orders to discover orders.'
      );
    }
    params.orderIds?.forEach(id => requireInteger(id, 'Order ID'));
    return this.request('post', 'fetch_order_status', {
      order_pos: params.orderPos,
      order_ids: params.orderIds
    });
  }

  updateOrder(orderId: number, updateCommand: string) {
    requireInteger(orderId, 'Order ID');
    return this.request('put', 'update_order', {
      order_id: orderId,
      update_command: updateCommand
    });
  }

  submitNote(orderId: number, subject: string, message: string) {
    requireInteger(orderId, 'Order ID');
    return this.request('post', 'submit_note', { order_id: orderId, subject, message });
  }

  updateCustomer(orderId: number, customerInfo: any) {
    requireInteger(orderId, 'Order ID');
    return this.request('put', 'update_customer', {
      order_id: orderId,
      customer_info: customerInfo
    });
  }

  listOrderStatusDefinitions() {
    return this.request('get', 'list_order_status_definitions');
  }

  async listShippingOptions(order: any) {
    let result = await this.request('post', 'list_shipping_options_multiple', {
      orders: [order]
    });
    let orders = requiredArray(result.orders, 'orders');
    let match = orders.find(item => item.order_po === order.order_po);
    if (!match)
      throw createApiServiceError(
        'FinerWorks did not return shipping options for the requested purchase order reference.'
      );
    return { ...result, options: requiredArray(match.options, 'orders[].options') };
  }

  validateRecipientAddress(recipient: any) {
    return this.request('post', 'validate_recipient_address', { recipient }, true);
  }

  listProductTypes(ids?: number[]) {
    ids?.forEach(id => requireInteger(id, 'Product type ID'));
    return this.request('post', 'list_product_types', { ids });
  }
  listMediaTypes(ids?: number[]) {
    ids?.forEach(id => requireInteger(id, 'Media type ID'));
    return this.request('post', 'list_media_types', { ids });
  }
  listStyleTypes(ids?: number[]) {
    ids?.forEach(id => requireInteger(id, 'Style type ID'));
    return this.request('post', 'list_style_types', { ids });
  }

  getPrices(items: { productQty: number; productSku: string }[]) {
    return this.request('post', 'get_prices', {
      products: items.map(item => ({
        product_qty: item.productQty,
        product_sku: item.productSku
      }))
    });
  }
  getProductDetails(products: any[]) {
    return this.request('post', 'get_product_details', { products });
  }

  listImages(params: {
    searchFilter?: string;
    guidFilter?: string | null;
    pageNumber?: number;
    perPage?: number;
    sortField?: string;
    sortDirection?: string;
    uploadDateFrom?: string | null;
    uploadDateTo?: string | null;
    listProducts?: boolean;
    active?: boolean | null;
  }) {
    requireInteger(params.pageNumber ?? 1, 'Page number');
    requireInteger(params.perPage ?? 25, 'Images per page', 1, 50);
    return this.request('post', 'list_images', {
      library: { name: 'inventory' },
      search_filter: params.searchFilter,
      guid_filter: params.guidFilter ? [params.guidFilter] : undefined,
      page_number: params.pageNumber,
      per_page: params.perPage,
      sort_field: params.sortField,
      sort_direction: params.sortDirection,
      upload_date_from: params.uploadDateFrom,
      upload_date_to: params.uploadDateTo,
      list_products: params.listProducts,
      active: params.active
    });
  }
  addImages(images: any[]) {
    return this.request('post', 'add_images', { images, library: { name: 'inventory' } });
  }
  updateImages(images: { guid: string; title?: string; description?: string }[]) {
    if (images.some(image => image.title === undefined && image.description === undefined)) {
      throw createApiServiceError('Provide a title or description for every image to update.');
    }
    return this.request('put', 'update_images', { images });
  }
  deleteImages(guids: string[]) {
    return this.request('delete', 'delete_images', { guids, library: { name: 'inventory' } });
  }

  listCollections(params?: { collectionId?: number; productCode?: string }) {
    if (params?.collectionId !== undefined)
      requireInteger(params.collectionId, 'Collection ID');
    return this.request('post', 'list_collections', {
      id: params?.collectionId,
      product_code: params?.productCode
    });
  }
  listMats(id?: number) {
    if (id !== undefined) requireInteger(id, 'Mat ID');
    return this.request('post', 'list_mats', { id });
  }
  listGlazing(id?: number) {
    if (id !== undefined) requireInteger(id, 'Glazing ID');
    return this.request('post', 'list_glazing', { id });
  }

  listOrders(params: Record<string, unknown>) {
    return this.request('post', 'list_orders', params);
  }
  getOrder(orderGuid: string, orderEmail: string) {
    return this.request(
      'get',
      `get_order?${new URLSearchParams({ order_guid: orderGuid, order_email: orderEmail })}`
    );
  }
  listVirtualInventory(params: Record<string, unknown>) {
    return this.request('post', 'list_virtual_inventory', params);
  }
  frameBuilder(productCode: string, render?: Record<string, unknown>) {
    return this.request('post', 'frame_builder', { product_code: productCode, render });
  }
}
