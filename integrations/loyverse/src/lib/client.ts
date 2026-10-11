import { createApiServiceError, createAxios, isApiErrorRecord } from 'slates';

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

// Loyverse returns `{ errors: [{ code, details, field }] }` for failed requests.
// https://developer.loyverse.com/docs/#section/Handling-errors
let describeLoyverseErrors = (data: unknown) => {
  if (!isApiErrorRecord(data) || !Array.isArray(data.errors)) {
    return undefined;
  }

  let parts: string[] = [];
  let code: string | undefined;

  for (let entry of data.errors) {
    if (!isApiErrorRecord(entry)) continue;

    let entryCode = typeof entry.code === 'string' ? entry.code : undefined;
    let details = typeof entry.details === 'string' ? entry.details : undefined;
    let field = typeof entry.field === 'string' ? entry.field : undefined;

    code ??= entryCode;

    let text = [entryCode, details].filter(Boolean).join(': ');
    if (field) text = `${text}${text ? ' ' : ''}(field: ${field})`;
    if (text) parts.push(text);
  }

  if (parts.length === 0) return undefined;

  return { message: `Loyverse API error: ${parts.join('; ')}`, code };
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
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      errorMapping: {
        mapAxiosError: (error, inferred) => {
          let described = describeLoyverseErrors(error.response?.data);
          if (!described) return inferred;

          return {
            ...inferred,
            message: described.message,
            upstream: {
              ...inferred.upstream,
              code: described.code ?? inferred.upstream?.code
            }
          };
        }
      }
    });
  }

  // ── Merchant ──────────────────────────────────────────────

  async getMerchant(): Promise<any> {
    let response = await this.axios.get('/merchant/');
    return response.data;
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
    return response.data;
  }

  async getItem(itemId: string): Promise<any> {
    let response = await this.axios.get(`/items/${requireId(itemId, 'Item ID')}`);
    return response.data;
  }

  async createOrUpdateItem(data: any): Promise<any> {
    let response = await this.axios.post('/items', data);
    return response.data;
  }

  async deleteItem(itemId: string): Promise<any> {
    let response = await this.axios.delete(`/items/${requireId(itemId, 'Item ID')}`);
    return response.data;
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
    return response.data;
  }

  // ── Categories ────────────────────────────────────────────

  async listCategories(params?: ListParams & { showDeleted?: boolean }): Promise<any> {
    let response = await this.axios.get('/categories', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return response.data;
  }

  async getCategory(categoryId: string): Promise<any> {
    let response = await this.axios.get(`/categories/${requireId(categoryId, 'Category ID')}`);
    return response.data;
  }

  async createOrUpdateCategory(data: any): Promise<any> {
    let response = await this.axios.post('/categories', data);
    return response.data;
  }

  async deleteCategory(categoryId: string): Promise<any> {
    let response = await this.axios.delete(
      `/categories/${requireId(categoryId, 'Category ID')}`
    );
    return response.data;
  }

  // ── Modifiers ─────────────────────────────────────────────

  async listModifiers(params?: ListParams & { showDeleted?: boolean }): Promise<any> {
    let response = await this.axios.get('/modifiers', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return response.data;
  }

  async getModifier(modifierId: string): Promise<any> {
    let response = await this.axios.get(`/modifiers/${requireId(modifierId, 'Modifier ID')}`);
    return response.data;
  }

  async createOrUpdateModifier(data: any): Promise<any> {
    let response = await this.axios.post('/modifiers', data);
    return response.data;
  }

  async deleteModifier(modifierId: string): Promise<any> {
    let response = await this.axios.delete(
      `/modifiers/${requireId(modifierId, 'Modifier ID')}`
    );
    return response.data;
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
    return response.data;
  }

  async getCustomer(customerId: string): Promise<any> {
    let response = await this.axios.get(`/customers/${requireId(customerId, 'Customer ID')}`);
    return response.data;
  }

  async createOrUpdateCustomer(data: any): Promise<any> {
    let response = await this.axios.post('/customers', data);
    return response.data;
  }

  async deleteCustomer(customerId: string): Promise<any> {
    let response = await this.axios.delete(
      `/customers/${requireId(customerId, 'Customer ID')}`
    );
    return response.data;
  }

  // ── Discounts ─────────────────────────────────────────────

  async listDiscounts(params?: ListParams & { showDeleted?: boolean }): Promise<any> {
    let response = await this.axios.get('/discounts', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return response.data;
  }

  async getDiscount(discountId: string): Promise<any> {
    let response = await this.axios.get(`/discounts/${requireId(discountId, 'Discount ID')}`);
    return response.data;
  }

  async createOrUpdateDiscount(data: any): Promise<any> {
    let response = await this.axios.post('/discounts', data);
    return response.data;
  }

  async deleteDiscount(discountId: string): Promise<any> {
    let response = await this.axios.delete(
      `/discounts/${requireId(discountId, 'Discount ID')}`
    );
    return response.data;
  }

  // ── Taxes ─────────────────────────────────────────────────

  async listTaxes(params?: ListParams & { showDeleted?: boolean }): Promise<any> {
    let response = await this.axios.get('/taxes', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return response.data;
  }

  async getTax(taxId: string): Promise<any> {
    let response = await this.axios.get(`/taxes/${requireId(taxId, 'Tax ID')}`);
    return response.data;
  }

  async createOrUpdateTax(data: any): Promise<any> {
    let response = await this.axios.post('/taxes', data);
    return response.data;
  }

  async deleteTax(taxId: string): Promise<any> {
    let response = await this.axios.delete(`/taxes/${requireId(taxId, 'Tax ID')}`);
    return response.data;
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
    return response.data;
  }

  async updateInventory(data: {
    inventory_levels: { variant_id: string; store_id: string; stock_after: number }[];
  }): Promise<any> {
    let response = await this.axios.post('/inventory', data);
    return response.data;
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
    return response.data;
  }

  async getReceipt(receiptNumber: string): Promise<any> {
    let response = await this.axios.get(
      `/receipts/${requireId(receiptNumber, 'Receipt number')}`
    );
    return response.data;
  }

  async createReceipt(data: any): Promise<any> {
    let response = await this.axios.post('/receipts', data);
    return response.data;
  }

  async createRefund(receiptNumber: string, data: any): Promise<any> {
    let response = await this.axios.post(
      `/receipts/${requireId(receiptNumber, 'Receipt number')}/refund`,
      data
    );
    return response.data;
  }

  // ── Payment Types ─────────────────────────────────────────

  async listPaymentTypes(params?: ListParams & { showDeleted?: boolean }): Promise<any> {
    let response = await this.axios.get('/payment_types', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return response.data;
  }

  // ── Employees ─────────────────────────────────────────────

  async listEmployees(params?: ListParams & { showDeleted?: boolean }): Promise<any> {
    let response = await this.axios.get('/employees', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return response.data;
  }

  // ── Stores ────────────────────────────────────────────────

  async listStores(params?: ListParams & { showDeleted?: boolean }): Promise<any> {
    let response = await this.axios.get('/stores', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return response.data;
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
    return response.data;
  }

  // ── Suppliers ─────────────────────────────────────────────

  async listSuppliers(params?: ListParams & { showDeleted?: boolean }): Promise<any> {
    let response = await this.axios.get('/suppliers/', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        show_deleted: params?.showDeleted
      }
    });
    return response.data;
  }

  async getSupplier(supplierId: string): Promise<any> {
    let response = await this.axios.get(`/suppliers/${requireId(supplierId, 'Supplier ID')}`);
    return response.data;
  }

  async createOrUpdateSupplier(data: any): Promise<any> {
    let response = await this.axios.post('/suppliers/', data);
    return response.data;
  }

  async deleteSupplier(supplierId: string): Promise<any> {
    let response = await this.axios.delete(
      `/suppliers/${requireId(supplierId, 'Supplier ID')}`
    );
    return response.data;
  }
}
