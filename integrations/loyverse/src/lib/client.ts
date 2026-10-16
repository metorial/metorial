import { createApiServiceError, createAuthenticatedAxios, isApiErrorRecord } from 'slates';
import { loyverseApiError } from './errors';

let BASE_URL = 'https://api.loyverse.com/v1.0';

type ListParams = {
  limit?: number;
  cursor?: string;
};

type DateRangeParams = {
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
};

let requireId = (value: string | undefined, label: string) => {
  let trimmed = value?.trim();
  if (!trimmed) {
    throw createApiServiceError(`${label} is required.`, { reason: 'invalid_input' });
  }
  if (trimmed === '.' || trimmed === '..') {
    throw createApiServiceError(`${label} must not be a relative path segment.`, {
      reason: 'invalid_input'
    });
  }
  return encodeURIComponent(trimmed);
};

export let joinIds = (...values: (string | string[] | undefined)[]) => {
  let ids = values
    .flatMap(value => (Array.isArray(value) ? value : value ? [value] : []))
    .map(value => value.trim())
    .filter(Boolean);

  return ids.length > 0 ? Array.from(new Set(ids)).join(',') : undefined;
};

let dateParams = (params?: DateRangeParams) => ({
  created_at_min: params?.createdAtMin,
  created_at_max: params?.createdAtMax,
  updated_at_min: params?.updatedAtMin,
  updated_at_max: params?.updatedAtMax
});

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let token = config.token.trim();
    if (!token) {
      throw createApiServiceError('A Loyverse access token is required.', {
        reason: 'loyverse_missing_token'
      });
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30_000,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      errorAdapter: loyverseApiError
    });
  }

  private requireResource(data: unknown, fields: readonly string[]) {
    if (
      !isApiErrorRecord(data) ||
      fields.some(field => typeof data[field] !== 'string' || !String(data[field]).trim())
    ) {
      throw createApiServiceError(
        'Loyverse returned an incomplete resource response. Inspect the resource before retrying a write.',
        { reason: 'loyverse_invalid_response' }
      );
    }
    return data as Record<string, any>;
  }

  private requireList(data: unknown, key: string, fields: readonly string[]) {
    if (!isApiErrorRecord(data) || !Array.isArray(data[key])) {
      throw createApiServiceError(`Loyverse returned an invalid ${key} list.`, {
        reason: 'loyverse_invalid_response'
      });
    }
    for (let entry of data[key]) this.requireResource(entry, fields);
    return data as Record<string, any>;
  }

  private requireItem(data: unknown) {
    let item = this.requireResource(data, ['id', 'item_name']);
    return this.requireList(item, 'variants', ['variant_id']);
  }

  private async deleteResource(path: string, id: string, label: string) {
    let response = await this.axios.delete(`${path}/${requireId(id, label)}`);
    let data: unknown = response.data;
    if (
      !isApiErrorRecord(data) ||
      !Array.isArray(data.deleted_object_ids) ||
      !data.deleted_object_ids.includes(id.trim())
    ) {
      throw createApiServiceError(
        'Loyverse did not confirm the requested deletion. Check the resource before retrying.',
        { reason: 'loyverse_unconfirmed_delete' }
      );
    }
    return data;
  }

  // ── Merchant ──────────────────────────────────────────────

  async getMerchant(): Promise<any> {
    let response = await this.axios.get('/merchant/');
    return this.requireResource(response.data, ['id']);
  }

  // ── Items ─────────────────────────────────────────────────

  async listItems(
    params?: ListParams &
      DateRangeParams & {
        itemIds?: string;
        showDeleted?: boolean;
      }
  ): Promise<any> {
    let response = await this.axios.get('/items', {
      params: {
        items_ids: params?.itemIds,
        limit: params?.limit,
        cursor: params?.cursor,
        ...dateParams(params),
        show_deleted: params?.showDeleted
      }
    });
    return this.requireList(response.data, 'items', ['id', 'item_name']);
  }

  async getItem(itemId: string): Promise<any> {
    let response = await this.axios.get(`/items/${requireId(itemId, 'Item ID')}`);
    return this.requireItem(response.data);
  }

  async createOrUpdateItem(data: any): Promise<any> {
    let response = await this.axios.post('/items', data);
    return this.requireItem(response.data);
  }

  async deleteItem(itemId: string): Promise<any> {
    return this.deleteResource('/items', itemId, 'Item ID');
  }

  // ── Variants ──────────────────────────────────────────────

  async listVariants(
    params?: ListParams &
      DateRangeParams & {
        variantIds?: string;
        itemIds?: string;
        sku?: string;
        showDeleted?: boolean;
      }
  ): Promise<any> {
    let response = await this.axios.get('/variants', {
      params: {
        variants_ids: params?.variantIds,
        items_ids: params?.itemIds,
        sku: params?.sku,
        limit: params?.limit,
        cursor: params?.cursor,
        ...dateParams(params),
        show_deleted: params?.showDeleted
      }
    });
    return this.requireList(response.data, 'variants', ['variant_id']);
  }

  // ── Categories ────────────────────────────────────────────

  async listCategories(
    params?: ListParams & { showDeleted?: boolean; categoryIds?: string }
  ): Promise<any> {
    let response = await this.axios.get('/categories', {
      params: {
        categories_ids: params?.categoryIds,
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return this.requireList(response.data, 'categories', ['id', 'name']);
  }

  async getCategory(categoryId: string): Promise<any> {
    let response = await this.axios.get(`/categories/${requireId(categoryId, 'Category ID')}`);
    return this.requireResource(response.data, ['id', 'name']);
  }

  async createOrUpdateCategory(data: any): Promise<any> {
    let response = await this.axios.post('/categories', data);
    return this.requireResource(response.data, ['id', 'name']);
  }

  async deleteCategory(categoryId: string): Promise<any> {
    return this.deleteResource('/categories', categoryId, 'Category ID');
  }

  // ── Modifiers ─────────────────────────────────────────────

  async listModifiers(
    params?: ListParams & DateRangeParams & { showDeleted?: boolean; modifierIds?: string }
  ): Promise<any> {
    let response = await this.axios.get('/modifiers', {
      params: {
        modifier_ids: params?.modifierIds,
        ...dateParams(params),
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return this.requireList(response.data, 'modifiers', ['id']);
  }

  async getModifier(modifierId: string): Promise<any> {
    let response = await this.axios.get(`/modifiers/${requireId(modifierId, 'Modifier ID')}`);
    return this.requireResource(response.data, ['id']);
  }

  async createOrUpdateModifier(data: any): Promise<any> {
    let response = await this.axios.post('/modifiers', data);
    return this.requireResource(response.data, ['id']);
  }

  async deleteModifier(modifierId: string): Promise<any> {
    return this.deleteResource('/modifiers', modifierId, 'Modifier ID');
  }

  // ── Customers ─────────────────────────────────────────────

  async listCustomers(
    params?: ListParams &
      DateRangeParams & {
        customerIds?: string;
        email?: string;
        showDeleted?: boolean;
      }
  ): Promise<any> {
    let response = await this.axios.get('/customers', {
      params: {
        customer_ids: params?.customerIds,
        email: params?.email,
        limit: params?.limit,
        cursor: params?.cursor,
        ...dateParams(params),
        show_deleted: params?.showDeleted
      }
    });
    return this.requireList(response.data, 'customers', ['id']);
  }

  async getCustomer(customerId: string): Promise<any> {
    let response = await this.axios.get(`/customers/${requireId(customerId, 'Customer ID')}`);
    return this.requireResource(response.data, ['id']);
  }

  async createOrUpdateCustomer(data: any): Promise<any> {
    let response = await this.axios.post('/customers', data);
    return this.requireResource(response.data, ['id']);
  }

  async deleteCustomer(customerId: string): Promise<any> {
    return this.deleteResource('/customers', customerId, 'Customer ID');
  }

  // ── Discounts ─────────────────────────────────────────────

  async listDiscounts(
    params?: ListParams & DateRangeParams & { showDeleted?: boolean; discountIds?: string }
  ): Promise<any> {
    let response = await this.axios.get('/discounts', {
      params: {
        discount_ids: params?.discountIds,
        ...dateParams(params),
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return this.requireList(response.data, 'discounts', ['id']);
  }

  async getDiscount(discountId: string): Promise<any> {
    let response = await this.axios.get(`/discounts/${requireId(discountId, 'Discount ID')}`);
    return this.requireResource(response.data, ['id']);
  }

  async createOrUpdateDiscount(data: any): Promise<any> {
    let response = await this.axios.post('/discounts', data);
    return this.requireResource(response.data, ['id']);
  }

  async deleteDiscount(discountId: string): Promise<any> {
    return this.deleteResource('/discounts', discountId, 'Discount ID');
  }

  // ── Taxes ─────────────────────────────────────────────────

  async listTaxes(
    params?: ListParams & DateRangeParams & { showDeleted?: boolean; taxIds?: string }
  ): Promise<any> {
    let response = await this.axios.get('/taxes', {
      params: {
        tax_ids: params?.taxIds,
        ...dateParams(params),
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return this.requireList(response.data, 'taxes', ['id']);
  }

  async getTax(taxId: string): Promise<any> {
    let response = await this.axios.get(`/taxes/${requireId(taxId, 'Tax ID')}`);
    return this.requireResource(response.data, ['id']);
  }

  async createOrUpdateTax(data: any): Promise<any> {
    let response = await this.axios.post('/taxes', data);
    return this.requireResource(response.data, ['id']);
  }

  async deleteTax(taxId: string): Promise<any> {
    return this.deleteResource('/taxes', taxId, 'Tax ID');
  }

  // ── Inventory ─────────────────────────────────────────────

  async getInventory(
    params?: ListParams & {
      storeIds?: string;
      variantIds?: string;
      updatedAtMin?: string;
      updatedAtMax?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get('/inventory', {
      params: {
        store_ids: params?.storeIds,
        variant_ids: params?.variantIds,
        updated_at_min: params?.updatedAtMin,
        updated_at_max: params?.updatedAtMax,
        limit: params?.limit,
        cursor: params?.cursor
      }
    });
    return this.requireList(response.data, 'inventory_levels', ['variant_id', 'store_id']);
  }

  async updateInventory(data: {
    inventory_levels: { variant_id: string; store_id: string; stock_after: number }[];
  }): Promise<any> {
    let response = await this.axios.post('/inventory', data);
    return this.requireList(response.data, 'inventory_levels', ['variant_id', 'store_id']);
  }

  // ── Receipts ──────────────────────────────────────────────

  async listReceipts(
    params?: ListParams &
      DateRangeParams & {
        receiptNumbers?: string;
        sinceReceiptNumber?: string;
        beforeReceiptNumber?: string;
        storeId?: string;
        order?: string;
        source?: string;
      }
  ): Promise<any> {
    let response = await this.axios.get('/receipts', {
      params: {
        receipt_numbers: params?.receiptNumbers,
        since_receipt_number: params?.sinceReceiptNumber,
        before_receipt_number: params?.beforeReceiptNumber,
        store_id: params?.storeId,
        order: params?.order,
        source: params?.source,
        limit: params?.limit,
        cursor: params?.cursor,
        ...dateParams(params)
      }
    });
    return this.requireList(response.data, 'receipts', ['receipt_number']);
  }

  async getReceipt(receiptNumber: string): Promise<any> {
    let response = await this.axios.get(
      `/receipts/${requireId(receiptNumber, 'Receipt number')}`
    );
    return this.requireResource(response.data, ['receipt_number']);
  }

  async createReceipt(data: any): Promise<any> {
    let response = await this.axios.post('/receipts', data);
    return this.requireResource(response.data, ['receipt_number']);
  }

  async createRefund(receiptNumber: string, data: any): Promise<any> {
    let response = await this.axios.post(
      `/receipts/${requireId(receiptNumber, 'Receipt number')}/refund`,
      data
    );
    return this.requireResource(response.data, ['receipt_number']);
  }

  // ── Payment Types ─────────────────────────────────────────

  async listPaymentTypes(
    params?: ListParams & DateRangeParams & { showDeleted?: boolean; paymentTypeIds?: string }
  ): Promise<any> {
    let response = await this.axios.get('/payment_types', {
      params: {
        payment_type_ids: params?.paymentTypeIds,
        ...dateParams(params),
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return this.requireList(response.data, 'payment_types', ['id']);
  }

  async listPosDevices(params?: { storeId?: string; showDeleted?: boolean }): Promise<any> {
    let response = await this.axios.get('/pos_devices', {
      params: { store_id: params?.storeId, show_deleted: params?.showDeleted }
    });
    return this.requireList(response.data, 'pos_devices', ['id']);
  }

  // ── Employees ─────────────────────────────────────────────

  async listEmployees(
    params?: ListParams & DateRangeParams & { showDeleted?: boolean; employeeIds?: string }
  ): Promise<any> {
    let response = await this.axios.get('/employees', {
      params: {
        employee_ids: params?.employeeIds,
        ...dateParams(params),
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return this.requireList(response.data, 'employees', ['id']);
  }

  // ── Stores ────────────────────────────────────────────────

  async listStores(
    params?: ListParams & DateRangeParams & { showDeleted?: boolean; storeIds?: string }
  ): Promise<any> {
    let response = await this.axios.get('/stores', {
      params: {
        store_ids: params?.storeIds,
        ...dateParams(params),
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return this.requireList(response.data, 'stores', ['id']);
  }

  // ── Shifts ────────────────────────────────────────────────

  async listShifts(
    params?: ListParams & {
      storeIds?: string;
      createdAtMin?: string;
      createdAtMax?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get('/shifts', {
      params: {
        store_ids: params?.storeIds,
        created_at_min: params?.createdAtMin,
        created_at_max: params?.createdAtMax,
        limit: params?.limit,
        cursor: params?.cursor
      }
    });
    return this.requireList(response.data, 'shifts', ['id']);
  }

  // ── Suppliers ─────────────────────────────────────────────

  async listSuppliers(
    params?: ListParams & { showDeleted?: boolean; supplierIds?: string }
  ): Promise<any> {
    let response = await this.axios.get('/suppliers/', {
      params: {
        suppliers_ids: params?.supplierIds,
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return this.requireList(response.data, 'suppliers', ['id']);
  }

  async getSupplier(supplierId: string): Promise<any> {
    let response = await this.axios.get(`/suppliers/${requireId(supplierId, 'Supplier ID')}`);
    return this.requireResource(response.data, ['id']);
  }

  async createOrUpdateSupplier(data: any): Promise<any> {
    let response = await this.axios.post('/suppliers/', data);
    return this.requireResource(response.data, ['id']);
  }

  async deleteSupplier(supplierId: string): Promise<any> {
    return this.deleteResource('/suppliers', supplierId, 'Supplier ID');
  }
}
