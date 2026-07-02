import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(params: {
    subdomain: string;
    email: string;
    token: string;
  }) {
    let encoded = Buffer.from(`${params.email}:${params.token}`).toString('base64');

    this.axios = createAxios({
      baseURL: `https://${params.subdomain}.simplekpi.com/api`,
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Users ---

  async listUsers() {
    let response = await this.axios.get('/users');
    return response.data;
  }

  async getUser(userId: number) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  async createUser(data: {
    user_type: string;
    user_status_id: string;
    first_name: string;
    last_name?: string;
    email: string;
    password: string;
    can_manage_users: boolean;
    can_admin_settings: boolean;
  }) {
    let response = await this.axios.post('/users', data);
    return response.data;
  }

  async updateUser(userId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: number) {
    let response = await this.axios.delete(`/users/${userId}`);
    return response.data;
  }

  // --- KPIs ---

  async listKpis() {
    let response = await this.axios.get('/kpis');
    return response.data;
  }

  async getKpi(kpiId: number) {
    let response = await this.axios.get(`/kpis/${kpiId}`);
    return response.data;
  }

  async createKpi(data: {
    category_id: number;
    icon_id: number;
    unit_id: number;
    frequency_id: string;
    name: string;
    description?: string;
    target_default?: number | null;
    value_direction: string;
    aggregate_function: string;
    sort_order: number;
    is_active: boolean;
  }) {
    let response = await this.axios.post('/kpis', data);
    return response.data;
  }

  async updateKpi(kpiId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/kpis/${kpiId}`, data);
    return response.data;
  }

  async deleteKpi(kpiId: number) {
    let response = await this.axios.delete(`/kpis/${kpiId}`);
    return response.data;
  }

  // --- KPI Categories ---

  async listKpiCategories() {
    let response = await this.axios.get('/kpicategories');
    return response.data;
  }

  async getKpiCategory(categoryId: number) {
    let response = await this.axios.get(`/kpicategories/${categoryId}`);
    return response.data;
  }

  async createKpiCategory(data: { name: string; sort_order: number }) {
    let response = await this.axios.post('/kpicategories', data);
    return response.data;
  }

  async updateKpiCategory(categoryId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/kpicategories/${categoryId}`, data);
    return response.data;
  }

  async deleteKpiCategory(categoryId: number) {
    let response = await this.axios.delete(`/kpicategories/${categoryId}`);
    return response.data;
  }

  // --- KPI Entries ---

  async listKpiEntries(params: {
    userid?: number;
    kpiid?: number;
    dateFrom?: string;
    dateTo?: string;
    rows?: number;
    page?: number;
  }) {
    let response = await this.axios.get('/kpientries', { params });
    return response.data;
  }

  async getKpiEntry(entryId: number) {
    let response = await this.axios.get(`/kpientries/${entryId}`);
    return response.data;
  }

  async createKpiEntry(data: {
    user_id?: number;
    email?: string;
    kpi_id: number;
    entry_date: string;
    actual?: number | null;
    target?: number | null;
    notes?: string | null;
    setActual?: boolean;
    setTarget?: boolean;
    setNotes?: boolean;
    addToActual?: boolean;
  }) {
    let response = await this.axios.post('/kpientries', data);
    return response.data;
  }

  async createKpiEntriesBatch(data: {
    entries: Array<{
      user_id?: number;
      email?: string;
      kpi_id: number;
      entry_date: string;
      actual?: number | null;
      target?: number | null;
      notes?: string | null;
    }>;
    hasActuals?: boolean;
    hasTargets?: boolean;
    hasNotes?: boolean;
  }) {
    let response = await this.axios.post('/kpientries/list', data);
    return response.data;
  }

  async updateKpiEntry(entryId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/kpientries/${entryId}`, data);
    return response.data;
  }

  async deleteKpiEntry(entryId: number) {
    let response = await this.axios.delete(`/kpientries/${entryId}`);
    return response.data;
  }

  // --- User KPIs ---

  async listUserKpis(userId: number) {
    let response = await this.axios.get(`/users/${userId}/kpis`);
    return response.data;
  }

  async getUserKpi(userId: number, kpiId: number) {
    let response = await this.axios.get(`/users/${userId}/kpis/${kpiId}`);
    return response.data;
  }

  async assignKpiToUser(
    userId: number,
    data: { id: number; user_target?: number | null; sort_order: number }
  ) {
    let response = await this.axios.post(`/users/${userId}/kpis`, data);
    return response.data;
  }

  async updateUserKpi(
    userId: number,
    kpiId: number,
    data: { user_target?: number | null; sort_order?: number }
  ) {
    let response = await this.axios.put(`/users/${userId}/kpis/${kpiId}`, data);
    return response.data;
  }

  async removeKpiFromUser(userId: number, kpiId: number) {
    let response = await this.axios.delete(`/users/${userId}/kpis/${kpiId}`);
    return response.data;
  }

  // --- Groups ---

  async listGroups() {
    let response = await this.axios.get('/groups');
    return response.data;
  }

  async getGroup(groupId: number) {
    let response = await this.axios.get(`/groups/${groupId}`);
    return response.data;
  }

  async createGroup(data: { name: string; sort_order: number }) {
    let response = await this.axios.post('/groups', data);
    return response.data;
  }

  async updateGroup(groupId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/groups/${groupId}`, data);
    return response.data;
  }

  async deleteGroup(groupId: number) {
    let response = await this.axios.delete(`/groups/${groupId}`);
    return response.data;
  }

  // --- Group Items ---

  async listGroupItems(groupId: number) {
    let response = await this.axios.get(`/groups/${groupId}/items`);
    return response.data;
  }

  async getGroupItem(groupId: number, itemId: number) {
    let response = await this.axios.get(`/groups/${groupId}/items/${itemId}`);
    return response.data;
  }

  async createGroupItem(groupId: number, data: { name: string; sort_order: number }) {
    let response = await this.axios.post(`/groups/${groupId}/items`, data);
    return response.data;
  }

  async updateGroupItem(groupId: number, itemId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/groups/${groupId}/items/${itemId}`, data);
    return response.data;
  }

  async deleteGroupItem(groupId: number, itemId: number) {
    let response = await this.axios.delete(`/groups/${groupId}/items/${itemId}`);
    return response.data;
  }

  // --- User Group Items ---

  async listUserGroupItems(userId: number) {
    let response = await this.axios.get(`/users/${userId}/groupitems`);
    return response.data;
  }

  async assignGroupItemToUser(userId: number, groupItemId: number) {
    let response = await this.axios.post(`/users/${userId}/groupitems`, { id: groupItemId });
    return response.data;
  }

  async removeGroupItemFromUser(userId: number, groupItemId: number) {
    let response = await this.axios.delete(`/users/${userId}/groupitems/${groupItemId}`);
    return response.data;
  }

  // --- KPI Units ---

  async listKpiUnits() {
    let response = await this.axios.get('/kpiunits');
    return response.data;
  }

  async getKpiUnit(unitId: number) {
    let response = await this.axios.get(`/kpiunits/${unitId}`);
    return response.data;
  }

  async createKpiUnit(data: {
    name: string;
    entry_format: string;
    display_format: string;
    is_percentage: boolean;
  }) {
    let response = await this.axios.post('/kpiunits', data);
    return response.data;
  }

  async updateKpiUnit(unitId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/kpiunits/${unitId}`, data);
    return response.data;
  }

  async deleteKpiUnit(unitId: number) {
    let response = await this.axios.delete(`/kpiunits/${unitId}`);
    return response.data;
  }

  // --- KPI Frequencies (Read-Only) ---

  async listKpiFrequencies() {
    let response = await this.axios.get('/kpifrequencies');
    return response.data;
  }

  // --- KPI Icons (Read-Only) ---

  async listKpiIcons() {
    let response = await this.axios.get('/kpiicons');
    return response.data;
  }

  // --- Reports ---

  async getReport(params: {
    kpiIds?: string;
    dateFrom: string;
    dateTo: string;
    groupItemIds?: string;
    userIds?: string;
  }) {
    let response = await this.axios.get('/reports/AllDataEntries', { params });
    return response.data;
  }
}
