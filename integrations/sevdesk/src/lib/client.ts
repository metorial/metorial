import { createAxios } from 'slates';

export class SevdeskClient {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://my.sevdesk.de/api/v1',
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Contacts ──────────────────────────────────────────────────────────

  async listContacts(params?: {
    depth?: number;
    customerNumber?: string;
    name?: string;
    limit?: number;
    offset?: number;
    embed?: string;
  }) {
    let response = await this.axios.get('/Contact', { params });
    return response.data?.objects ?? [];
  }

  async getContact(contactId: string, params?: { embed?: string }) {
    let response = await this.axios.get(`/Contact/${contactId}`, { params });
    return response.data?.objects?.[0] ?? response.data;
  }

  async createContact(data: Record<string, any>) {
    let response = await this.axios.post('/Contact', data);
    return response.data?.objects ?? response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/Contact/${contactId}`, data);
    return response.data?.objects ?? response.data;
  }

  async deleteContact(contactId: string) {
    await this.axios.delete(`/Contact/${contactId}`);
  }

  async checkCustomerNumberAvailability(customerNumber: string) {
    let response = await this.axios.get('/Contact/Mapper/checkCustomerNumberAvailability', {
      params: { customerNumber }
    });
    return response.data;
  }

  async getNextCustomerNumber() {
    let response = await this.axios.get('/Contact/Factory/getNextCustomerNumber');
    return response.data?.objects ?? response.data;
  }

  // ── Contact Addresses ─────────────────────────────────────────────────

  async listContactAddresses(params?: {
    'contact[id]'?: string;
    'contact[objectName]'?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/ContactAddress', { params });
    return response.data?.objects ?? [];
  }

  async createContactAddress(data: Record<string, any>) {
    let response = await this.axios.post('/ContactAddress', data);
    return response.data?.objects ?? response.data;
  }

  async updateContactAddress(addressId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/ContactAddress/${addressId}`, data);
    return response.data?.objects ?? response.data;
  }

  async deleteContactAddress(addressId: string) {
    await this.axios.delete(`/ContactAddress/${addressId}`);
  }

  // ── Communication Ways ────────────────────────────────────────────────

  async listCommunicationWays(params?: {
    'contact[id]'?: string;
    'contact[objectName]'?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/CommunicationWay', { params });
    return response.data?.objects ?? [];
  }

  async createCommunicationWay(data: Record<string, any>) {
    let response = await this.axios.post('/CommunicationWay', data);
    return response.data?.objects ?? response.data;
  }

  async updateCommunicationWay(communicationWayId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/CommunicationWay/${communicationWayId}`, data);
    return response.data?.objects ?? response.data;
  }

  async deleteCommunicationWay(communicationWayId: string) {
    await this.axios.delete(`/CommunicationWay/${communicationWayId}`);
  }

  // ── Invoices ──────────────────────────────────────────────────────────

  async listInvoices(params?: {
    status?: string;
    invoiceNumber?: string;
    startDate?: string;
    endDate?: string;
    'contact[id]'?: string;
    'contact[objectName]'?: string;
    limit?: number;
    offset?: number;
    embed?: string;
  }) {
    let response = await this.axios.get('/Invoice', { params });
    return response.data?.objects ?? [];
  }

  async getInvoice(invoiceId: string, params?: { embed?: string }) {
    let response = await this.axios.get(`/Invoice/${invoiceId}`, { params });
    return response.data?.objects?.[0] ?? response.data;
  }

  async createInvoice(data: Record<string, any>) {
    let response = await this.axios.post('/Invoice/Factory/saveInvoice', data);
    return response.data?.objects ?? response.data;
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/Invoice/${invoiceId}`, data);
    return response.data?.objects ?? response.data;
  }

  async deleteInvoice(invoiceId: string) {
    await this.axios.delete(`/Invoice/${invoiceId}`);
  }

  async cancelInvoice(invoiceId: string) {
    let response = await this.axios.post(`/Invoice/${invoiceId}/cancelInvoice`);
    return response.data?.objects ?? response.data;
  }

  async sendInvoiceViaEmail(
    invoiceId: string,
    data: {
      toEmail: string;
      subject: string;
      text: string;
      copy?: boolean;
      additionalAttachments?: string;
      ccEmail?: string;
      bccEmail?: string;
    }
  ) {
    let response = await this.axios.post(`/Invoice/${invoiceId}/sendViaEmail`, data);
    return response.data?.objects ?? response.data;
  }

  async sendInvoiceBy(invoiceId: string, sendType: string, sendDraft?: boolean) {
    let response = await this.axios.post(`/Invoice/${invoiceId}/sendBy`, {
      sendType,
      sendDraft: sendDraft ?? false
    });
    return response.data?.objects ?? response.data;
  }

  async bookInvoice(
    invoiceId: string,
    data: {
      amount: number;
      date: string;
      type: string;
      checkAccount: { id: string; objectName: string };
      checkAccountTransaction?: { id: string; objectName: string };
    }
  ) {
    let response = await this.axios.put(`/Invoice/${invoiceId}/bookAmount`, data);
    return response.data?.objects ?? response.data;
  }

  async getInvoicePdf(invoiceId: string) {
    let response = await this.axios.get(`/Invoice/${invoiceId}/getPdf`);
    return response.data;
  }

  async resetInvoiceToDraft(invoiceId: string) {
    let response = await this.axios.post(`/Invoice/${invoiceId}/resetToDraft`);
    return response.data?.objects ?? response.data;
  }

  async resetInvoiceToOpen(invoiceId: string) {
    let response = await this.axios.post(`/Invoice/${invoiceId}/resetToOpen`);
    return response.data?.objects ?? response.data;
  }

  async enshrineInvoice(invoiceId: string) {
    let response = await this.axios.post(`/Invoice/${invoiceId}/enshrine`);
    return response.data?.objects ?? response.data;
  }

  async createInvoiceFromOrder(orderId: string) {
    let response = await this.axios.post('/Invoice/Factory/createInvoiceFromOrder', {
      order: { id: orderId, objectName: 'Order' }
    });
    return response.data?.objects ?? response.data;
  }

  // ── Invoice Positions ─────────────────────────────────────────────────

  async listInvoicePositions(params?: {
    'invoice[id]'?: string;
    'invoice[objectName]'?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/InvoicePos', { params });
    return response.data?.objects ?? [];
  }

  // ── Credit Notes ──────────────────────────────────────────────────────

  async listCreditNotes(params?: {
    status?: string;
    creditNoteNumber?: string;
    'contact[id]'?: string;
    'contact[objectName]'?: string;
    limit?: number;
    offset?: number;
    embed?: string;
  }) {
    let response = await this.axios.get('/CreditNote', { params });
    return response.data?.objects ?? [];
  }

  async getCreditNote(creditNoteId: string, params?: { embed?: string }) {
    let response = await this.axios.get(`/CreditNote/${creditNoteId}`, { params });
    return response.data?.objects?.[0] ?? response.data;
  }

  async createCreditNoteFromInvoice(invoiceId: string) {
    let response = await this.axios.post('/CreditNote/Factory/createFromInvoice', {
      invoice: { id: invoiceId, objectName: 'Invoice' }
    });
    return response.data?.objects ?? response.data;
  }

  async bookCreditNote(
    creditNoteId: string,
    data: {
      amount: number;
      date: string;
      type: string;
      checkAccount: { id: string; objectName: string };
    }
  ) {
    let response = await this.axios.put(`/CreditNote/${creditNoteId}/bookAmount`, data);
    return response.data?.objects ?? response.data;
  }

  // ── Vouchers ──────────────────────────────────────────────────────────

  async listVouchers(params?: {
    status?: string;
    'supplier[id]'?: string;
    'supplier[objectName]'?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    embed?: string;
  }) {
    let response = await this.axios.get('/Voucher', { params });
    return response.data?.objects ?? [];
  }

  async getVoucher(voucherId: string, params?: { embed?: string }) {
    let response = await this.axios.get(`/Voucher/${voucherId}`, { params });
    return response.data?.objects?.[0] ?? response.data;
  }

  async createVoucher(data: Record<string, any>) {
    let response = await this.axios.post('/Voucher/Factory/saveVoucher', data);
    return response.data?.objects ?? response.data;
  }

  async updateVoucher(voucherId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/Voucher/${voucherId}`, data);
    return response.data?.objects ?? response.data;
  }

  async bookVoucher(
    voucherId: string,
    data: {
      amount: number;
      date: string;
      type: string;
      checkAccount: { id: string; objectName: string };
    }
  ) {
    let response = await this.axios.put(`/Voucher/${voucherId}/bookAmount`, data);
    return response.data?.objects ?? response.data;
  }

  async enshrineVoucher(voucherId: string) {
    let response = await this.axios.post(`/Voucher/${voucherId}/enshrine`);
    return response.data?.objects ?? response.data;
  }

  async getReceiptGuidance(params?: { forExpense?: boolean; forRevenue?: boolean }) {
    let response = await this.axios.get('/Voucher/Factory/getReceiptGuidance', { params });
    return response.data?.objects ?? response.data;
  }

  // ── Voucher Positions ─────────────────────────────────────────────────

  async listVoucherPositions(params?: {
    'voucher[id]'?: string;
    'voucher[objectName]'?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/VoucherPos', { params });
    return response.data?.objects ?? [];
  }

  // ── Orders ────────────────────────────────────────────────────────────

  async listOrders(params?: {
    status?: string;
    orderNumber?: string;
    'contact[id]'?: string;
    'contact[objectName]'?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    embed?: string;
  }) {
    let response = await this.axios.get('/Order', { params });
    return response.data?.objects ?? [];
  }

  async getOrder(orderId: string, params?: { embed?: string }) {
    let response = await this.axios.get(`/Order/${orderId}`, { params });
    return response.data?.objects?.[0] ?? response.data;
  }

  async createOrder(data: Record<string, any>) {
    let response = await this.axios.post('/Order', data);
    return response.data?.objects ?? response.data;
  }

  async updateOrder(orderId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/Order/${orderId}`, data);
    return response.data?.objects ?? response.data;
  }

  async deleteOrder(orderId: string) {
    await this.axios.delete(`/Order/${orderId}`);
  }

  async sendOrderViaEmail(
    orderId: string,
    data: {
      toEmail: string;
      subject: string;
      text: string;
      copy?: boolean;
      additionalAttachments?: string;
      ccEmail?: string;
      bccEmail?: string;
    }
  ) {
    let response = await this.axios.post(`/Order/${orderId}/sendViaEmail`, data);
    return response.data?.objects ?? response.data;
  }

  // ── Order Positions ───────────────────────────────────────────────────

  async listOrderPositions(params?: {
    'order[id]'?: string;
    'order[objectName]'?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/OrderPos', { params });
    return response.data?.objects ?? [];
  }

  // ── Parts (Inventory) ─────────────────────────────────────────────────

  async listParts(params?: {
    name?: string;
    partNumber?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/Part', { params });
    return response.data?.objects ?? [];
  }

  async getPart(partId: string) {
    let response = await this.axios.get(`/Part/${partId}`);
    return response.data?.objects?.[0] ?? response.data;
  }

  async createPart(data: Record<string, any>) {
    let response = await this.axios.post('/Part', data);
    return response.data?.objects ?? response.data;
  }

  async updatePart(partId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/Part/${partId}`, data);
    return response.data?.objects ?? response.data;
  }

  async deletePart(partId: string) {
    await this.axios.delete(`/Part/${partId}`);
  }

  async getPartStock(partId: string) {
    let response = await this.axios.get(`/Part/${partId}/getStock`);
    return response.data;
  }

  // ── Accounting Contacts ───────────────────────────────────────────────

  async listAccountingContacts(params?: {
    'contact[id]'?: string;
    'contact[objectName]'?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/AccountingContact', { params });
    return response.data?.objects ?? [];
  }

  async createAccountingContact(data: Record<string, any>) {
    let response = await this.axios.post('/AccountingContact', data);
    return response.data?.objects ?? response.data;
  }

  async updateAccountingContact(accountingContactId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/AccountingContact/${accountingContactId}`, data);
    return response.data?.objects ?? response.data;
  }

  // ── DATEV Export ──────────────────────────────────────────────────────

  async exportDatev(params: {
    startDate: string;
    endDate: string;
    scope: string;
    download?: boolean;
  }) {
    let response = await this.axios.get('/Export/datevCSV', { params });
    return response.data;
  }

  // ── Check Accounts ────────────────────────────────────────────────────

  async listCheckAccounts(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/CheckAccount', { params });
    return response.data?.objects ?? [];
  }

  // ── Categories ────────────────────────────────────────────────────────

  async listCategories(params?: { objectType?: string; limit?: number; offset?: number }) {
    let response = await this.axios.get('/Category', { params });
    return response.data?.objects ?? [];
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  async getBookkeepingSystemVersion() {
    let response = await this.axios.get('/Tools/bookkeepingSystemVersion');
    return response.data;
  }
}
