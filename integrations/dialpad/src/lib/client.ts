import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  type createAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import {
  changes,
  contactId,
  credential,
  invalid,
  malformed,
  nativeId,
  object,
  page,
  phone,
  safeJson
} from './contracts';
import { createDialpadAxios } from './http';
import * as models from './models';

export type DialpadClientConfig = { token: string; environment: string };
export const isMissing = (error: unknown): boolean =>
  error instanceof ServiceError && error.data.upstreamStatus === 404;
export class DialpadClient {
  private readonly axios: ReturnType<typeof createAxios>;
  private readonly secrets: string[];
  constructor(params: DialpadClientConfig) {
    const token = credential(params.token);
    if (!['production', 'sandbox'].includes(params.environment))
      invalid('Select the production or sandbox Dialpad environment.');
    this.secrets = [token];
    this.axios = createDialpadAxios(
      {
        baseURL: `${params.environment === 'sandbox' ? 'https://sandbox.dialpad.com' : 'https://dialpad.com'}/api/v2`,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 30000,
        maxRedirects: 0,
        maxBodyLength: 4 * 1024 * 1024,
        maxContentLength: 4 * 1024 * 1024
      },
      this.secrets
    );
  }
  validate(value: unknown) {
    safeJson(value, this.secrets);
  }
  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    data?: Record<string, unknown>,
    params?: Record<string, unknown>,
    empty = false
  ): Promise<unknown> {
    this.validate({ path, data, params });
    try {
      const response = await this.axios.request<unknown>({
        method,
        url: path,
        data: data === undefined ? undefined : pickDefined(data),
        params: params === undefined ? undefined : pickDefined(params)
      });
      if (response.status !== 200) malformed();
      safeJson(response.data, this.secrets, true);
      if (empty) {
        if (
          response.data !== undefined &&
          response.data !== null &&
          response.data !== '' &&
          Object.keys(object(response.data)).length
        )
          malformed();
        return undefined;
      }
      return object(response.data);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      const raw = getApiErrorStatus(error);
      const status =
        typeof raw === 'number' && Number.isInteger(raw) && raw >= 100 && raw <= 599
          ? raw
          : undefined;
      throw buildApiServiceError(
        { response: { status } },
        {
          providerLabel: 'Dialpad',
          reason: 'dialpad_api_error',
          operation: 'request',
          parent: {},
          extractMessage: () =>
            'Check the environment, resource ID, permissions and approved scopes. A timed-out write may have applied; reconcile before retrying.'
        }
      );
    }
  }
  async getUser(id: string) {
    const target = nativeId(id, 'user ID', true);
    const row = await this.request('GET', `/users/${target}`);
    models.user(row, target);
    return object(row);
  }
  async listUsers(params: { cursor?: string; email?: string; state?: string } = {}) {
    return page(await this.request('GET', '/users', undefined, params));
  }
  async createUser(data: {
    email: string;
    first_name?: string;
    last_name?: string;
    office_id: number;
    license?: string;
  }) {
    const row = await this.request('POST', '/users', data);
    models.user(row);
    return row;
  }
  async updateUser(id: string, data: Record<string, unknown>) {
    const target = nativeId(id, 'user ID', true);
    const row = await this.request('PATCH', `/users/${target}`, changes(data));
    models.user(row, target);
    return row;
  }
  async toggleDnd(id: string, enabled: boolean) {
    const target = nativeId(id, 'user ID', true);
    const row = object(
      await this.request('PATCH', `/users/${target}/togglednd`, { do_not_disturb: enabled })
    );
    models.user(row, target);
    if (row.do_not_disturb !== enabled) malformed();
    return row;
  }
  async deleteUser(id: string) {
    const target = nativeId(id, 'user ID');
    const row = await this.request('DELETE', `/users/${target}`);
    models.user(row, target);
    if (object(row).state !== 'deleted') malformed();
  }
  async listContacts(params: { cursor?: string; owner_id?: string } = {}) {
    if (params.owner_id !== undefined) nativeId(params.owner_id, 'owner user ID');
    return page(await this.request('GET', '/contacts', undefined, params));
  }
  async getContact(id: string) {
    const target = contactId(id);
    const row = await this.request('GET', `/contacts/${encodeURIComponent(target)}`);
    models.contact(row, target);
    return object(row);
  }
  async createContact(data: Record<string, unknown>) {
    const row = await this.request('POST', '/contacts', data);
    models.contact(row);
    return row;
  }
  async upsertContact(data: Record<string, unknown>) {
    const row = await this.request('PUT', '/contacts', data);
    models.contact(row);
    return row;
  }
  async updateContact(id: string, data: Record<string, unknown>) {
    const target = contactId(id);
    const row = await this.request(
      'PATCH',
      `/contacts/${encodeURIComponent(target)}`,
      changes(data)
    );
    models.contact(row, target);
    return row;
  }
  async deleteContact(id: string) {
    const target = contactId(id);
    await this.getContact(target);
    const row = await this.request('DELETE', `/contacts/${encodeURIComponent(target)}`);
    models.contact(row, target);
    try {
      await this.getContact(target);
    } catch (error) {
      if (isMissing(error)) return;
      throw error;
    }
    malformed();
  }
  async sendSms(data: Record<string, unknown>) {
    return object(await this.request('POST', '/sms', data));
  }
  async initiateCall(id: string, data: Record<string, unknown>) {
    return object(
      await this.request(
        'POST',
        `/users/${nativeId(id, 'caller user ID', true)}/initiate_call`,
        data
      )
    );
  }
  async getCall(id: string) {
    const target = nativeId(id, 'call ID');
    const row = await this.request('GET', `/call/${target}`);
    models.call(row, target);
    return object(row);
  }
  async listCalls(params: Record<string, unknown> = {}) {
    return page(await this.request('GET', '/call', undefined, params));
  }
  async hangupCall(id: string) {
    await this.request(
      'PUT',
      `/call/${nativeId(id, 'call ID')}/actions/hangup`,
      undefined,
      undefined,
      true
    );
  }
  async transferCall(id: string, destination: Record<string, unknown>) {
    return object(
      await this.request('POST', `/call/${nativeId(id, 'call ID')}/transfer`, {
        to: destination
      })
    );
  }
  async listCallCenters(id: string, params: { cursor?: string } = {}) {
    return page(
      await this.request(
        'GET',
        `/offices/${nativeId(id, 'office ID')}/callcenters`,
        undefined,
        params
      )
    );
  }
  async getCallCenter(id: string) {
    const target = nativeId(id, 'call-center ID');
    const row = await this.request('GET', `/callcenters/${target}`);
    models.callCenter(row, target);
    return object(row);
  }
  async createCallCenter(id: string, data: Record<string, unknown>) {
    const row = await this.request('POST', '/callcenters', {
      ...data,
      office_id: Number(nativeId(id, 'office ID'))
    });
    models.callCenter(row);
    if (String(object(row).office_id) !== id) malformed();
    return row;
  }
  async updateCallCenter(id: string, data: Record<string, unknown>) {
    const target = nativeId(id, 'call-center ID');
    const row = await this.request('PATCH', `/callcenters/${target}`, changes(data));
    models.callCenter(row, target);
    return row;
  }
  async deleteCallCenter(id: string) {
    const target = nativeId(id, 'call-center ID');
    const row = await this.request('DELETE', `/callcenters/${target}`);
    models.callCenter(row, target);
    if (object(row).state !== 'deleted') malformed();
  }
  async listCallCenterOperators(id: string) {
    const row = await this.request(
      'GET',
      `/callcenters/${nativeId(id, 'call-center ID')}/operators`
    );
    models.operators(row);
    return row;
  }
  async addCallCenterOperator(id: string, data: Record<string, unknown>) {
    const target = nativeId(id, 'call-center ID');
    const row = await this.request('POST', `/callcenters/${target}/operators`, data);
    models.callCenter(row, target);
    return row;
  }
  async removeCallCenterOperator(id: string, operator: string) {
    const target = nativeId(id, 'call-center ID');
    const row = await this.request('DELETE', `/callcenters/${target}/operators`, {
      user_id: Number(nativeId(operator, 'operator user ID'))
    });
    models.callCenter(row, target);
    return row;
  }
  async listOffices(params: { cursor?: string } = {}) {
    return page(await this.request('GET', '/offices', undefined, params));
  }
  async getOffice(id: string) {
    const target = nativeId(id, 'office ID');
    const row = await this.request('GET', `/offices/${target}`);
    models.office(row, target);
    return row;
  }
  async listNumbers(params: { cursor?: string } = {}) {
    return page(await this.request('GET', '/numbers', undefined, params));
  }
  async getNumber(value: string) {
    const target = phone(value);
    const row = await this.request('GET', `/numbers/${encodeURIComponent(target)}`);
    models.number(row, target);
    return object(row);
  }
  async assignNumber(value: string, type: string, id: string) {
    const target = phone(value);
    const row = await this.request('POST', `/numbers/${encodeURIComponent(target)}/assign`, {
      target_type: type,
      target_id: Number(nativeId(id, 'target ID'))
    });
    const mapped = models.number(row, target);
    if (mapped.targetId !== id || mapped.targetType !== type) malformed();
    return row;
  }
  async unassignNumber(value: string) {
    const target = phone(value);
    const row = await this.request(
      'DELETE',
      `/numbers/${encodeURIComponent(target)}`,
      undefined,
      { release: false }
    );
    models.number(row, target);
    if (object(row).target_id !== null && object(row).target_id !== undefined) malformed();
    return row;
  }
  async listBlockedNumbers(params: { cursor?: string } = {}) {
    return page(await this.request('GET', '/blockednumbers', undefined, params));
  }
  async getBlockedNumber(value: string) {
    const target = phone(value);
    const row = await this.request('GET', `/blockednumbers/${encodeURIComponent(target)}`);
    models.blocked(row, target);
    return row;
  }
  async blockNumber(value: string) {
    await this.request(
      'POST',
      '/blockednumbers/add',
      { numbers: [phone(value)] },
      undefined,
      true
    );
  }
  async unblockNumber(value: string) {
    await this.request(
      'POST',
      '/blockednumbers/remove',
      { numbers: [phone(value)] },
      undefined,
      true
    );
  }
  async getCompany() {
    const row = await this.request('GET', '/company');
    models.company(row);
    return row;
  }
}
