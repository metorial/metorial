import { createAxios } from 'slates';

export class ZohoInventoryClient {
  private http: ReturnType<typeof createAxios>;
  private organizationId: string;

  constructor(config: { token: string; organizationId: string; dataCenterDomain: string }) {
    let baseURL = `https://www.zohoapis.${config.dataCenterDomain}/inventory/v1`;

    this.organizationId = config.organizationId;
    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Zoho-oauthtoken ${config.token}`
      },
      params: {
        organization_id: config.organizationId
      }
    });
  }

  // ─── Organizations ────────────────────────────────────────────

  async listOrganizations() {
    let response = await this.http.get('/organizations');
    return response.data;
  }

  // ─── Items ────────────────────────────────────────────────────

  async listItems(
    params: {
      page?: number;
      per_page?: number;
      sort_column?: string;
      sort_order?: string;
      search_text?: string;
      filter_by?: string;
    } = {}
  ) {
    let response = await this.http.get('/items', { params });
    return response.data;
  }

  async getItem(itemId: string) {
    let response = await this.http.get(`/items/${itemId}`);
    return response.data;
  }

  async createItem(data: Record<string, any>) {
    let response = await this.http.post('/items', data);
    return response.data;
  }

  async updateItem(itemId: string, data: Record<string, any>) {
    let response = await this.http.put(`/items/${itemId}`, data);
    return response.data;
  }

  async deleteItem(itemId: string) {
    let response = await this.http.delete(`/items/${itemId}`);
    return response.data;
  }

  async markItemActive(itemId: string) {
    let response = await this.http.post(`/items/${itemId}/active`);
    return response.data;
  }

  async markItemInactive(itemId: string) {
    let response = await this.http.post(`/items/${itemId}/inactive`);
    return response.data;
  }

  // ─── Item Groups ──────────────────────────────────────────────

  async listItemGroups(params: { page?: number; per_page?: number } = {}) {
    let response = await this.http.get('/itemgroups', { params });
    return response.data;
  }

  async getItemGroup(groupId: string) {
    let response = await this.http.get(`/itemgroups/${groupId}`);
    return response.data;
  }

  async createItemGroup(data: Record<string, any>) {
    let response = await this.http.post('/itemgroups', data);
    return response.data;
  }

  async updateItemGroup(groupId: string, data: Record<string, any>) {
    let response = await this.http.put(`/itemgroups/${groupId}`, data);
    return response.data;
  }

  async deleteItemGroup(groupId: string) {
    let response = await this.http.delete(`/itemgroups/${groupId}`);
    return response.data;
  }

  // ─── Composite Items ──────────────────────────────────────────

  async listCompositeItems(params: { page?: number; per_page?: number } = {}) {
    let response = await this.http.get('/compositeitems', { params });
    return response.data;
  }

  async getCompositeItem(compositeItemId: string) {
    let response = await this.http.get(`/compositeitems/${compositeItemId}`);
    return response.data;
  }

  async createCompositeItem(data: Record<string, any>) {
    let response = await this.http.post('/compositeitems', data);
    return response.data;
  }

  async updateCompositeItem(compositeItemId: string, data: Record<string, any>) {
    let response = await this.http.put(`/compositeitems/${compositeItemId}`, data);
    return response.data;
  }

  async deleteCompositeItem(compositeItemId: string) {
    let response = await this.http.delete(`/compositeitems/${compositeItemId}`);
    return response.data;
  }

  // ─── Inventory Adjustments ────────────────────────────────────

  async listInventoryAdjustments(
    params: {
      page?: number;
      per_page?: number;
      sort_column?: string;
      sort_order?: string;
    } = {}
  ) {
    let response = await this.http.get('/inventoryadjustments', { params });
    return response.data;
  }

  async getInventoryAdjustment(adjustmentId: string) {
    let response = await this.http.get(`/inventoryadjustments/${adjustmentId}`);
    return response.data;
  }

  async createInventoryAdjustment(data: Record<string, any>) {
    let response = await this.http.post('/inventoryadjustments', data);
    return response.data;
  }

  async deleteInventoryAdjustment(adjustmentId: string) {
    let response = await this.http.delete(`/inventoryadjustments/${adjustmentId}`);
    return response.data;
  }

  // ─── Transfer Orders ──────────────────────────────────────────

  async listTransferOrders(params: { page?: number; per_page?: number } = {}) {
    let response = await this.http.get('/transferorders', { params });
    return response.data;
  }

  async getTransferOrder(transferOrderId: string) {
    let response = await this.http.get(`/transferorders/${transferOrderId}`);
    return response.data;
  }

  async createTransferOrder(data: Record<string, any>) {
    let response = await this.http.post('/transferorders', data);
    return response.data;
  }

  async updateTransferOrder(transferOrderId: string, data: Record<string, any>) {
    let response = await this.http.put(`/transferorders/${transferOrderId}`, data);
    return response.data;
  }

  async deleteTransferOrder(transferOrderId: string) {
    let response = await this.http.delete(`/transferorders/${transferOrderId}`);
    return response.data;
  }

  async markTransferOrderReceived(transferOrderId: string) {
    let response = await this.http.post(`/transferorders/${transferOrderId}/receive`);
    return response.data;
  }

  // ─── Contacts ─────────────────────────────────────────────────

  async listContacts(
    params: {
      page?: number;
      per_page?: number;
      sort_column?: string;
      sort_order?: string;
      search_text?: string;
      filter_by?: string;
      contact_type?: string;
    } = {}
  ) {
    let response = await this.http.get('/contacts', { params });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.http.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: Record<string, any>) {
    let response = await this.http.post('/contacts', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    let response = await this.http.put(`/contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.http.delete(`/contacts/${contactId}`);
    return response.data;
  }

  async markContactActive(contactId: string) {
    let response = await this.http.post(`/contacts/${contactId}/active`);
    return response.data;
  }

  async markContactInactive(contactId: string) {
    let response = await this.http.post(`/contacts/${contactId}/inactive`);
    return response.data;
  }

  // ─── Contact Persons ──────────────────────────────────────────

  async listContactPersons(contactId: string) {
    let response = await this.http.get(`/contacts/${contactId}/contactpersons`);
    return response.data;
  }

  async createContactPerson(contactId: string, data: Record<string, any>) {
    let response = await this.http.post(`/contacts/${contactId}/contactpersons`, data);
    return response.data;
  }

  async updateContactPerson(
    contactId: string,
    contactPersonId: string,
    data: Record<string, any>
  ) {
    let response = await this.http.put(
      `/contacts/${contactId}/contactpersons/${contactPersonId}`,
      data
    );
    return response.data;
  }

  async deleteContactPerson(contactId: string, contactPersonId: string) {
    let response = await this.http.delete(
      `/contacts/${contactId}/contactpersons/${contactPersonId}`
    );
    return response.data;
  }

  // ─── Sales Orders ─────────────────────────────────────────────

  async listSalesOrders(
    params: {
      page?: number;
      per_page?: number;
      sort_column?: string;
      sort_order?: string;
      search_text?: string;
      filter_by?: string;
      customer_id?: string;
    } = {}
  ) {
    let response = await this.http.get('/salesorders', { params });
    return response.data;
  }

  async getSalesOrder(salesOrderId: string) {
    let response = await this.http.get(`/salesorders/${salesOrderId}`);
    return response.data;
  }

  async createSalesOrder(data: Record<string, any>) {
    let response = await this.http.post('/salesorders', data);
    return response.data;
  }

  async updateSalesOrder(salesOrderId: string, data: Record<string, any>) {
    let response = await this.http.put(`/salesorders/${salesOrderId}`, data);
    return response.data;
  }

  async deleteSalesOrder(salesOrderId: string) {
    let response = await this.http.delete(`/salesorders/${salesOrderId}`);
    return response.data;
  }

  async confirmSalesOrder(salesOrderId: string) {
    let response = await this.http.post(`/salesorders/${salesOrderId}/status/confirmed`);
    return response.data;
  }

  async voidSalesOrder(salesOrderId: string) {
    let response = await this.http.post(`/salesorders/${salesOrderId}/status/void`);
    return response.data;
  }

  // ─── Packages ─────────────────────────────────────────────────

  async listPackages(
    params: { page?: number; per_page?: number; salesorder_id?: string } = {}
  ) {
    let response = await this.http.get('/packages', { params });
    return response.data;
  }

  async getPackage(packageId: string) {
    let response = await this.http.get(`/packages/${packageId}`);
    return response.data;
  }

  async createPackage(salesOrderId: string, data: Record<string, any>) {
    let response = await this.http.post(`/packages`, {
      ...data,
      salesorder_id: salesOrderId
    });
    return response.data;
  }

  async deletePackage(packageId: string) {
    let response = await this.http.delete(`/packages/${packageId}`);
    return response.data;
  }

  // ─── Shipment Orders ──────────────────────────────────────────

  async listShipmentOrders(
    params: { page?: number; per_page?: number; salesorder_id?: string } = {}
  ) {
    let response = await this.http.get('/shipmentorders', { params });
    return response.data;
  }

  async getShipmentOrder(shipmentOrderId: string) {
    let response = await this.http.get(`/shipmentorders/${shipmentOrderId}`);
    return response.data;
  }

  async createShipmentOrder(data: Record<string, any>) {
    let response = await this.http.post('/shipmentorders', data);
    return response.data;
  }

  async deleteShipmentOrder(shipmentOrderId: string) {
    let response = await this.http.delete(`/shipmentorders/${shipmentOrderId}`);
    return response.data;
  }

  async markShipmentDelivered(shipmentOrderId: string) {
    let response = await this.http.post(`/shipmentorders/${shipmentOrderId}/status/delivered`);
    return response.data;
  }

  // ─── Invoices ─────────────────────────────────────────────────

  async listInvoices(
    params: {
      page?: number;
      per_page?: number;
      sort_column?: string;
      sort_order?: string;
      search_text?: string;
      filter_by?: string;
      customer_id?: string;
    } = {}
  ) {
    let response = await this.http.get('/invoices', { params });
    return response.data;
  }

  async getInvoice(invoiceId: string) {
    let response = await this.http.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  async createInvoice(data: Record<string, any>) {
    let response = await this.http.post('/invoices', data);
    return response.data;
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>) {
    let response = await this.http.put(`/invoices/${invoiceId}`, data);
    return response.data;
  }

  async deleteInvoice(invoiceId: string) {
    let response = await this.http.delete(`/invoices/${invoiceId}`);
    return response.data;
  }

  async markInvoiceSent(invoiceId: string) {
    let response = await this.http.post(`/invoices/${invoiceId}/status/sent`);
    return response.data;
  }

  async voidInvoice(invoiceId: string) {
    let response = await this.http.post(`/invoices/${invoiceId}/status/void`);
    return response.data;
  }

  async emailInvoice(invoiceId: string, data: Record<string, any>) {
    let response = await this.http.post(`/invoices/${invoiceId}/email`, data);
    return response.data;
  }

  // ─── Customer Payments ────────────────────────────────────────

  async listCustomerPayments(
    params: {
      page?: number;
      per_page?: number;
      customer_id?: string;
      filter_by?: string;
      sort_column?: string;
      sort_order?: string;
    } = {}
  ) {
    let response = await this.http.get('/customerpayments', { params });
    return response.data;
  }

  async getCustomerPayment(paymentId: string) {
    let response = await this.http.get(`/customerpayments/${paymentId}`);
    return response.data;
  }

  async createCustomerPayment(data: Record<string, any>) {
    let response = await this.http.post('/customerpayments', data);
    return response.data;
  }

  async updateCustomerPayment(paymentId: string, data: Record<string, any>) {
    let response = await this.http.put(`/customerpayments/${paymentId}`, data);
    return response.data;
  }

  async deleteCustomerPayment(paymentId: string) {
    let response = await this.http.delete(`/customerpayments/${paymentId}`);
    return response.data;
  }

  // ─── Sales Returns ────────────────────────────────────────────

  async listSalesReturns(params: { page?: number; per_page?: number } = {}) {
    let response = await this.http.get('/salesreturns', { params });
    return response.data;
  }

  async getSalesReturn(salesReturnId: string) {
    let response = await this.http.get(`/salesreturns/${salesReturnId}`);
    return response.data;
  }

  async createSalesReturn(data: Record<string, any>) {
    let response = await this.http.post('/salesreturns', data);
    return response.data;
  }

  async deleteSalesReturn(salesReturnId: string) {
    let response = await this.http.delete(`/salesreturns/${salesReturnId}`);
    return response.data;
  }

  // ─── Credit Notes ─────────────────────────────────────────────

  async listCreditNotes(
    params: {
      page?: number;
      per_page?: number;
      customer_id?: string;
      filter_by?: string;
      sort_column?: string;
      sort_order?: string;
    } = {}
  ) {
    let response = await this.http.get('/creditnotes', { params });
    return response.data;
  }

  async getCreditNote(creditNoteId: string) {
    let response = await this.http.get(`/creditnotes/${creditNoteId}`);
    return response.data;
  }

  async createCreditNote(data: Record<string, any>) {
    let response = await this.http.post('/creditnotes', data);
    return response.data;
  }

  async updateCreditNote(creditNoteId: string, data: Record<string, any>) {
    let response = await this.http.put(`/creditnotes/${creditNoteId}`, data);
    return response.data;
  }

  async deleteCreditNote(creditNoteId: string) {
    let response = await this.http.delete(`/creditnotes/${creditNoteId}`);
    return response.data;
  }

  async applyCreditToInvoice(
    creditNoteId: string,
    data: { invoices: Array<{ invoice_id: string; amount_applied: number }> }
  ) {
    let response = await this.http.post(`/creditnotes/${creditNoteId}/invoices`, data);
    return response.data;
  }

  // ─── Purchase Orders ──────────────────────────────────────────

  async listPurchaseOrders(
    params: {
      page?: number;
      per_page?: number;
      sort_column?: string;
      sort_order?: string;
      search_text?: string;
      filter_by?: string;
      vendor_id?: string;
    } = {}
  ) {
    let response = await this.http.get('/purchaseorders', { params });
    return response.data;
  }

  async getPurchaseOrder(purchaseOrderId: string) {
    let response = await this.http.get(`/purchaseorders/${purchaseOrderId}`);
    return response.data;
  }

  async createPurchaseOrder(data: Record<string, any>) {
    let response = await this.http.post('/purchaseorders', data);
    return response.data;
  }

  async updatePurchaseOrder(purchaseOrderId: string, data: Record<string, any>) {
    let response = await this.http.put(`/purchaseorders/${purchaseOrderId}`, data);
    return response.data;
  }

  async deletePurchaseOrder(purchaseOrderId: string) {
    let response = await this.http.delete(`/purchaseorders/${purchaseOrderId}`);
    return response.data;
  }

  async markPurchaseOrderIssued(purchaseOrderId: string) {
    let response = await this.http.post(`/purchaseorders/${purchaseOrderId}/status/issued`);
    return response.data;
  }

  async cancelPurchaseOrder(purchaseOrderId: string) {
    let response = await this.http.post(`/purchaseorders/${purchaseOrderId}/status/cancelled`);
    return response.data;
  }

  // ─── Purchase Receives ────────────────────────────────────────

  async listPurchaseReceives(
    params: { page?: number; per_page?: number; purchaseorder_id?: string } = {}
  ) {
    let response = await this.http.get('/purchasereceives', { params });
    return response.data;
  }

  async getPurchaseReceive(purchaseReceiveId: string) {
    let response = await this.http.get(`/purchasereceives/${purchaseReceiveId}`);
    return response.data;
  }

  async createPurchaseReceive(data: Record<string, any>) {
    let response = await this.http.post('/purchasereceives', data);
    return response.data;
  }

  async deletePurchaseReceive(purchaseReceiveId: string) {
    let response = await this.http.delete(`/purchasereceives/${purchaseReceiveId}`);
    return response.data;
  }

  // ─── Bills ────────────────────────────────────────────────────

  async listBills(
    params: {
      page?: number;
      per_page?: number;
      sort_column?: string;
      sort_order?: string;
      search_text?: string;
      filter_by?: string;
      vendor_id?: string;
    } = {}
  ) {
    let response = await this.http.get('/bills', { params });
    return response.data;
  }

  async getBill(billId: string) {
    let response = await this.http.get(`/bills/${billId}`);
    return response.data;
  }

  async createBill(data: Record<string, any>) {
    let response = await this.http.post('/bills', data);
    return response.data;
  }

  async updateBill(billId: string, data: Record<string, any>) {
    let response = await this.http.put(`/bills/${billId}`, data);
    return response.data;
  }

  async deleteBill(billId: string) {
    let response = await this.http.delete(`/bills/${billId}`);
    return response.data;
  }

  async voidBill(billId: string) {
    let response = await this.http.post(`/bills/${billId}/status/void`);
    return response.data;
  }

  async markBillOpen(billId: string) {
    let response = await this.http.post(`/bills/${billId}/status/open`);
    return response.data;
  }

  // ─── Vendor Credits ───────────────────────────────────────────

  async listVendorCredits(
    params: { page?: number; per_page?: number; vendor_id?: string } = {}
  ) {
    let response = await this.http.get('/vendorcredits', { params });
    return response.data;
  }

  async getVendorCredit(vendorCreditId: string) {
    let response = await this.http.get(`/vendorcredits/${vendorCreditId}`);
    return response.data;
  }

  async createVendorCredit(data: Record<string, any>) {
    let response = await this.http.post('/vendorcredits', data);
    return response.data;
  }

  async updateVendorCredit(vendorCreditId: string, data: Record<string, any>) {
    let response = await this.http.put(`/vendorcredits/${vendorCreditId}`, data);
    return response.data;
  }

  async deleteVendorCredit(vendorCreditId: string) {
    let response = await this.http.delete(`/vendorcredits/${vendorCreditId}`);
    return response.data;
  }

  // ─── Price Lists ──────────────────────────────────────────────

  async listPriceLists(params: { page?: number; per_page?: number } = {}) {
    let response = await this.http.get('/pricelists', { params });
    return response.data;
  }

  async getPriceList(priceListId: string) {
    let response = await this.http.get(`/pricelists/${priceListId}`);
    return response.data;
  }

  async createPriceList(data: Record<string, any>) {
    let response = await this.http.post('/pricelists', data);
    return response.data;
  }

  async updatePriceList(priceListId: string, data: Record<string, any>) {
    let response = await this.http.put(`/pricelists/${priceListId}`, data);
    return response.data;
  }

  async deletePriceList(priceListId: string) {
    let response = await this.http.delete(`/pricelists/${priceListId}`);
    return response.data;
  }

  // ─── Taxes ────────────────────────────────────────────────────

  async listTaxes() {
    let response = await this.http.get('/settings/taxes');
    return response.data;
  }

  async getTax(taxId: string) {
    let response = await this.http.get(`/settings/taxes/${taxId}`);
    return response.data;
  }

  async createTax(data: Record<string, any>) {
    let response = await this.http.post('/settings/taxes', data);
    return response.data;
  }

  async updateTax(taxId: string, data: Record<string, any>) {
    let response = await this.http.put(`/settings/taxes/${taxId}`, data);
    return response.data;
  }

  async deleteTax(taxId: string) {
    let response = await this.http.delete(`/settings/taxes/${taxId}`);
    return response.data;
  }

  // ─── Currencies ───────────────────────────────────────────────

  async listCurrencies() {
    let response = await this.http.get('/settings/currencies');
    return response.data;
  }

  async createCurrency(data: Record<string, any>) {
    let response = await this.http.post('/settings/currencies', data);
    return response.data;
  }

  // ─── Warehouses ───────────────────────────────────────────────

  async listWarehouses(params: { page?: number; per_page?: number } = {}) {
    let response = await this.http.get('/settings/warehouses', { params });
    return response.data;
  }

  async getWarehouse(warehouseId: string) {
    let response = await this.http.get(`/settings/warehouses/${warehouseId}`);
    return response.data;
  }

  async createWarehouse(data: Record<string, any>) {
    let response = await this.http.post('/settings/warehouses', data);
    return response.data;
  }

  async updateWarehouse(warehouseId: string, data: Record<string, any>) {
    let response = await this.http.put(`/settings/warehouses/${warehouseId}`, data);
    return response.data;
  }

  async deleteWarehouse(warehouseId: string) {
    let response = await this.http.delete(`/settings/warehouses/${warehouseId}`);
    return response.data;
  }

  // ─── Users ────────────────────────────────────────────────────

  async listUsers() {
    let response = await this.http.get('/users');
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  async getCurrentUser() {
    let response = await this.http.get('/users/me');
    return response.data;
  }
}
