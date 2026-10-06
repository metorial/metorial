import {
  AuthConfigSecretRedactor,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  requestAxios,
  requestAxiosData
} from 'slates';
import { deelError } from './errors';
import { parseDeelResponse } from './json';
import { requireText } from './response';

export interface ClientConfig {
  token: string;
  refreshToken?: string;
  clientId?: string;
  environment: 'production' | 'sandbox';
}
export type DeelParameters = Record<string, string | number | boolean | string[] | undefined>;
export class Client {
  private http;
  private redactor: AuthConfigSecretRedactor;
  constructor(config: ClientConfig) {
    requireText(config.token, 'Deel token');
    if (config.clientId !== undefined) requireText(config.clientId, 'OAuth client ID');
    if (!['production', 'sandbox'].includes(config.environment))
      throw createApiServiceError('Select a valid Deel environment.');
    this.redactor = new AuthConfigSecretRedactor({
      token: config.token,
      refreshToken: config.refreshToken
    });
    this.http = createAuthenticatedAxios({
      baseURL:
        config.environment === 'sandbox'
          ? 'https://api-sandbox.demo.deel.com/rest'
          : 'https://api.letsdeel.com/rest',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      transformResponse: [parseDeelResponse],
      headers: {
        Accept: 'application/json',
        'X-Version': '2026-01-01',
        ...(config.clientId ? { 'x-client-id': config.clientId } : {})
      },
      paramsSerializer: { indexes: null }
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    data?: Record<string, unknown>,
    params?: DeelParameters
  ) {
    let result = await requestAxiosData<unknown>(
      `${method} request`,
      () =>
        this.http.request({
          method,
          url,
          params,
          ...(data === undefined ? {} : { data: { data } })
        }),
      deelError
    );
    const reflectedKey = (value: unknown): boolean => {
      if (Array.isArray(value)) return value.some(reflectedKey);
      return (
        isApiErrorRecord(value) &&
        Object.entries(value).some(
          ([key, nested]) => this.redactor.redactEmbedded(key) !== key || reflectedKey(nested)
        )
      );
    };
    if (
      reflectedKey(result) ||
      JSON.stringify(this.redactor.redactEmbedded(result)) !== JSON.stringify(result)
    )
      throw createApiServiceError(
        'Deel reflected a credential in resource data. Review the connection before retrying; a requested write may have completed.',
        { reason: 'unsafe_response', parent: {} }
      );
    return result;
  }
  listContracts(params?: DeelParameters) {
    return this.request('GET', '/contracts', undefined, params);
  }
  listPeople(params?: DeelParameters) {
    return this.request('GET', '/people', undefined, params);
  }
  listInvoiceAdjustments(params?: DeelParameters) {
    return this.request('GET', '/invoice-adjustments', undefined, params);
  }
  listInvoices(params?: DeelParameters) {
    return this.request('GET', '/invoices', undefined, params);
  }
  listPayments(params?: DeelParameters) {
    return this.request('GET', '/payments', undefined, params);
  }
  listLegalEntities(params?: DeelParameters) {
    return this.request('GET', '/legal-entities', undefined, params);
  }
  listGroups(params?: DeelParameters) {
    return this.request('GET', '/teams', undefined, params);
  }
  listDepartments(params?: DeelParameters) {
    return this.request('GET', '/departments', undefined, params);
  }
  getContract(contractId: string) {
    let id = encodeURIComponent(requireText(contractId, 'contractId'));
    return this.request('GET', `/contracts/${id}`);
  }
  getPerson(personId: string) {
    let id = encodeURIComponent(requireText(personId, 'personId'));
    return this.request('GET', `/people/${id}/personal`);
  }
  getEorCountryGuide(countryCode: string) {
    let id = encodeURIComponent(requireText(countryCode, 'countryCode'));
    return this.request('GET', `/eor/validations/${id}`);
  }
  getInvoiceDownload(invoiceId: string) {
    let id = encodeURIComponent(requireText(invoiceId, 'invoiceId'));
    return this.request('GET', `/invoices/${id}/download`);
  }
  listTimesheets(contractId: string, params?: DeelParameters) {
    let id = encodeURIComponent(requireText(contractId, 'contractId'));
    return this.request('GET', `/contracts/${id}/timesheets`, undefined, params);
  }
  listTimeOffs(profileId: string, params?: DeelParameters) {
    let id = encodeURIComponent(requireText(profileId, 'profileId'));
    return this.request('GET', `/time_offs/profile/${id}`, undefined, params);
  }
  listContractInvoiceAdjustments(contractId: string, params?: DeelParameters) {
    let id = encodeURIComponent(requireText(contractId, 'contractId'));
    return this.request('GET', `/contracts/${id}/invoice-adjustments`, undefined, params);
  }
  createContract(data: Record<string, unknown>) {
    return this.request('POST', '/contracts', data);
  }
  createTimesheet(data: Record<string, unknown>) {
    return this.request('POST', '/timesheets', data);
  }
  createTimeOff(data: Record<string, unknown>) {
    return this.request('POST', '/time_offs', data);
  }
  getEorCostCalculation(data: Record<string, unknown>) {
    return this.request('POST', '/eor/employment_cost', data);
  }
  amendContract(contractId: string, data: Record<string, unknown>) {
    let id = encodeURIComponent(requireText(contractId, 'contractId'));
    return this.request('POST', `/contracts/${id}/amendments`, data);
  }
  signContract(contractId: string, data: Record<string, unknown>) {
    let id = encodeURIComponent(requireText(contractId, 'contractId'));
    return this.request('POST', `/contracts/${id}/signatures`, data);
  }
  terminateContract(contractId: string, data: Record<string, unknown>) {
    let id = encodeURIComponent(requireText(contractId, 'contractId'));
    return this.request('POST', `/contracts/${id}/terminations`, data);
  }
  reviewTimesheet(timesheetId: string, data: Record<string, unknown>) {
    let id = encodeURIComponent(requireText(timesheetId, 'timesheetId'));
    return this.request('POST', `/timesheets/${id}/reviews`, data);
  }
  reviewInvoiceAdjustment(adjustmentId: string, data: Record<string, unknown>) {
    let id = encodeURIComponent(requireText(adjustmentId, 'adjustmentId'));
    return this.request('POST', `/invoice-adjustments/${id}/reviews`, data);
  }
  updateTimeOff(timeOffId: string, data: Record<string, unknown>) {
    let id = encodeURIComponent(requireText(timeOffId, 'timeOffId'));
    return this.request('PATCH', `/time_offs/${id}`, data);
  }
  createInvoiceAdjustment(data: Record<string, unknown>, recurring?: boolean) {
    return this.request(
      'POST',
      '/invoice-adjustments',
      data,
      recurring === undefined ? undefined : { recurring: String(recurring) }
    );
  }
  listOrganizationTimeOffs(params?: DeelParameters) {
    return this.request('GET', '/time_offs', undefined, params);
  }
  getCurrentUser() {
    return this.request('GET', '/people/me');
  }
  getCurrentOrganization() {
    return this.request('GET', '/organizations');
  }
  listTimeOffPolicies(profileId: string) {
    let id = encodeURIComponent(requireText(profileId, 'profileId'));
    return this.request('GET', `/time_offs/profile/${id}/policies`);
  }
  getTimesheet(timesheetId: string) {
    let id = encodeURIComponent(requireText(timesheetId, 'timesheetId'));
    return this.request('GET', `/timesheets/${id}`);
  }
  deleteTimesheet(timesheetId: string) {
    let id = encodeURIComponent(requireText(timesheetId, 'timesheetId'));
    return this.request('DELETE', `/timesheets/${id}`);
  }
  getInvoiceAdjustment(adjustmentId: string) {
    let id = encodeURIComponent(requireText(adjustmentId, 'adjustmentId'));
    return this.request('GET', `/invoice-adjustments/${id}`);
  }
  deleteInvoiceAdjustment(adjustmentId: string) {
    let id = encodeURIComponent(requireText(adjustmentId, 'adjustmentId'));
    return this.request('DELETE', `/invoice-adjustments/${id}`);
  }
  async deleteTimeOff(timeOffId: string) {
    let id = encodeURIComponent(requireText(timeOffId, 'timeOffId'));
    let response = await requestAxios(
      'cancel time off',
      () => this.http.delete(`/time_offs/${id}`),
      deelError
    );
    if (response.status !== 204)
      throw createApiServiceError(
        'Deel did not acknowledge time-off cancellation. Verify the request before retrying.'
      );
  }
}
