import { createAxios } from 'slates';

export interface CoupaQueryParams {
  offset?: number;
  limit?: number;
  orderBy?: string;
  dir?: 'asc' | 'desc';
  fields?: string[];
  returnObject?: 'shallow' | 'limited' | 'none';
  exportedFlag?: boolean;
  filters?: Record<string, string>;
}

export class CoupaClient {
  private instanceUrl: string;
  private token: string;

  constructor(config: { token: string; instanceUrl: string }) {
    this.instanceUrl = config.instanceUrl.replace(/\/+$/, '');
    this.token = config.token;
  }

  private createAxiosInstance() {
    return createAxios({
      baseURL: `${this.instanceUrl}/api`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        'X-COUPA-API-KEY': this.token
      }
    });
  }

  private buildQueryParams(params?: CoupaQueryParams): Record<string, string> {
    let query: Record<string, string> = {};

    if (!params) return query;

    if (params.offset !== undefined) query.offset = String(params.offset);
    if (params.limit !== undefined) query.limit = String(params.limit);
    if (params.orderBy) query.order_by = params.orderBy;
    if (params.dir) query.dir = params.dir;
    if (params.fields && params.fields.length > 0)
      query.fields = JSON.stringify(params.fields);
    if (params.returnObject) query.return_object = params.returnObject;
    if (params.exportedFlag !== undefined) query.exported = String(params.exportedFlag);

    if (params.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        query[key] = value;
      }
    }

    return query;
  }

  async getResource(resource: string, resourceId: number | string): Promise<any> {
    let ax = this.createAxiosInstance();
    let response = await ax.get(`/${resource}/${resourceId}`);
    return response.data;
  }

  async listResources(resource: string, params?: CoupaQueryParams): Promise<any[]> {
    let ax = this.createAxiosInstance();
    let query = this.buildQueryParams(params);
    let response = await ax.get(`/${resource}`, { params: query });
    return response.data;
  }

  async createResource(resource: string, data: any): Promise<any> {
    let ax = this.createAxiosInstance();
    let response = await ax.post(`/${resource}`, data);
    return response.data;
  }

  async updateResource(
    resource: string,
    resourceId: number | string,
    data: any
  ): Promise<any> {
    let ax = this.createAxiosInstance();
    let response = await ax.put(`/${resource}/${resourceId}`, data);
    return response.data;
  }

  async deleteResource(resource: string, resourceId: number | string): Promise<void> {
    let ax = this.createAxiosInstance();
    await ax.delete(`/${resource}/${resourceId}`);
  }

  async performAction(
    resource: string,
    resourceId: number | string,
    action: string,
    data?: any
  ): Promise<any> {
    let ax = this.createAxiosInstance();
    let response = await ax.put(`/${resource}/${resourceId}/${action}`, data || {});
    return response.data;
  }

  // Purchase Orders
  async getPurchaseOrder(orderId: number | string): Promise<any> {
    return this.getResource('purchase_orders', orderId);
  }

  async listPurchaseOrders(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('purchase_orders', params);
  }

  async createPurchaseOrder(data: any): Promise<any> {
    return this.createResource('purchase_orders', data);
  }

  async updatePurchaseOrder(orderId: number | string, data: any): Promise<any> {
    return this.updateResource('purchase_orders', orderId, data);
  }

  // Requisitions
  async getRequisition(requisitionId: number | string): Promise<any> {
    return this.getResource('requisitions', requisitionId);
  }

  async listRequisitions(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('requisitions', params);
  }

  async createRequisition(data: any): Promise<any> {
    return this.createResource('requisitions', data);
  }

  async updateRequisition(requisitionId: number | string, data: any): Promise<any> {
    return this.updateResource('requisitions', requisitionId, data);
  }

  // Invoices
  async getInvoice(invoiceId: number | string): Promise<any> {
    return this.getResource('invoices', invoiceId);
  }

  async listInvoices(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('invoices', params);
  }

  async createInvoice(data: any): Promise<any> {
    return this.createResource('invoices', data);
  }

  async updateInvoice(invoiceId: number | string, data: any): Promise<any> {
    return this.updateResource('invoices', invoiceId, data);
  }

  // Suppliers
  async getSupplier(supplierId: number | string): Promise<any> {
    return this.getResource('suppliers', supplierId);
  }

  async listSuppliers(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('suppliers', params);
  }

  async createSupplier(data: any): Promise<any> {
    return this.createResource('suppliers', data);
  }

  async updateSupplier(supplierId: number | string, data: any): Promise<any> {
    return this.updateResource('suppliers', supplierId, data);
  }

  // Expense Reports
  async getExpenseReport(reportId: number | string): Promise<any> {
    return this.getResource('expense_reports', reportId);
  }

  async listExpenseReports(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('expense_reports', params);
  }

  async createExpenseReport(data: any): Promise<any> {
    return this.createResource('expense_reports', data);
  }

  async updateExpenseReport(reportId: number | string, data: any): Promise<any> {
    return this.updateResource('expense_reports', reportId, data);
  }

  // Contracts
  async getContract(contractId: number | string): Promise<any> {
    return this.getResource('contracts', contractId);
  }

  async listContracts(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('contracts', params);
  }

  async createContract(data: any): Promise<any> {
    return this.createResource('contracts', data);
  }

  async updateContract(contractId: number | string, data: any): Promise<any> {
    return this.updateResource('contracts', contractId, data);
  }

  // Users
  async getUser(userId: number | string): Promise<any> {
    return this.getResource('users', userId);
  }

  async listUsers(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('users', params);
  }

  async createUser(data: any): Promise<any> {
    return this.createResource('users', data);
  }

  async updateUser(userId: number | string, data: any): Promise<any> {
    return this.updateResource('users', userId, data);
  }

  // Accounts
  async getAccount(accountId: number | string): Promise<any> {
    return this.getResource('accounts', accountId);
  }

  async listAccounts(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('accounts', params);
  }

  async createAccount(data: any): Promise<any> {
    return this.createResource('accounts', data);
  }

  async updateAccount(accountId: number | string, data: any): Promise<any> {
    return this.updateResource('accounts', accountId, data);
  }

  // Approvals
  async getApproval(approvalId: number | string): Promise<any> {
    return this.getResource('approvals', approvalId);
  }

  async listApprovals(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('approvals', params);
  }

  async approveApproval(approvalId: number | string, reason?: string): Promise<any> {
    return this.performAction(
      'approvals',
      approvalId,
      'approve',
      reason ? { reason } : undefined
    );
  }

  async rejectApproval(approvalId: number | string, reason: string): Promise<any> {
    return this.performAction('approvals', approvalId, 'reject', { reason });
  }

  // Budget Lines
  async listBudgetLines(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('budget_lines', params);
  }

  async createBudgetLine(data: any): Promise<any> {
    return this.createResource('budget_lines', data);
  }

  async updateBudgetLine(budgetLineId: number | string, data: any): Promise<any> {
    return this.updateResource('budget_lines', budgetLineId, data);
  }

  // Advance Ship Notices
  async getASN(asnId: number | string): Promise<any> {
    return this.getResource('asn', asnId);
  }

  async listASNs(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('asn', params);
  }

  // Receipts
  async getReceipt(receiptId: number | string): Promise<any> {
    return this.getResource('receipts', receiptId);
  }

  async listReceipts(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('receipts', params);
  }

  async createReceipt(data: any): Promise<any> {
    return this.createResource('receipts', data);
  }

  // Inventory Transactions
  async listInventoryTransactions(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('inventory_transactions', params);
  }

  // Payments
  async getPayment(paymentId: number | string): Promise<any> {
    return this.getResource('coupa_pay/payments', paymentId);
  }

  async listPayments(params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources('coupa_pay/payments', params);
  }

  // Lookups
  async listLookupValues(lookupName: string, params?: CoupaQueryParams): Promise<any[]> {
    return this.listResources(`lookup_values`, {
      ...params,
      filters: {
        ...params?.filters,
        lookup_name: lookupName
      }
    });
  }
}
