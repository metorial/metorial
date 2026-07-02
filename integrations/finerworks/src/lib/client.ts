import { createAxios } from 'slates';

export interface FinerworksClientConfig {
  webApiKey: string;
  appKey: string;
  testMode?: boolean;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private testMode: boolean;

  constructor(config: FinerworksClientConfig) {
    this.testMode = config.testMode ?? false;
    this.axios = createAxios({
      baseURL: 'https://api.finerworks.com',
      headers: {
        'Content-Type': 'application/json',
        web_api_key: config.webApiKey,
        app_key: config.appKey
      }
    });
  }

  // ── Credentials ──

  async testCredentials(): Promise<any> {
    let response = await this.axios.get('/v3/test_my_credentials');
    return response.data;
  }

  // ── Orders ──

  async submitOrders(orders: any[], validateOnly?: boolean): Promise<any> {
    let payload: any = { orders };
    if (validateOnly !== undefined) {
      payload.validate_only = validateOnly;
    }
    if (this.testMode) {
      for (let order of payload.orders) {
        order.test_mode = true;
      }
    }
    let response = await this.axios.post('/v3/submit_orders', payload);
    return response.data;
  }

  async fetchOrderStatus(params: { orderPos?: string[]; orderIds?: number[] }): Promise<any> {
    let response = await this.axios.post('/v3/fetch_order_status', {
      order_pos: params.orderPos ?? null,
      order_ids: params.orderIds ?? null
    });
    return response.data;
  }

  async updateOrder(orderId: number, updateCommand: string): Promise<any> {
    let response = await this.axios.put('/v3/update_order', {
      order_id: orderId,
      update_command: updateCommand
    });
    return response.data;
  }

  async submitNote(orderId: number, subject: string, message: string): Promise<any> {
    let response = await this.axios.post('/v3/submit_note', {
      order_id: orderId,
      subject,
      message
    });
    return response.data;
  }

  async updateCustomer(orderId: number, customerInfo: any): Promise<any> {
    let response = await this.axios.put('/v3/update_customer', {
      order_id: orderId,
      customer_info: customerInfo
    });
    return response.data;
  }

  // ── Order Status Definitions ──

  async listOrderStatusDefinitions(): Promise<any> {
    let response = await this.axios.get('/v3/list_order_status_definitions');
    return response.data;
  }

  // ── Shipping ──

  async listShippingOptions(order: any): Promise<any> {
    let response = await this.axios.post('/v3/list_shipping_options', order);
    return response.data;
  }

  async listShippingOptionsMultiple(orders: any[]): Promise<any> {
    let response = await this.axios.post('/v3/list_shipping_options_multiple', orders);
    return response.data;
  }

  // ── Address Validation ──

  async validateRecipientAddress(recipient: any): Promise<any> {
    let response = await this.axios.post('/v3/validate_recipient_address', {
      recipient
    });
    return response.data;
  }

  // ── Product Catalog ──

  async listProductTypes(ids?: number[]): Promise<any> {
    let response = await this.axios.post('/v3/list_product_types', {
      ids: ids ?? null
    });
    return response.data;
  }

  async listMediaTypes(ids?: number[]): Promise<any> {
    let response = await this.axios.post('/v3/list_media_types', {
      ids: ids ?? null
    });
    return response.data;
  }

  async listStyleTypes(ids?: number[]): Promise<any> {
    let response = await this.axios.post('/v3/list_style_types', {
      ids: ids ?? null
    });
    return response.data;
  }

  // ── Pricing ──

  async getPrices(items: { productQty: number; productSku: string }[]): Promise<any> {
    let payload = items.map(item => ({
      product_qty: item.productQty,
      product_sku: item.productSku
    }));
    let response = await this.axios.post('/v3/get_prices', payload);
    return response.data;
  }

  async getProductDetails(items: any[]): Promise<any> {
    let response = await this.axios.post('/v3/get_product_details', items);
    return response.data;
  }

  // ── Images ──

  async listImages(params: {
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
  }): Promise<any> {
    let response = await this.axios.post('/v3/list_images', {
      library: { name: 'inventory' },
      search_filter: params.searchFilter ?? '',
      guid_filter: params.guidFilter ?? null,
      page_number: params.pageNumber ?? 1,
      per_page: params.perPage ?? 25,
      sort_field: params.sortField ?? 'id',
      sort_direction: params.sortDirection ?? 'DESC',
      upload_date_from: params.uploadDateFrom ?? null,
      upload_date_to: params.uploadDateTo ?? null,
      list_products: params.listProducts ?? true,
      active: params.active ?? null
    });
    return response.data;
  }

  async addImages(images: any[]): Promise<any> {
    let response = await this.axios.post('/v3/add_images', {
      images,
      library: { name: 'inventory' }
    });
    return response.data;
  }

  async updateImages(
    images: { guid: string; title?: string; description?: string }[]
  ): Promise<any> {
    let response = await this.axios.put('/v3/update_images', {
      images,
      account_key: null
    });
    return response.data;
  }

  async deleteImages(guids: string[]): Promise<any> {
    let response = await this.axios.delete('/v3/delete_images', {
      data: {
        guids,
        library: null
      }
    });
    return response.data;
  }

  // ── Framing ──

  async listCollections(params?: {
    collectionId?: number;
    productCode?: string;
  }): Promise<any> {
    let response = await this.axios.post('/v3/list_collections', {
      id: params?.collectionId ?? null,
      product_code: params?.productCode ?? null
    });
    return response.data;
  }

  async listMats(matId?: number): Promise<any> {
    let response = await this.axios.post('/v3/list_mats', {
      id: matId ?? null
    });
    return response.data;
  }

  async listGlazing(glazingId?: number): Promise<any> {
    let response = await this.axios.post('/v3/list_glazing', {
      id: glazingId ?? null
    });
    return response.data;
  }

  async frameBuilder(params: {
    productCode?: string | null;
    config: {
      frameId: number;
      width: number;
      height: number;
      mats?: {
        id: number;
        windows: { width: number; height: number; windowX?: number; windowY?: number }[];
      }[];
      glazing?: { id: number };
      units?: number;
    };
    render?: {
      contentType?: number;
      renderSize?: number;
      squared?: boolean;
      shadowInner?: boolean;
      promptImage?: boolean;
      frameImageToDisplayUrl?: string | null;
    };
  }): Promise<any> {
    let response = await this.axios.post('/v3/frame_builder', {
      product_code: params.productCode ?? null,
      config: {
        frame_id: params.config.frameId,
        width: params.config.width,
        height: params.config.height,
        mats:
          params.config.mats?.map(m => ({
            id: m.id,
            windows: m.windows.map(w => ({
              width: w.width,
              height: w.height,
              window_x: w.windowX ?? 0,
              window_y: w.windowY ?? 0,
              mat_image_to_display_url: null
            }))
          })) ?? null,
        glazing: params.config.glazing ?? null,
        units: params.config.units ?? 0
      },
      render: {
        content_type: params.render?.contentType ?? 0,
        render_size: params.render?.renderSize ?? 500,
        squared: params.render?.squared ?? false,
        shadow_inner: params.render?.shadowInner ?? false,
        prompt_image: params.render?.promptImage ?? false,
        frame_image_to_display_url: params.render?.frameImageToDisplayUrl ?? null
      }
    });
    return response.data;
  }

  // ── User Account ──

  async getUser(accountKey?: string): Promise<any> {
    let url = '/v3/get_user';
    if (accountKey) {
      url += `?account_key=${encodeURIComponent(accountKey)}`;
    }
    let response = await this.axios.get(url);
    return response.data;
  }

  async updateUser(userData: any): Promise<any> {
    let response = await this.axios.put('/v3/update_user', userData);
    return response.data;
  }
}
