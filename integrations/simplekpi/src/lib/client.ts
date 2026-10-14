import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { validateDateRange, validateEntry } from './validation';

interface Timestamped {
  created_at?: string | null;
  updated_at?: string | null;
}
export interface User extends Timestamped {
  id: number;
  user_type: string;
  user_status_id: string;
  first_name: string;
  last_name?: string | null;
  email: string;
  can_manage_users: boolean;
  can_admin_settings: boolean;
  last_login_at?: string | null;
  last_password_changed_at?: string | null;
}
export interface Kpi extends Timestamped {
  id: number;
  category_id: number;
  icon_id: number;
  unit_id: number;
  frequency_id: string;
  name: string;
  description?: string | null;
  target_default?: number | null;
  value_direction: string;
  aggregate_function: string;
  sort_order: number;
  is_active: boolean;
  is_calculated: boolean;
}
export interface KpiEntry extends Timestamped {
  id: number;
  user_id: number;
  kpi_id: number;
  entry_date: string;
  actual?: number | null;
  target?: number | null;
  notes?: string | null;
}
interface NamedItem extends Timestamped {
  id: number;
  name: string;
  sort_order: number;
}
interface GroupItem extends NamedItem {
  group_id: number;
}
interface UserKpi extends Timestamped {
  id: number;
  user_id: number;
  user_target?: number | null;
  sort_order: number;
}
interface UserGroupItem extends Timestamped {
  id: number;
  user_id: number;
  group_id: number;
  group_name?: string | null;
  name: string;
}
interface KpiUnit extends Timestamped {
  id: number;
  name: string;
  entry_format: string;
  display_format: string;
  is_percentage: boolean;
}
interface ReportEntry {
  kpiId: number;
  kpiName: string;
  kpiDescription?: string | null;
  itemId: number;
  itemName?: string | null;
  periodId: string;
  period: string;
  labelFormat?: string | null;
  isPercentage: number;
  hasTarget: number;
  direction: string;
  directionName: string;
  entryDate: string;
  actual?: number | null;
  target?: number | null;
  notes?: string | null;
}
export interface EntryWrite {
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
}

export class Client {
  private axios;

  constructor(params: {
    subdomain: string;
    email: string;
    token: string;
  }) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(params.subdomain)) {
      throw createApiServiceError(
        'Enter only your SimpleKPI account subdomain, such as mycompany, without a URL or path.'
      );
    }
    if (!params.email.trim() || params.email.includes(':') || !params.token.trim()) {
      throw createApiServiceError(
        'Provide your SimpleKPI email address and account API token.'
      );
    }
    let encoded = Buffer.from(`${params.email}:${params.token}`).toString('base64');

    this.axios = createAuthenticatedAxios({
      baseURL: `https://${params.subdomain}.simplekpi.com/api`,
      authHeader: { value: `Basic ${encoded}` },
      headers: { Accept: 'application/json' },
      timeout: 30_000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'SimpleKPI',
          reason: 'simplekpi_api_error',
          formatMessage: ({ status, statusLabel, message }) => {
            let guidance =
              status === 401
                ? 'Check your account email and API token, and enable Developer API access.'
                : status === 403
                  ? 'Check your API access and permissions. If rate limited, wait for the Retry-After interval before retrying.'
                  : status === 404
                    ? 'Check the resource ID using the corresponding list tool.'
                    : status === 429 || (typeof status === 'number' && status >= 500)
                      ? 'Retry later; contact SimpleKPI support if the error persists.'
                      : 'Check the supplied values and your account subdomain before retrying.';
            return `SimpleKPI request failed: ${statusLabel}${message} ${guidance}`;
          }
        })
    });
  }

  private collection<T extends object>(data: T[]): T[] {
    if (!Array.isArray(data) || !data.every(isApiErrorRecord)) {
      throw createApiServiceError(
        'SimpleKPI returned an unexpected response. Retry or contact support.'
      );
    }
    return data;
  }

  private requireWritableFields(fields: Record<string, unknown>) {
    if (Object.values(fields).some(value => value === undefined || value === null)) {
      throw createApiServiceError(
        'SimpleKPI returned an incomplete resource. Retry the read before updating it or contact support.'
      );
    }
  }

  private object<T extends object>(data: T): T {
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError(
        'SimpleKPI returned an unexpected response. Retry or contact support.'
      );
    }
    return data;
  }

  // --- Users ---

  async listUsers() {
    let response = await this.axios.get<User[]>('/users');
    return this.collection(response.data);
  }

  async getUser(userId: number) {
    let response = await this.axios.get<User>(`/users/${userId}`);
    return this.object(response.data);
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
    let response = await this.axios.post<User>('/users', data);
    return this.object(response.data);
  }

  async updateUser(userId: number, data: Record<string, unknown>) {
    if (Object.keys(pickDefined(data)).length === 0) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    let current = await this.getUser(userId);
    this.requireWritableFields({
      user_type: current.user_type,
      user_status_id: current.user_status_id,
      first_name: current.first_name,
      email: current.email,
      can_manage_users: current.can_manage_users,
      can_admin_settings: current.can_admin_settings
    });
    let payload = {
      ...pickDefined({
        user_type: current.user_type,
        user_status_id: current.user_status_id,
        first_name: current.first_name,
        last_name: current.last_name,
        email: current.email,
        can_manage_users: current.can_manage_users,
        can_admin_settings: current.can_admin_settings
      }),
      ...pickDefined(data)
    };
    let response = await this.axios.put<User>(`/users/${userId}`, payload);
    return this.object(response.data);
  }

  async deleteUser(userId: number) {
    let response = await this.axios.delete(`/users/${userId}`);
    return response.data;
  }

  // --- KPIs ---

  async listKpis() {
    let response = await this.axios.get<Kpi[]>('/kpis');
    return this.collection(response.data);
  }

  async getKpi(kpiId: number) {
    let response = await this.axios.get<Kpi>(`/kpis/${kpiId}`);
    return this.object(response.data);
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
    let response = await this.axios.post<Kpi>('/kpis', data);
    return this.object(response.data);
  }

  async updateKpi(kpiId: number, data: Record<string, unknown>) {
    if (Object.keys(pickDefined(data)).length === 0) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    let current = await this.getKpi(kpiId);
    if (current.is_calculated) {
      throw createApiServiceError(
        'Calculated KPIs must be changed in the SimpleKPI interface.'
      );
    }
    this.requireWritableFields({
      category_id: current.category_id,
      icon_id: current.icon_id,
      unit_id: current.unit_id,
      frequency_id: current.frequency_id,
      name: current.name,
      value_direction: current.value_direction,
      aggregate_function: current.aggregate_function,
      sort_order: current.sort_order,
      is_active: current.is_active
    });
    let payload = {
      ...pickDefined({
        category_id: current.category_id,
        icon_id: current.icon_id,
        unit_id: current.unit_id,
        frequency_id: current.frequency_id,
        name: current.name,
        description: current.description,
        target_default: current.target_default,
        value_direction: current.value_direction,
        aggregate_function: current.aggregate_function,
        sort_order: current.sort_order,
        is_active: current.is_active
      }),
      ...pickDefined(data)
    };
    let response = await this.axios.put<Kpi>(`/kpis/${kpiId}`, payload);
    return this.object(response.data);
  }

  async deleteKpi(kpiId: number) {
    let response = await this.axios.delete(`/kpis/${kpiId}`);
    return response.data;
  }

  // --- KPI Categories ---

  async listKpiCategories() {
    let response = await this.axios.get<NamedItem[]>('/kpicategories');
    return this.collection(response.data);
  }

  async getKpiCategory(categoryId: number) {
    let response = await this.axios.get<NamedItem>(`/kpicategories/${categoryId}`);
    return this.object(response.data);
  }

  async createKpiCategory(data: { name: string; sort_order: number }) {
    let response = await this.axios.post<NamedItem>('/kpicategories', data);
    return this.object(response.data);
  }

  async updateKpiCategory(categoryId: number, data: Record<string, unknown>) {
    if (Object.keys(pickDefined(data)).length === 0) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    let current = await this.getKpiCategory(categoryId);
    this.requireWritableFields({
      name: current.name,
      sort_order: current.sort_order
    });
    let payload = {
      ...pickDefined({ name: current.name, sort_order: current.sort_order }),
      ...pickDefined(data)
    };
    let response = await this.axios.put<NamedItem>(`/kpicategories/${categoryId}`, payload);
    return this.object(response.data);
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
    validateDateRange(params.dateFrom, params.dateTo);
    if (
      params.rows !== undefined &&
      (!Number.isInteger(params.rows) || params.rows < 1 || params.rows > 500)
    ) {
      throw createApiServiceError('rows must be a whole number between 1 and 500.');
    }
    if (params.page !== undefined && (!Number.isInteger(params.page) || params.page < 1)) {
      throw createApiServiceError('page must be a whole number starting at 1.');
    }
    let response = await this.axios.get<KpiEntry[]>('/kpientries', { params });
    return this.collection(response.data);
  }

  async getKpiEntry(entryId: number) {
    let response = await this.axios.get<KpiEntry>(`/kpientries/${entryId}`);
    return this.object(response.data);
  }

  async createKpiEntry(data: EntryWrite) {
    validateEntry(data);
    let response = await this.axios.post<KpiEntry>('/kpientries', data);
    return this.object(response.data);
  }

  async createKpiEntriesBatch(data: {
    entries: EntryWrite[];
    hasActuals?: boolean;
    hasTargets?: boolean;
    hasNotes?: boolean;
  }) {
    if (data.entries.length === 0 || data.entries.length > 5_000) {
      throw createApiServiceError('Provide between 1 and 5,000 KPI entries per batch.');
    }
    data.entries.forEach((entry, index) => validateEntry(entry, `Entry ${index + 1}`));
    let response = await this.axios.post<{ rows_added: number }>('/kpientries/list', data);
    return this.object(response.data);
  }

  async updateKpiEntry(entryId: number, data: Record<string, unknown>) {
    let response = await this.axios.put<KpiEntry>(`/kpientries/${entryId}`, data);
    return this.object(response.data);
  }

  async deleteKpiEntry(entryId: number) {
    let response = await this.axios.delete(`/kpientries/${entryId}`);
    return response.data;
  }

  // --- User KPIs ---

  async listUserKpis(userId: number) {
    let response = await this.axios.get<UserKpi[]>(`/users/${userId}/kpis`);
    return this.collection(response.data);
  }

  async getUserKpi(userId: number, kpiId: number) {
    let response = await this.axios.get<UserKpi>(`/users/${userId}/kpis/${kpiId}`);
    return this.object(response.data);
  }

  async assignKpiToUser(
    userId: number,
    data: { id: number; user_target?: number | null; sort_order: number }
  ) {
    let response = await this.axios.post<UserKpi>(`/users/${userId}/kpis`, data);
    return this.object(response.data);
  }

  async updateUserKpi(
    userId: number,
    kpiId: number,
    data: { user_target?: number | null; sort_order?: number }
  ) {
    if (Object.keys(pickDefined(data)).length === 0) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    let current = await this.getUserKpi(userId, kpiId);
    this.requireWritableFields({
      sort_order: current.sort_order
    });
    let payload = {
      ...pickDefined({ user_target: current.user_target, sort_order: current.sort_order }),
      ...pickDefined(data)
    };
    let response = await this.axios.put<UserKpi>(`/users/${userId}/kpis/${kpiId}`, payload);
    return this.object(response.data);
  }

  async removeKpiFromUser(userId: number, kpiId: number) {
    let response = await this.axios.delete(`/users/${userId}/kpis/${kpiId}`);
    return response.data;
  }

  // --- Groups ---

  async listGroups() {
    let response = await this.axios.get<NamedItem[]>('/groups');
    return this.collection(response.data);
  }

  async getGroup(groupId: number) {
    let response = await this.axios.get<NamedItem>(`/groups/${groupId}`);
    return this.object(response.data);
  }

  async createGroup(data: { name: string; sort_order: number }) {
    let response = await this.axios.post<NamedItem>('/groups', data);
    return this.object(response.data);
  }

  async updateGroup(groupId: number, data: Record<string, unknown>) {
    if (Object.keys(pickDefined(data)).length === 0) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    let current = await this.getGroup(groupId);
    this.requireWritableFields({
      name: current.name,
      sort_order: current.sort_order
    });
    let payload = {
      ...pickDefined({ name: current.name, sort_order: current.sort_order }),
      ...pickDefined(data)
    };
    let response = await this.axios.put<NamedItem>(`/groups/${groupId}`, payload);
    return this.object(response.data);
  }

  async deleteGroup(groupId: number) {
    let response = await this.axios.delete(`/groups/${groupId}`);
    return response.data;
  }

  // --- Group Items ---

  async listGroupItems(groupId: number) {
    let response = await this.axios.get<GroupItem[]>(`/groups/${groupId}/items`);
    return this.collection(response.data);
  }

  async getGroupItem(groupId: number, itemId: number) {
    let response = await this.axios.get<GroupItem>(`/groups/${groupId}/items/${itemId}`);
    return this.object(response.data);
  }

  async createGroupItem(groupId: number, data: { name: string; sort_order: number }) {
    let response = await this.axios.post<GroupItem>(`/groups/${groupId}/items`, data);
    return this.object(response.data);
  }

  async updateGroupItem(groupId: number, itemId: number, data: Record<string, unknown>) {
    if (Object.keys(pickDefined(data)).length === 0) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    let current = await this.getGroupItem(groupId, itemId);
    this.requireWritableFields({
      group_id: current.group_id,
      name: current.name,
      sort_order: current.sort_order
    });
    let payload = {
      ...pickDefined({
        group_id: current.group_id,
        name: current.name,
        sort_order: current.sort_order
      }),
      ...pickDefined(data)
    };
    let response = await this.axios.put<GroupItem>(
      `/groups/${groupId}/items/${itemId}`,
      payload
    );
    return this.object(response.data);
  }

  async deleteGroupItem(groupId: number, itemId: number) {
    let response = await this.axios.delete(`/groups/${groupId}/items/${itemId}`);
    return response.data;
  }

  // --- User Group Items ---

  async listUserGroupItems(userId: number) {
    let response = await this.axios.get<UserGroupItem[]>(`/users/${userId}/groupitems`);
    return this.collection(response.data);
  }

  async assignGroupItemToUser(userId: number, groupItemId: number) {
    let response = await this.axios.post<UserGroupItem>(`/users/${userId}/groupitems`, {
      id: groupItemId
    });
    return this.object(response.data);
  }

  async removeGroupItemFromUser(userId: number, groupItemId: number) {
    let response = await this.axios.delete(`/users/${userId}/groupitems/${groupItemId}`);
    return response.data;
  }

  // --- KPI Units ---

  async listKpiUnits() {
    let response = await this.axios.get<KpiUnit[]>('/kpiunits');
    return this.collection(response.data);
  }

  async getKpiUnit(unitId: number) {
    let response = await this.axios.get<KpiUnit>(`/kpiunits/${unitId}`);
    return this.object(response.data);
  }

  async createKpiUnit(data: {
    name: string;
    entry_format: string;
    display_format: string;
    is_percentage: boolean;
  }) {
    let response = await this.axios.post<KpiUnit>('/kpiunits', data);
    return this.object(response.data);
  }

  async updateKpiUnit(unitId: number, data: Record<string, unknown>) {
    if (Object.keys(pickDefined(data)).length === 0) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    let current = await this.getKpiUnit(unitId);
    this.requireWritableFields({
      name: current.name,
      entry_format: current.entry_format,
      display_format: current.display_format,
      is_percentage: current.is_percentage
    });
    let payload = {
      ...pickDefined({
        name: current.name,
        entry_format: current.entry_format,
        display_format: current.display_format,
        is_percentage: current.is_percentage
      }),
      ...pickDefined(data)
    };
    let response = await this.axios.put<KpiUnit>(`/kpiunits/${unitId}`, payload);
    return this.object(response.data);
  }

  async deleteKpiUnit(unitId: number) {
    let response = await this.axios.delete(`/kpiunits/${unitId}`);
    return response.data;
  }

  // --- KPI Frequencies (Read-Only) ---

  async listKpiFrequencies() {
    let response = await this.axios.get<{ id: string; name: string }[]>('/kpifrequencies');
    return this.collection(response.data);
  }

  // --- KPI Icons (Read-Only) ---

  async listKpiIcons() {
    let response = await this.axios.get<{ id: number; name: string }[]>('/kpiicons');
    return this.collection(response.data);
  }

  // --- Reports ---

  async getReport(params: {
    kpiIds?: string;
    dateFrom: string;
    dateTo: string;
    groupItemIds?: string;
    userIds?: string;
  }) {
    validateDateRange(params.dateFrom, params.dateTo);
    let response = await this.axios.get<ReportEntry[]>('/reports/AllDataEntries', { params });
    return this.collection(response.data);
  }
}
