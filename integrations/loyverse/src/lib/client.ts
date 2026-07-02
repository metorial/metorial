import { createAxios } from 'slates';

let BASE_URL = 'https://api.loyverse.com/v1.0';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Merchant ──────────────────────────────────────────────

  async getMerchant(): Promise<any> {
    let response = await this.axios.get('/merchant/');
    return response.data;
  }

  // ── Items ─────────────────────────────────────────────────

  async listItems(params?: {
    limit?: number;
    cursor?: string;
    updatedAtMin?: string;
    updatedAtMax?: string;
    showDeleted?: boolean;
  }): Promise<any> {
    let response = await this.axios.get('/items', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        updated_at_min: params?.updatedAtMin,
        updated_at_max: params?.updatedAtMax,
        show_deleted: params?.showDeleted
      }
    });
    return response.data;
  }

  async getItem(itemId: string): Promise<any> {
    let response = await this.axios.get(`/items/${itemId}`);
    return response.data;
  }

  async createItem(data: any): Promise<any> {
    let response = await this.axios.post('/items', data);
    return response.data;
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.axios.delete(`/items/${itemId}`);
  }

  async uploadItemImage(
    itemId: string,
    imageData: Buffer | string,
    contentType: string
  ): Promise<any> {
    let response = await this.axios.post(`/items/${itemId}/image`, imageData, {
      headers: { 'Content-Type': contentType }
    });
    return response.data;
  }

  async deleteItemImage(itemId: string): Promise<void> {
    await this.axios.delete(`/items/${itemId}/image`);
  }

  // ── Variants ──────────────────────────────────────────────

  async listVariants(params?: {
    limit?: number;
    cursor?: string;
    itemId?: string;
  }): Promise<any> {
    let response = await this.axios.get('/variants', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        item_id: params?.itemId
      }
    });
    return response.data;
  }

  async getVariant(variantId: string): Promise<any> {
    let response = await this.axios.get(`/variants/${variantId}`);
    return response.data;
  }

  async createOrUpdateVariant(data: any): Promise<any> {
    let response = await this.axios.post('/variants', data);
    return response.data;
  }

  async deleteVariant(variantId: string): Promise<void> {
    await this.axios.delete(`/variants/${variantId}`);
  }

  // ── Categories ────────────────────────────────────────────

  async listCategories(params?: {
    limit?: number;
    cursor?: string;
    showDeleted?: boolean;
  }): Promise<any> {
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
    let response = await this.axios.get(`/categories/${categoryId}`);
    return response.data;
  }

  async createOrUpdateCategory(data: any): Promise<any> {
    let response = await this.axios.post('/categories', data);
    return response.data;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await this.axios.delete(`/categories/${categoryId}`);
  }

  // ── Modifiers ─────────────────────────────────────────────

  async listModifiers(params?: { limit?: number; cursor?: string }): Promise<any> {
    let response = await this.axios.get('/modifiers', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async getModifier(modifierId: string): Promise<any> {
    let response = await this.axios.get(`/modifiers/${modifierId}`);
    return response.data;
  }

  async createOrUpdateModifier(data: any): Promise<any> {
    let response = await this.axios.post('/modifiers', data);
    return response.data;
  }

  async deleteModifier(modifierId: string): Promise<void> {
    await this.axios.delete(`/modifiers/${modifierId}`);
  }

  // ── Customers ─────────────────────────────────────────────

  async listCustomers(params?: {
    limit?: number;
    cursor?: string;
    email?: string;
    phoneNumber?: string;
    createdAtMin?: string;
    createdAtMax?: string;
    updatedAtMin?: string;
    updatedAtMax?: string;
    showDeleted?: boolean;
  }): Promise<any> {
    let response = await this.axios.get('/customers', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        email: params?.email,
        phone_number: params?.phoneNumber,
        created_at_min: params?.createdAtMin,
        created_at_max: params?.createdAtMax,
        updated_at_min: params?.updatedAtMin,
        updated_at_max: params?.updatedAtMax,
        show_deleted: params?.showDeleted
      }
    });
    return response.data;
  }

  async getCustomer(customerId: string): Promise<any> {
    let response = await this.axios.get(`/customers/${customerId}`);
    return response.data;
  }

  async createOrUpdateCustomer(data: any): Promise<any> {
    let response = await this.axios.post('/customers', data);
    return response.data;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.axios.delete(`/customers/${customerId}`);
  }

  // ── Discounts ─────────────────────────────────────────────

  async listDiscounts(params?: {
    limit?: number;
    cursor?: string;
    showDeleted?: boolean;
  }): Promise<any> {
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
    let response = await this.axios.get(`/discounts/${discountId}`);
    return response.data;
  }

  async createOrUpdateDiscount(data: any): Promise<any> {
    let response = await this.axios.post('/discounts', data);
    return response.data;
  }

  async deleteDiscount(discountId: string): Promise<void> {
    await this.axios.delete(`/discounts/${discountId}`);
  }

  // ── Taxes ─────────────────────────────────────────────────

  async listTaxes(params?: {
    limit?: number;
    cursor?: string;
    showDeleted?: boolean;
  }): Promise<any> {
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
    let response = await this.axios.get(`/taxes/${taxId}`);
    return response.data;
  }

  async createOrUpdateTax(data: any): Promise<any> {
    let response = await this.axios.post('/taxes', data);
    return response.data;
  }

  async deleteTax(taxId: string): Promise<void> {
    await this.axios.delete(`/taxes/${taxId}`);
  }

  // ── Inventory ─────────────────────────────────────────────

  async getInventory(params?: {
    limit?: number;
    cursor?: string;
    storeId?: string;
    variantId?: string;
  }): Promise<any> {
    let response = await this.axios.get('/inventory', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        store_id: params?.storeId,
        variant_id: params?.variantId
      }
    });
    return response.data;
  }

  async updateInventory(data: any): Promise<any> {
    let response = await this.axios.post('/inventory', data);
    return response.data;
  }

  // ── Receipts ──────────────────────────────────────────────

  async listReceipts(params?: {
    limit?: number;
    cursor?: string;
    createdAtMin?: string;
    createdAtMax?: string;
    updatedAtMin?: string;
    updatedAtMax?: string;
  }): Promise<any> {
    let response = await this.axios.get('/receipts', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        created_at_min: params?.createdAtMin,
        created_at_max: params?.createdAtMax,
        updated_at_min: params?.updatedAtMin,
        updated_at_max: params?.updatedAtMax
      }
    });
    return response.data;
  }

  async getReceipt(receiptNumber: string): Promise<any> {
    let response = await this.axios.get(`/receipts/${receiptNumber}`);
    return response.data;
  }

  async createReceipt(data: any): Promise<any> {
    let response = await this.axios.post('/receipts', data);
    return response.data;
  }

  async createRefund(receiptNumber: string, data: any): Promise<any> {
    let response = await this.axios.post(`/receipts/${receiptNumber}/refund`, data);
    return response.data;
  }

  // ── Payment Types ─────────────────────────────────────────

  async listPaymentTypes(params?: { limit?: number; cursor?: string }): Promise<any> {
    let response = await this.axios.get('/payment_types', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async getPaymentType(paymentTypeId: string): Promise<any> {
    let response = await this.axios.get(`/payment_types/${paymentTypeId}`);
    return response.data;
  }

  // ── Employees ─────────────────────────────────────────────

  async listEmployees(params?: { limit?: number; cursor?: string }): Promise<any> {
    let response = await this.axios.get('/employees', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async getEmployee(employeeId: string): Promise<any> {
    let response = await this.axios.get(`/employees/${employeeId}`);
    return response.data;
  }

  // ── Stores ────────────────────────────────────────────────

  async listStores(params?: { limit?: number; cursor?: string }): Promise<any> {
    let response = await this.axios.get('/stores', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async getStore(storeId: string): Promise<any> {
    let response = await this.axios.get(`/stores/${storeId}`);
    return response.data;
  }

  // ── Shifts ────────────────────────────────────────────────

  async listShifts(params?: {
    limit?: number;
    cursor?: string;
    storeId?: string;
    employeeId?: string;
  }): Promise<any> {
    let response = await this.axios.get('/shifts', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        store_id: params?.storeId,
        employee_id: params?.employeeId
      }
    });
    return response.data;
  }

  async getShift(shiftId: string): Promise<any> {
    let response = await this.axios.get(`/shifts/${shiftId}`);
    return response.data;
  }

  // ── POS Devices ───────────────────────────────────────────

  async listPosDevices(params?: {
    limit?: number;
    cursor?: string;
    storeId?: string;
  }): Promise<any> {
    let response = await this.axios.get('/pos_devices', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
        store_id: params?.storeId
      }
    });
    return response.data;
  }

  async getPosDevice(posDeviceId: string): Promise<any> {
    let response = await this.axios.get(`/pos_devices/${posDeviceId}`);
    return response.data;
  }

  async createOrUpdatePosDevice(data: any): Promise<any> {
    let response = await this.axios.post('/pos_devices', data);
    return response.data;
  }

  async deletePosDevice(posDeviceId: string): Promise<void> {
    await this.axios.delete(`/pos_devices/${posDeviceId}`);
  }

  // ── Suppliers ─────────────────────────────────────────────

  async listSuppliers(params?: { limit?: number; cursor?: string }): Promise<any> {
    let response = await this.axios.get('/suppliers', {
      params: {
        limit: params?.limit,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async getSupplier(supplierId: string): Promise<any> {
    let response = await this.axios.get(`/suppliers/${supplierId}`);
    return response.data;
  }

  async createOrUpdateSupplier(data: any): Promise<any> {
    let response = await this.axios.post('/suppliers', data);
    return response.data;
  }

  async deleteSupplier(supplierId: string): Promise<void> {
    await this.axios.delete(`/suppliers/${supplierId}`);
  }

  // ── Webhooks ──────────────────────────────────────────────

  async listWebhooks(): Promise<any> {
    let response = await this.axios.get('/webhooks/');
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(data: { url: string; types: string[] }): Promise<any> {
    let response = await this.axios.post('/webhooks/', data);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }
}
