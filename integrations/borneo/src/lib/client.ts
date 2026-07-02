import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  baseUrl: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        'X-API-KEY': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Scans ──────────────────────────────────────────────

  async createAndScheduleScan(params: {
    scheduleType: string;
    connectorId?: string;
    resourceType?: string;
    scanType?: string;
    resourceIds?: string[];
    inspectionPolicyId?: string;
    scanLimit?: number;
    cronExpression?: string;
    name?: string;
  }) {
    let res = await this.axios.post('/scans', params);
    return res.data;
  }

  async getScanById(scanId: string) {
    let res = await this.axios.get(`/scans/${scanId}`);
    return res.data;
  }

  async listScans(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
    status?: string;
  }) {
    let res = await this.axios.get('/scans', { params });
    return res.data;
  }

  async getScanIteration(scanIterationId: string) {
    let res = await this.axios.get(`/scan-iterations/${scanIterationId}`);
    return res.data;
  }

  async listScanIterations(params?: {
    scanId?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let res = await this.axios.get('/scan-iterations', { params });
    return res.data;
  }

  async pauseScan(scanId: string) {
    let res = await this.axios.post(`/scans/${scanId}/pause`);
    return res.data;
  }

  async resumeScan(scanId: string) {
    let res = await this.axios.post(`/scans/${scanId}/resume`);
    return res.data;
  }

  async stopScan(scanId: string) {
    let res = await this.axios.post(`/scans/${scanId}/stop`);
    return res.data;
  }

  // ── Inspection Results ─────────────────────────────────

  async listInspectionResults(params: {
    type: string;
    scanId?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let res = await this.axios.get('/inspection-results', { params });
    return res.data;
  }

  async exportInsightPage(
    scanId: string,
    params?: {
      format?: string;
      filters?: Record<string, any>;
    }
  ) {
    let res = await this.axios.post(`/scans/${scanId}/export-insights`, params);
    return res.data;
  }

  // ── Data Breaches ──────────────────────────────────────

  async createDataBreach(params: {
    name?: string;
    description?: string;
    status?: string;
    severity?: string;
    breachDate?: string;
    discoveryDate?: string;
    notificationDate?: string;
    affectedDataSubjects?: number;
    affectedDataTypes?: string[];
    breachType?: string;
    [key: string]: any;
  }) {
    let res = await this.axios.post('/data-breaches', params);
    return res.data;
  }

  async getDataBreach(breachId: string) {
    let res = await this.axios.get(`/data-breaches/${breachId}`);
    return res.data;
  }

  async listDataBreaches(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
    status?: string;
  }) {
    let res = await this.axios.get('/data-breaches', { params });
    return res.data;
  }

  async updateDataBreach(breachId: string, params: Record<string, any>) {
    let res = await this.axios.put(`/data-breaches/${breachId}`, params);
    return res.data;
  }

  async deleteDataBreach(breachId: string) {
    let res = await this.axios.delete(`/data-breaches/${breachId}`);
    return res.data;
  }

  async evaluateDataBreachImpact(params: {
    breachId?: string;
    name?: string;
    description?: string;
    isDraft?: boolean;
    [key: string]: any;
  }) {
    let res = await this.axios.post('/data-breaches/evaluate', params);
    return res.data;
  }

  // ── Employees ──────────────────────────────────────────

  async createEmployee(params: {
    name: string;
    surname: string;
    createdBy: string;
    email?: string;
    department?: string;
    position?: string;
    referenceId?: string;
    [key: string]: any;
  }) {
    let res = await this.axios.post('/employees', params);
    return res.data;
  }

  async getEmployee(employeeId: string) {
    let res = await this.axios.get(`/employees/${employeeId}`);
    return res.data;
  }

  async listEmployees(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
    search?: string;
  }) {
    let res = await this.axios.get('/employees', { params });
    return res.data;
  }

  async updateEmployee(employeeId: string, params: Record<string, any>) {
    let res = await this.axios.put(`/employees/${employeeId}`, params);
    return res.data;
  }

  async deleteEmployee(employeeId: string) {
    let res = await this.axios.delete(`/employees/${employeeId}`);
    return res.data;
  }

  // ── Departments ────────────────────────────────────────

  async createDepartment(params: { name: string; translations?: Record<string, string> }) {
    let res = await this.axios.post('/departments', params);
    return res.data;
  }

  async listDepartments(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let res = await this.axios.get('/departments', { params });
    return res.data;
  }

  async updateDepartment(departmentId: string, params: { name: string }) {
    let res = await this.axios.put(`/departments/${departmentId}`, params);
    return res.data;
  }

  async deleteDepartment(departmentId: string) {
    let res = await this.axios.delete(`/departments/${departmentId}`);
    return res.data;
  }

  // ── Headquarters ───────────────────────────────────────

  async createHeadquarter(params: {
    name: string;
    address: string;
    city: string;
    country: string;
  }) {
    let res = await this.axios.post('/headquarters', params);
    return res.data;
  }

  async deleteHeadquarter(headquarterId: string) {
    let res = await this.axios.delete(`/headquarters/${headquarterId}`);
    return res.data;
  }

  // ── Domains ────────────────────────────────────────────

  async createDomain(params: { name: string; frequency: string }) {
    let res = await this.axios.post('/domains', params);
    return res.data;
  }

  async listDomains(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let res = await this.axios.get('/domains', { params });
    return res.data;
  }

  async updateDomain(domainId: string, params: Record<string, any>) {
    let res = await this.axios.put(`/domains/${domainId}`, params);
    return res.data;
  }

  async deleteDomain(domainId: string) {
    let res = await this.axios.delete(`/domains/${domainId}`);
    return res.data;
  }

  // ── Dashboard Users ────────────────────────────────────

  async createDashboardUser(params: {
    email: string;
    name?: string;
    roles?: string[];
    organisations?: string[];
  }) {
    let res = await this.axios.post('/dashboard-users', params);
    return res.data;
  }

  async listDashboardUsers(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let res = await this.axios.get('/dashboard-users', { params });
    return res.data;
  }

  async enableDashboardUser(username: string) {
    let res = await this.axios.post(`/dashboard-users/${username}/enable`);
    return res.data;
  }

  async disableDashboardUser(username: string) {
    let res = await this.axios.post(`/dashboard-users/${username}/disable`);
    return res.data;
  }

  async removeDashboardUser(username: string) {
    let res = await this.axios.delete(`/dashboard-users/${username}`);
    return res.data;
  }

  // ── Processing Activities ──────────────────────────────

  async createProcessingActivity(params: {
    name: string;
    active: boolean;
    description?: string;
    retentionPolicy?: string;
    [key: string]: any;
  }) {
    let res = await this.axios.post('/processing-activities', params);
    return res.data;
  }

  async getProcessingActivity(activityId: string) {
    let res = await this.axios.get(`/processing-activities/${activityId}`);
    return res.data;
  }

  async listProcessingActivities(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let res = await this.axios.get('/processing-activities', { params });
    return res.data;
  }

  async updateProcessingActivity(activityId: string, params: Record<string, any>) {
    let res = await this.axios.put(`/processing-activities/${activityId}`, params);
    return res.data;
  }

  async deleteProcessingActivity(activityId: string) {
    let res = await this.axios.delete(`/processing-activities/${activityId}`);
    return res.data;
  }

  async exportProcessingActivities(params: { language: string; exportTypes: string[] }) {
    let res = await this.axios.post('/processing-activities/export', params);
    return res.data;
  }

  // ── DPIAs ──────────────────────────────────────────────

  async createDpia(params: {
    processingActivityId: string;
    status: string;
    confidentialityRisk?: string;
    integrityRisk?: string;
    availabilityRisk?: string;
    [key: string]: any;
  }) {
    let res = await this.axios.post('/dpias', params);
    return res.data;
  }

  async getDpia(dpiaId: string) {
    let res = await this.axios.get(`/dpias/${dpiaId}`);
    return res.data;
  }

  async updateDpia(dpiaId: string, params: Record<string, any>) {
    let res = await this.axios.put(`/dpias/${dpiaId}`, params);
    return res.data;
  }

  async deleteDpia(dpiaId: string) {
    let res = await this.axios.delete(`/dpias/${dpiaId}`);
    return res.data;
  }

  // ── Processing Activity Thresholds ─────────────────────

  async createProcessingActivityThreshold(params: {
    processingActivityId?: string;
    [key: string]: any;
  }) {
    let res = await this.axios.post('/processing-activity-thresholds', params);
    return res.data;
  }

  async deleteProcessingActivityThreshold(thresholdId: string) {
    let res = await this.axios.delete(`/processing-activity-thresholds/${thresholdId}`);
    return res.data;
  }

  // ── Recipients ─────────────────────────────────────────

  async createRecipient(params: {
    name: string;
    status: string;
    dataStorageLocation: string[];
    recipientWarranties: string;
    role?: string;
    [key: string]: any;
  }) {
    let res = await this.axios.post('/recipients', params);
    return res.data;
  }

  async getRecipient(recipientId: string) {
    let res = await this.axios.get(`/recipients/${recipientId}`);
    return res.data;
  }

  async listRecipients(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let res = await this.axios.get('/recipients', { params });
    return res.data;
  }

  async updateRecipient(recipientId: string, params: Record<string, any>) {
    let res = await this.axios.put(`/recipients/${recipientId}`, params);
    return res.data;
  }

  async deleteRecipient(recipientId: string) {
    let res = await this.axios.delete(`/recipients/${recipientId}`);
    return res.data;
  }

  async addDiscoveredRecipients(discoveredRecipientIds: string[]) {
    let res = await this.axios.post('/recipients/discovered/add', { discoveredRecipientIds });
    return res.data;
  }

  async archiveDiscoveredRecipient(recipientId: string) {
    let res = await this.axios.post(`/recipients/discovered/${recipientId}/archive`);
    return res.data;
  }

  async listDiscoveredRecipients(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let res = await this.axios.get('/recipients/discovered', { params });
    return res.data;
  }

  // ── Assets ─────────────────────────────────────────────

  async createAsset(params: {
    name: string;
    type: string;
    description?: string;
    [key: string]: any;
  }) {
    let res = await this.axios.post('/assets', params);
    return res.data;
  }

  async getAsset(assetId: string) {
    let res = await this.axios.get(`/assets/${assetId}`);
    return res.data;
  }

  async listAssets(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
    type?: string;
  }) {
    let res = await this.axios.get('/assets', { params });
    return res.data;
  }

  async updateAsset(assetId: string, params: Record<string, any>) {
    let res = await this.axios.put(`/assets/${assetId}`, params);
    return res.data;
  }

  async deleteAsset(assetId: string) {
    let res = await this.axios.delete(`/assets/${assetId}`);
    return res.data;
  }

  // ── Legal Documents ────────────────────────────────────

  async createLegalDocument(params: {
    name: string;
    documentLink: string;
    region: string;
    isDiscoverInfotype: boolean;
    [key: string]: any;
  }) {
    let res = await this.axios.post('/legal-documents', params);
    return res.data;
  }

  async deleteLegalDocument(documentId: string) {
    let res = await this.axios.delete(`/legal-documents/${documentId}`);
    return res.data;
  }

  // ── Infotype Categories ────────────────────────────────

  async createInfotypeCategory(params: { categoryLabel: string; infotypes: string[] }) {
    let res = await this.axios.post('/infotype-categories', params);
    return res.data;
  }

  async getInfotypeCategory(categoryLabel: string) {
    let res = await this.axios.get(
      `/infotype-categories/${encodeURIComponent(categoryLabel)}`
    );
    return res.data;
  }

  async listInfotypeCategories(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let res = await this.axios.get('/infotype-categories', { params });
    return res.data;
  }

  async deleteInfotypeCategory(categoryLabel: string) {
    let res = await this.axios.delete(
      `/infotype-categories/${encodeURIComponent(categoryLabel)}`
    );
    return res.data;
  }

  // ── Inventory / Resources ──────────────────────────────

  async exportInventoryResources(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
    accountId?: string;
    region?: string;
    resourceType?: string;
    tags?: string[];
    includeViolationMetrics?: boolean;
    includeFrameworkExceptionCounts?: boolean;
    fields?: string[];
  }) {
    let res = await this.axios.post('/inventory/resources/export', params);
    return res.data;
  }

  async exportFilteredLeafResources(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
    filters?: Record<string, any>;
  }) {
    let res = await this.axios.post('/inventory/leaf-resources/export', params);
    return res.data;
  }

  async getResourceStatistics() {
    let res = await this.axios.get('/resources/statistics');
    return res.data;
  }

  // ── Cloud Accounts ─────────────────────────────────────

  async getCloudAccount(accountId: string) {
    let res = await this.axios.get(`/cloud-accounts/${accountId}`);
    return res.data;
  }

  // ── Dashboard Reports ──────────────────────────────────

  async downloadDashboardReport(params: { reportType: string }) {
    let res = await this.axios.post('/dashboard-reports/download', params);
    return res.data;
  }

  async getDashboardReport(reportId: string) {
    let res = await this.axios.get(`/dashboard-reports/${reportId}`);
    return res.data;
  }

  async listDashboardReports(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let res = await this.axios.get('/dashboard-reports', { params });
    return res.data;
  }

  async deleteDashboardReport(reportId: string) {
    let res = await this.axios.delete(`/dashboard-reports/${reportId}`);
    return res.data;
  }

  // ── Events ─────────────────────────────────────────────

  async listEvents(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    let res = await this.axios.get('/events', { params });
    return res.data;
  }
}
