import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export class BaseLinkerClient {
  private http;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A nonempty BaseLinker API token is required.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.baselinker.com',
      authHeader: { name: 'X-BLToken', value: config.token },
      contentType: 'application/x-www-form-urlencoded',
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'BaseLinker',
          reason: 'baselinker_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          detailKeys: ['error_message', 'error_code', 'message'],
          extractUpstreamCode: (_error, response, helpers) => {
            let body = response?.data;
            return helpers.isRecord(body) && typeof body.error_code === 'string'
              ? body.error_code
              : undefined;
          }
        })
    });
  }

  private async request<T = any>(
    method: string,
    parameters: Record<string, any> = {}
  ): Promise<T> {
    let params = new URLSearchParams();
    params.append('method', method);
    params.append('parameters', JSON.stringify(parameters));
    let response = await this.http.post('/connector.php', params.toString());
    let data: unknown = response.data;

    // Some account-disabled methods can return an empty response; preserve it.
    if (isApiErrorRecord(data) && data.status === 'ERROR') {
      throw createApiServiceError(
        typeof data.error_message === 'string'
          ? `BaseLinker API ${method} failed: ${data.error_message}`
          : `BaseLinker API ${method} failed.`,
        {
          reason: 'baselinker_api_error',
          upstreamCode: typeof data.error_code === 'string' ? data.error_code : undefined
        }
      );
    }
    return data as T;
  }

  // ── Orders ──

  async getOrders(
    params: {
      orderId?: number;
      dateConfirmedFrom?: number;
      dateFrom?: number;
      idFrom?: number;
      getUnconfirmedOrders?: boolean;
      statusId?: number;
      filterEmail?: string;
      filterShopOrderId?: number;
      filterExternalOrderId?: string;
      filterOrderSource?: string;
      filterOrderSourceId?: number;
      includeCustomExtraFields?: boolean;
      includeCommissions?: boolean;
      includeConnectData?: boolean;
      includeDiscountsData?: boolean;
    } = {}
  ): Promise<any> {
    return this.request('getOrders', {
      order_id: params.orderId,
      date_confirmed_from: params.dateConfirmedFrom,
      date_from: params.dateFrom,
      id_from: params.idFrom,
      get_unconfirmed_orders: params.getUnconfirmedOrders,
      status_id: params.statusId,
      filter_email: params.filterEmail,
      filter_shop_order_id: params.filterShopOrderId,
      filter_external_order_id: params.filterExternalOrderId,
      filter_order_source: params.filterOrderSource,
      filter_order_source_id: params.filterOrderSourceId,
      include_custom_extra_fields: params.includeCustomExtraFields,
      include_commissions: params.includeCommissions,
      include_connect_data: params.includeConnectData,
      include_discounts_data: params.includeDiscountsData
    });
  }

  async addOrder(params: {
    orderStatusId: number;
    dateAdd: number;
    currency: string;
    paymentMethod: string;
    paymentMethodCod: boolean;
    paid: boolean;
    userComments?: string;
    adminComments?: string;
    email?: string;
    phone?: string;
    userLogin?: string;
    deliveryMethod?: string;
    deliveryPrice?: number;
    deliveryFullname?: string;
    deliveryCompany?: string;
    deliveryAddress?: string;
    deliveryPostcode?: string;
    deliveryCity?: string;
    deliveryState?: string;
    deliveryCountryCode?: string;
    deliveryPointId?: string;
    deliveryPointName?: string;
    deliveryPointAddress?: string;
    deliveryPointPostcode?: string;
    deliveryPointCity?: string;
    invoiceFullname?: string;
    invoiceCompany?: string;
    invoiceNip?: string;
    invoiceAddress?: string;
    invoicePostcode?: string;
    invoiceCity?: string;
    invoiceState?: string;
    invoiceCountryCode?: string;
    wantInvoice?: boolean;
    extraField1?: string;
    extraField2?: string;
    customExtraFields?: Record<string, string>;
    customSourceId?: number;
    products: Array<{
      storage?: string;
      storageId?: string;
      productId?: string;
      variantId?: string;
      name: string;
      sku?: string;
      ean?: string;
      location?: string;
      warehouseId?: number;
      attributes?: string;
      priceBrutto: number;
      taxRate: number;
      quantity: number;
      weight?: number;
    }>;
  }): Promise<any> {
    return this.request('addOrder', {
      order_status_id: params.orderStatusId,
      date_add: params.dateAdd,
      currency: params.currency,
      payment_method: params.paymentMethod,
      payment_method_cod: params.paymentMethodCod,
      paid: params.paid,
      user_comments: params.userComments,
      admin_comments: params.adminComments,
      email: params.email,
      phone: params.phone,
      user_login: params.userLogin,
      delivery_method: params.deliveryMethod,
      delivery_price: params.deliveryPrice,
      delivery_fullname: params.deliveryFullname,
      delivery_company: params.deliveryCompany,
      delivery_address: params.deliveryAddress,
      delivery_postcode: params.deliveryPostcode,
      delivery_city: params.deliveryCity,
      delivery_state: params.deliveryState,
      delivery_country_code: params.deliveryCountryCode,
      delivery_point_id: params.deliveryPointId,
      delivery_point_name: params.deliveryPointName,
      delivery_point_address: params.deliveryPointAddress,
      delivery_point_postcode: params.deliveryPointPostcode,
      delivery_point_city: params.deliveryPointCity,
      invoice_fullname: params.invoiceFullname,
      invoice_company: params.invoiceCompany,
      invoice_nip: params.invoiceNip,
      invoice_address: params.invoiceAddress,
      invoice_postcode: params.invoicePostcode,
      invoice_city: params.invoiceCity,
      invoice_state: params.invoiceState,
      invoice_country_code: params.invoiceCountryCode,
      want_invoice: params.wantInvoice,
      extra_field_1: params.extraField1,
      extra_field_2: params.extraField2,
      custom_extra_fields: params.customExtraFields,
      custom_source_id: params.customSourceId,
      products: params.products.map(p => ({
        storage: p.storage,
        storage_id: p.storageId,
        product_id: p.productId,
        variant_id: p.variantId,
        name: p.name,
        sku: p.sku,
        ean: p.ean,
        location: p.location,
        warehouse_id: p.warehouseId,
        attributes: p.attributes,
        price_brutto: p.priceBrutto,
        tax_rate: p.taxRate,
        quantity: p.quantity,
        weight: p.weight
      }))
    });
  }

  async setOrderFields(params: {
    orderId: number;
    adminComments?: string;
    userComments?: string;
    paymentMethod?: string;
    paymentMethodCod?: boolean;
    email?: string;
    phone?: string;
    userLogin?: string;
    deliveryMethod?: string;
    deliveryPrice?: number;
    deliveryFullname?: string;
    deliveryCompany?: string;
    deliveryAddress?: string;
    deliveryPostcode?: string;
    deliveryCity?: string;
    deliveryState?: string;
    deliveryCountryCode?: string;
    deliveryPointId?: string;
    deliveryPointName?: string;
    deliveryPointAddress?: string;
    deliveryPointPostcode?: string;
    deliveryPointCity?: string;
    invoiceFullname?: string;
    invoiceCompany?: string;
    invoiceNip?: string;
    invoiceAddress?: string;
    invoicePostcode?: string;
    invoiceCity?: string;
    invoiceState?: string;
    invoiceCountryCode?: string;
    wantInvoice?: boolean;
    extraField1?: string;
    extraField2?: string;
    customExtraFields?: Record<string, string>;
    pickState?: number;
    packState?: number;
    star?: number;
  }): Promise<any> {
    let payload: Record<string, any> = { order_id: params.orderId };
    if (params.adminComments !== undefined) payload.admin_comments = params.adminComments;
    if (params.userComments !== undefined) payload.user_comments = params.userComments;
    if (params.paymentMethod !== undefined) payload.payment_method = params.paymentMethod;
    if (params.paymentMethodCod !== undefined)
      payload.payment_method_cod = params.paymentMethodCod;
    if (params.email !== undefined) payload.email = params.email;
    if (params.phone !== undefined) payload.phone = params.phone;
    if (params.userLogin !== undefined) payload.user_login = params.userLogin;
    if (params.deliveryMethod !== undefined) payload.delivery_method = params.deliveryMethod;
    if (params.deliveryPrice !== undefined) payload.delivery_price = params.deliveryPrice;
    if (params.deliveryFullname !== undefined)
      payload.delivery_fullname = params.deliveryFullname;
    if (params.deliveryCompany !== undefined)
      payload.delivery_company = params.deliveryCompany;
    if (params.deliveryAddress !== undefined)
      payload.delivery_address = params.deliveryAddress;
    if (params.deliveryPostcode !== undefined)
      payload.delivery_postcode = params.deliveryPostcode;
    if (params.deliveryCity !== undefined) payload.delivery_city = params.deliveryCity;
    if (params.deliveryState !== undefined) payload.delivery_state = params.deliveryState;
    if (params.deliveryCountryCode !== undefined)
      payload.delivery_country_code = params.deliveryCountryCode;
    if (params.deliveryPointId !== undefined)
      payload.delivery_point_id = params.deliveryPointId;
    if (params.deliveryPointName !== undefined)
      payload.delivery_point_name = params.deliveryPointName;
    if (params.deliveryPointAddress !== undefined)
      payload.delivery_point_address = params.deliveryPointAddress;
    if (params.deliveryPointPostcode !== undefined)
      payload.delivery_point_postcode = params.deliveryPointPostcode;
    if (params.deliveryPointCity !== undefined)
      payload.delivery_point_city = params.deliveryPointCity;
    if (params.invoiceFullname !== undefined)
      payload.invoice_fullname = params.invoiceFullname;
    if (params.invoiceCompany !== undefined) payload.invoice_company = params.invoiceCompany;
    if (params.invoiceNip !== undefined) payload.invoice_nip = params.invoiceNip;
    if (params.invoiceAddress !== undefined) payload.invoice_address = params.invoiceAddress;
    if (params.invoicePostcode !== undefined)
      payload.invoice_postcode = params.invoicePostcode;
    if (params.invoiceCity !== undefined) payload.invoice_city = params.invoiceCity;
    if (params.invoiceState !== undefined) payload.invoice_state = params.invoiceState;
    if (params.invoiceCountryCode !== undefined)
      payload.invoice_country_code = params.invoiceCountryCode;
    if (params.wantInvoice !== undefined) payload.want_invoice = params.wantInvoice;
    if (params.extraField1 !== undefined) payload.extra_field_1 = params.extraField1;
    if (params.extraField2 !== undefined) payload.extra_field_2 = params.extraField2;
    if (params.customExtraFields !== undefined)
      payload.custom_extra_fields = params.customExtraFields;
    if (params.pickState !== undefined) payload.pick_state = params.pickState;
    if (params.packState !== undefined) payload.pack_state = params.packState;
    if (params.star !== undefined) payload.star = params.star;
    return this.request('setOrderFields', payload);
  }

  async setOrderStatus(orderId: number, statusId: number): Promise<any> {
    return this.request('setOrderStatus', {
      order_id: orderId,
      status_id: statusId
    });
  }

  async addOrderProduct(params: {
    orderId: number;
    storage?: string;
    storageId?: string;
    productId?: string;
    variantId?: string;
    auctionId?: string;
    name: string;
    sku?: string;
    ean?: string;
    location?: string;
    warehouseId?: number;
    attributes?: string;
    priceBrutto: number;
    taxRate: number;
    quantity: number;
    weight?: number;
  }): Promise<any> {
    return this.request('addOrderProduct', {
      order_id: params.orderId,
      storage: params.storage,
      storage_id: params.storageId,
      product_id: params.productId,
      variant_id: params.variantId,
      auction_id: params.auctionId,
      name: params.name,
      sku: params.sku,
      ean: params.ean,
      location: params.location,
      warehouse_id: params.warehouseId,
      attributes: params.attributes,
      price_brutto: params.priceBrutto,
      tax_rate: params.taxRate,
      quantity: params.quantity,
      weight: params.weight
    });
  }

  async setOrderProductFields(params: {
    orderId: number;
    orderProductId: number;
    storage?: string;
    storageId?: string;
    productId?: string;
    variantId?: string;
    auctionId?: string;
    name?: string;
    sku?: string;
    ean?: string;
    location?: string;
    warehouseId?: number;
    attributes?: string;
    priceBrutto?: number;
    taxRate?: number;
    quantity?: number;
    weight?: number;
  }): Promise<any> {
    let payload: Record<string, any> = {
      order_id: params.orderId,
      order_product_id: params.orderProductId
    };
    if (params.storage !== undefined) payload.storage = params.storage;
    if (params.storageId !== undefined) payload.storage_id = params.storageId;
    if (params.productId !== undefined) payload.product_id = params.productId;
    if (params.variantId !== undefined) payload.variant_id = params.variantId;
    if (params.auctionId !== undefined) payload.auction_id = params.auctionId;
    if (params.name !== undefined) payload.name = params.name;
    if (params.sku !== undefined) payload.sku = params.sku;
    if (params.ean !== undefined) payload.ean = params.ean;
    if (params.location !== undefined) payload.location = params.location;
    if (params.warehouseId !== undefined) payload.warehouse_id = params.warehouseId;
    if (params.attributes !== undefined) payload.attributes = params.attributes;
    if (params.priceBrutto !== undefined) payload.price_brutto = params.priceBrutto;
    if (params.taxRate !== undefined) payload.tax_rate = params.taxRate;
    if (params.quantity !== undefined) payload.quantity = params.quantity;
    if (params.weight !== undefined) payload.weight = params.weight;
    return this.request('setOrderProductFields', payload);
  }

  async deleteOrderProduct(orderId: number, orderProductId: number): Promise<any> {
    return this.request('deleteOrderProduct', {
      order_id: orderId,
      order_product_id: orderProductId
    });
  }

  async setOrderPayment(params: {
    orderId: number;
    paymentDone: number;
    paymentDate?: number;
    paymentComment?: string;
    externalPaymentId?: string;
  }): Promise<any> {
    return this.request('setOrderPayment', {
      order_id: params.orderId,
      payment_done: params.paymentDone,
      payment_date: params.paymentDate,
      payment_comment: params.paymentComment,
      external_payment_id: params.externalPaymentId
    });
  }

  async getOrderStatusList(): Promise<any> {
    return this.request('getOrderStatusList');
  }

  async getOrderSources(): Promise<any> {
    return this.request('getOrderSources');
  }

  // ── Product Catalog (Inventory) ──

  async getInventories(): Promise<any> {
    return this.request('getInventories');
  }

  async getInventoryProductsList(params: {
    inventoryId: number;
    filterCategoryId?: number;
    filterEan?: string;
    filterSku?: string;
    filterName?: string;
    filterPriceFrom?: number;
    filterPriceTo?: number;
    filterStockFrom?: number;
    filterStockTo?: number;
    filterSort?: string;
    page?: number;
  }): Promise<any> {
    return this.request('getInventoryProductsList', {
      inventory_id: params.inventoryId,
      filter_category_id: params.filterCategoryId,
      filter_ean: params.filterEan,
      filter_sku: params.filterSku,
      filter_name: params.filterName,
      filter_price_from: params.filterPriceFrom,
      filter_price_to: params.filterPriceTo,
      filter_stock_from: params.filterStockFrom,
      filter_stock_to: params.filterStockTo,
      filter_sort: params.filterSort,
      page: params.page
    });
  }

  async getInventoryProductsData(params: {
    inventoryId: number;
    products: number[];
  }): Promise<any> {
    return this.request('getInventoryProductsData', {
      inventory_id: params.inventoryId,
      products: params.products
    });
  }

  async addInventoryProduct(params: {
    inventoryId: number;
    productId?: string;
    parentId?: string;
    isBundle?: boolean;
    sku?: string;
    ean?: string;
    asin?: string;
    tags?: string[];
    taxRate?: number;
    weight?: number;
    height?: number;
    width?: number;
    length?: number;
    star?: number;
    manufacturerId?: number;
    categoryId?: number;
    prices?: Record<string, number>;
    stock?: Record<string, number>;
    locations?: Record<string, string>;
    textFields?: Record<string, string>;
    images?: Record<string, string>;
    links?: Record<string, string>;
    bundleProducts?: Record<string, number>;
  }): Promise<any> {
    let payload: Record<string, any> = {
      inventory_id: params.inventoryId
    };
    if (params.productId !== undefined) payload.product_id = params.productId;
    if (params.parentId !== undefined) payload.parent_id = params.parentId;
    if (params.isBundle !== undefined) payload.is_bundle = params.isBundle;
    if (params.sku !== undefined) payload.sku = params.sku;
    if (params.ean !== undefined) payload.ean = params.ean;
    if (params.asin !== undefined) payload.asin = params.asin;
    if (params.tags !== undefined) payload.tags = params.tags;
    if (params.taxRate !== undefined) payload.tax_rate = params.taxRate;
    if (params.weight !== undefined) payload.weight = params.weight;
    if (params.height !== undefined) payload.height = params.height;
    if (params.width !== undefined) payload.width = params.width;
    if (params.length !== undefined) payload.length = params.length;
    if (params.star !== undefined) payload.star = params.star;
    if (params.manufacturerId !== undefined) payload.manufacturer_id = params.manufacturerId;
    if (params.categoryId !== undefined) payload.category_id = params.categoryId;
    if (params.prices !== undefined) payload.prices = params.prices;
    if (params.stock !== undefined) payload.stock = params.stock;
    if (params.locations !== undefined) payload.locations = params.locations;
    if (params.textFields !== undefined) payload.text_fields = params.textFields;
    if (params.images !== undefined) payload.images = params.images;
    if (params.links !== undefined) payload.links = params.links;
    if (params.bundleProducts !== undefined) payload.bundle_products = params.bundleProducts;
    return this.request('addInventoryProduct', payload);
  }

  async deleteInventoryProduct(productId: number): Promise<any> {
    return this.request('deleteInventoryProduct', {
      product_id: productId
    });
  }

  async getInventoryProductsStock(params: {
    inventoryId: number;
    page?: number;
  }): Promise<any> {
    return this.request('getInventoryProductsStock', {
      inventory_id: params.inventoryId,
      page: params.page
    });
  }

  async updateInventoryProductsStock(params: {
    inventoryId: number;
    products: Record<string, Record<string, number>>;
  }): Promise<any> {
    return this.request('updateInventoryProductsStock', {
      inventory_id: params.inventoryId,
      products: params.products
    });
  }

  async getInventoryProductsPrices(params: {
    inventoryId: number;
    page?: number;
  }): Promise<any> {
    return this.request('getInventoryProductsPrices', {
      inventory_id: params.inventoryId,
      page: params.page
    });
  }

  async updateInventoryProductsPrices(params: {
    inventoryId: number;
    products: Record<string, Record<string, number>>;
  }): Promise<any> {
    return this.request('updateInventoryProductsPrices', {
      inventory_id: params.inventoryId,
      products: params.products
    });
  }

  async getInventoryCategories(inventoryId: number): Promise<any> {
    return this.request('getInventoryCategories', {
      inventory_id: inventoryId
    });
  }

  async addInventoryCategory(params: {
    inventoryId: number;
    categoryId?: number;
    name: string;
    parentId?: number;
  }): Promise<any> {
    return this.request('addInventoryCategory', {
      inventory_id: params.inventoryId,
      category_id: params.categoryId,
      name: params.name,
      parent_id: params.parentId
    });
  }

  async deleteInventoryCategory(categoryId: number): Promise<any> {
    return this.request('deleteInventoryCategory', {
      category_id: categoryId
    });
  }

  async getInventoryManufacturers(page?: number): Promise<any> {
    return this.request('getInventoryManufacturers', { page });
  }

  async addInventoryManufacturer(params: {
    manufacturerId?: number;
    name: string;
  }): Promise<any> {
    return this.request('addInventoryManufacturer', {
      manufacturer_id: params.manufacturerId,
      name: params.name
    });
  }

  async deleteInventoryManufacturer(manufacturerId: number): Promise<any> {
    return this.request('deleteInventoryManufacturer', {
      manufacturer_id: manufacturerId
    });
  }

  async getInventoryWarehouses(): Promise<any> {
    return this.request('getInventoryWarehouses');
  }

  async getInventoryPriceGroups(): Promise<any> {
    return this.request('getInventoryPriceGroups');
  }

  // ── Courier Shipments ──

  async getCourierAccounts(courierCode: string): Promise<any> {
    return this.request('getCourierAccounts', { courier_code: courierCode });
  }

  async getCouriersList(): Promise<any> {
    return this.request('getCouriersList');
  }

  async getCourierFields(courierCode: string): Promise<any> {
    return this.request('getCourierFields', {
      courier_code: courierCode
    });
  }

  async getCourierServices(params: {
    orderId: number;
    courierCode: string;
    accountId?: number;
    fields?: Array<{ id: string; value: string }>;
    packages?: Array<{ weight: number; sizeX?: number; sizeY?: number; sizeZ?: number }>;
  }): Promise<any> {
    return this.request('getCourierServices', {
      order_id: params.orderId,
      courier_code: params.courierCode,
      account_id: params.accountId,
      fields: params.fields,
      packages: params.packages
    });
  }

  async createPackage(params: {
    orderId: number;
    courierCode: string;
    accountId?: number;
    fields?: Array<{ id: string; value: string }>;
    packages: Array<{
      weight: number;
      sizeX?: number;
      sizeY?: number;
      sizeZ?: number;
      fields?: Record<string, string | number | boolean>;
    }>;
  }): Promise<any> {
    return this.request('createPackage', {
      order_id: params.orderId,
      courier_code: params.courierCode,
      account_id: params.accountId,
      fields: params.fields,
      packages: params.packages?.map(p => ({
        weight: p.weight,
        size_x: p.sizeX,
        size_y: p.sizeY,
        size_z: p.sizeZ,
        ...p.fields
      }))
    });
  }

  async createPackageManual(params: {
    orderId: number;
    courierCode: string;
    packageNumber: string;
    pickupDate?: number;
    returnShipment?: boolean;
  }): Promise<any> {
    return this.request('createPackageManual', {
      order_id: params.orderId,
      courier_code: params.courierCode,
      package_number: params.packageNumber,
      pickup_date: params.pickupDate,
      return_shipment: params.returnShipment
    });
  }

  async getLabel(
    courierCode: string,
    packageId?: number,
    packageNumber?: string
  ): Promise<any> {
    return this.request('getLabel', {
      courier_code: courierCode,
      package_id: packageId,
      package_number: packageNumber
    });
  }

  async getOrderPackages(orderId: number): Promise<any> {
    return this.request('getOrderPackages', {
      order_id: orderId
    });
  }

  async getCourierPackagesStatusHistory(packageIds: number[]): Promise<any> {
    return this.request('getCourierPackagesStatusHistory', {
      package_ids: packageIds
    });
  }

  // ── Order Returns ──

  async getOrderReturns(
    params: { orderId?: number; dateFrom?: number; idFrom?: number } = {}
  ): Promise<any> {
    return this.request('getOrderReturns', {
      order_id: params.orderId,
      date_from: params.dateFrom,
      id_from: params.idFrom
    });
  }

  async getOrderReturnOptions(): Promise<any> {
    let [reasons, statuses] = await Promise.all([
      this.request('getOrderReturnReasonsList'),
      this.request('getOrderReturnStatusList')
    ]);
    return { reasons, statuses };
  }

  async getOrderReturnReasons(): Promise<any> {
    return this.request('getOrderReturnReasons');
  }

  async addOrderReturn(params: {
    orderId?: number;
    statusId?: number;
    dateAdd?: number;
    currency?: string;
    refunded?: boolean;
    reasonId?: number;
    adminComments?: string;
    products?: Array<{
      orderProductId: number;
      quantity: number;
      name?: string;
      sku?: string;
      storage?: string;
      storageId?: number;
      variantId?: number;
      ean?: string;
      location?: string;
      warehouseId?: number;
      attributes?: string;
      weight?: number;
      productId?: string;
      priceBrutto?: number;
      taxRate?: number;
      returnReasonId?: number;
      statusId?: number;
    }>;
  }): Promise<any> {
    return this.request('addOrderReturn', {
      order_id: params.orderId,
      status_id: params.statusId,
      date_add: params.dateAdd,
      currency: params.currency,
      refunded: params.refunded,
      reason_id: params.reasonId,
      admin_comments: params.adminComments,
      products: params.products?.map(p => ({
        order_product_id: p.orderProductId,
        quantity: p.quantity,
        name: p.name,
        sku: p.sku,
        storage: p.storage,
        storage_id: p.storageId,
        variant_id: p.variantId,
        ean: p.ean,
        location: p.location,
        warehouse_id: p.warehouseId,
        attributes: p.attributes,
        weight: p.weight,
        product_id: p.productId,
        price_brutto: p.priceBrutto,
        tax_rate: p.taxRate,
        return_reason_id: p.returnReasonId,
        status_id: p.statusId
      }))
    });
  }

  async updateOrderReturn(params: {
    returnId: number;
    adminComments?: string;
    reasonId?: number;
  }): Promise<any> {
    let payload: Record<string, any> = { return_id: params.returnId };
    if (params.adminComments !== undefined) payload.admin_comments = params.adminComments;
    if (params.reasonId !== undefined) payload.reason_id = params.reasonId;
    return this.request('updateOrderReturn', payload);
  }

  async deleteOrderReturn(returnId: number): Promise<any> {
    return this.request('deleteOrderReturn', {
      return_id: returnId
    });
  }

  // ── Journal (Events) ──

  async getJournalList(
    params: { lastLogId?: number; logsTypes?: number[]; orderId?: number } = {}
  ): Promise<any> {
    return this.request('getJournalList', {
      last_log_id: params.lastLogId,
      logs_types: params.logsTypes,
      order_id: params.orderId
    });
  }

  // ── External Storages ──

  async getExternalStoragesList(): Promise<any> {
    return this.request('getExternalStoragesList');
  }

  async getExternalStorageCategories(storageId: string): Promise<any> {
    return this.request('getExternalStorageCategories', {
      storage_id: storageId
    });
  }

  async getExternalStorageProductsList(params: {
    storageId: string;
    filterCategoryId?: string;
    filterSort?: string;
    filterOffset?: number;
    filterLimit?: number;
    page?: number;
  }): Promise<any> {
    return this.request('getExternalStorageProductsList', {
      storage_id: params.storageId,
      filter_category_id: params.filterCategoryId,
      filter_sort: params.filterSort,
      filter_offset: params.filterOffset,
      filter_limit: params.filterLimit,
      page: params.page
    });
  }

  async getExternalStorageProductsData(params: {
    storageId: string;
    products: string[];
  }): Promise<any> {
    return this.request('getExternalStorageProductsData', {
      storage_id: params.storageId,
      products: params.products
    });
  }

  async getExternalStorageProductsQuantity(params: {
    storageId: string;
    page?: number;
  }): Promise<any> {
    return this.request('getExternalStorageProductsQuantity', {
      storage_id: params.storageId,
      page: params.page
    });
  }

  async getExternalStorageProductsPrices(params: {
    storageId: string;
    page?: number;
  }): Promise<any> {
    return this.request('getExternalStorageProductsPrices', {
      storage_id: params.storageId,
      page: params.page
    });
  }
}
