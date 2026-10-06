import { createApiServiceError, createAuthenticatedAxios, isApiErrorRecord } from 'slates';
import {
  API_ORIGIN,
  copperError,
  entityTypes,
  sanitize,
  validateId,
  validateRelationship
} from './contracts';

export interface CopperAuth {
  token: string;
  userEmail?: string;
  authMethod: 'api_key' | 'oauth';
}
export interface CopperRecord {
  id: number;
  [key: string]: any;
}
export const authHeaders = (auth: CopperAuth): Record<string, string> => {
  if (
    typeof auth.token !== 'string' ||
    !auth.token.trim() ||
    !['api_key', 'oauth'].includes(auth.authMethod)
  )
    throw createApiServiceError('Reconnect Copper with a valid API key or OAuth token.');
  if (auth.authMethod === 'oauth') return { Authorization: `Bearer ${auth.token}` };
  if (typeof auth.userEmail !== 'string' || !auth.userEmail.trim())
    throw createApiServiceError(
      'API key connections require the email address of the user who generated the key.'
    );
  return {
    'X-PW-AccessToken': auth.token,
    'X-PW-UserEmail': auth.userEmail,
    'X-PW-Application': 'developer_api'
  };
};

const record = (value: unknown, expectedId?: number): CopperRecord => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError(
      'Copper returned an invalid record. Read the record back before retrying any write.'
    );
  validateId(value.id, 'Returned record ID');
  if (expectedId !== undefined && value.id !== expectedId)
    throw createApiServiceError(
      'Copper returned a different record ID. Verify the operation independently before retrying.'
    );
  return value as CopperRecord;
};
const records = (value: unknown): CopperRecord[] => {
  if (!Array.isArray(value))
    throw createApiServiceError(
      'Copper returned an invalid collection; no complete results can be reported.'
    );
  return value.map(item => record(item));
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private nextRequestAt = 0;
  constructor(private auth: CopperAuth) {
    this.axios = createAuthenticatedAxios({
      baseURL: API_ORIGIN,
      headers: authHeaders(auth),
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: copperError
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: Record<string, any>
  ): Promise<unknown> {
    if (method === 'PUT' && (!data || Object.keys(data).length === 0))
      throw createApiServiceError(
        'Provide at least one field to update. Only supplied fields are changed.'
      );
    const wait = Math.max(0, this.nextRequestAt - Date.now());
    this.nextRequestAt = Date.now() + wait + 400;
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    const response = await this.axios.request({ method, url: path, data });
    return sanitize(response.data, this.auth.token);
  }
  private path(entity: string, id: number) {
    return `/${entity}/${validateId(id)}`;
  }
  private async create(entity: string, data: Record<string, any>) {
    return record(await this.request('POST', `/${entity}`, data));
  }
  private async get(entity: string, id: number) {
    return record(await this.request('GET', this.path(entity, id)), id);
  }
  private async update(entity: string, id: number, data: Record<string, any>) {
    return record(await this.request('PUT', this.path(entity, id), data), id);
  }
  private async remove(entity: string, id: number) {
    const result = record(await this.request('DELETE', this.path(entity, id)), id);
    if (result.is_deleted !== true)
      throw createApiServiceError(
        'Copper did not confirm deletion. Read the record back before retrying.'
      );
    return result;
  }
  private async search(entity: string, params: Record<string, any>) {
    const result = records(await this.request('POST', `/${entity}/search`, params));
    if (result.length > (params.page_size ?? 20))
      throw createApiServiceError(
        'Copper returned more records than the requested page size.'
      );
    return result;
  }
  async createPerson(data: Record<string, any>) {
    return this.create('people', data);
  }
  async getPerson(id: number) {
    return this.get('people', id);
  }
  async updatePerson(id: number, data: Record<string, any>) {
    return this.update('people', id, data);
  }
  async deletePerson(id: number) {
    return this.remove('people', id);
  }
  async searchPeople(params: Record<string, any>) {
    return this.search('people', params);
  }
  async createCompany(data: Record<string, any>) {
    return this.create('companies', data);
  }
  async getCompany(id: number) {
    return this.get('companies', id);
  }
  async updateCompany(id: number, data: Record<string, any>) {
    return this.update('companies', id, data);
  }
  async deleteCompany(id: number) {
    return this.remove('companies', id);
  }
  async searchCompanies(params: Record<string, any>) {
    return this.search('companies', params);
  }
  async createLead(data: Record<string, any>) {
    return this.create('leads', data);
  }
  async getLead(id: number) {
    return this.get('leads', id);
  }
  async updateLead(id: number, data: Record<string, any>) {
    return this.update('leads', id, data);
  }
  async deleteLead(id: number) {
    return this.remove('leads', id);
  }
  async searchLeads(params: Record<string, any>) {
    return this.search('leads', params);
  }
  async createOpportunity(data: Record<string, any>) {
    return this.create('opportunities', data);
  }
  async getOpportunity(id: number) {
    return this.get('opportunities', id);
  }
  async updateOpportunity(id: number, data: Record<string, any>) {
    return this.update('opportunities', id, data);
  }
  async deleteOpportunity(id: number) {
    return this.remove('opportunities', id);
  }
  async searchOpportunities(params: Record<string, any>) {
    return this.search('opportunities', params);
  }
  async createTask(data: Record<string, any>) {
    return this.create('tasks', data);
  }
  async getTask(id: number) {
    return this.get('tasks', id);
  }
  async updateTask(id: number, data: Record<string, any>) {
    return this.update('tasks', id, data);
  }
  async deleteTask(id: number) {
    return this.remove('tasks', id);
  }
  async searchTasks(params: Record<string, any>) {
    return this.search('tasks', params);
  }
  async createProject(data: Record<string, any>) {
    return this.create('projects', data);
  }
  async getProject(id: number) {
    return this.get('projects', id);
  }
  async updateProject(id: number, data: Record<string, any>) {
    return this.update('projects', id, data);
  }
  async deleteProject(id: number) {
    return this.remove('projects', id);
  }
  async searchProjects(params: Record<string, any>) {
    return this.search('projects', params);
  }
  async lookupPersonByEmail(email: string) {
    if (!email.trim())
      throw createApiServiceError('Provide a nonempty email address to find a person.');
    return record(await this.request('POST', '/people/fetch_by_email', { email }));
  }
  async convertLead(id: number, details: Record<string, any>) {
    const result = await this.request('POST', `${this.path('leads', id)}/convert`, {
      details
    });
    if (!isApiErrorRecord(result))
      throw createApiServiceError(
        'Copper did not return the converted records. Verify conversion before retrying.'
      );
    const person = record(result.person);
    return {
      person,
      company: result.company == null ? null : record(result.company),
      opportunity: result.opportunity == null ? null : record(result.opportunity)
    };
  }
  async createActivity(data: Record<string, any>) {
    return this.create('activities', data);
  }
  async searchActivities(params: Record<string, any>) {
    return this.search('activities', params);
  }
  async listActivityTypes() {
    const data = await this.request('GET', '/activity_types');
    if (!isApiErrorRecord(data) || !Array.isArray(data.user) || !Array.isArray(data.system))
      throw createApiServiceError('Copper returned invalid activity-type groups.');
    return ['user', 'system'].flatMap(category =>
      (data[category] as unknown[]).map(type => {
        if (!isApiErrorRecord(type))
          throw createApiServiceError('Copper returned an invalid activity type.');
        validateId(type.id, 'Activity type ID', true);
        return { ...type, category };
      })
    );
  }
  async listPipelines() {
    return records(await this.request('GET', '/pipelines'));
  }
  async listPipelineStages(id: number) {
    return records(await this.request('GET', `/pipeline_stages/pipeline/${validateId(id)}`));
  }
  async listCustomFieldDefinitions() {
    return records(await this.request('GET', '/custom_field_definitions'));
  }
  async listCustomerSources() {
    return records(await this.request('GET', '/customer_sources'));
  }
  async listLossReasons() {
    return records(await this.request('GET', '/loss_reasons'));
  }
  async listContactTypes() {
    return records(await this.request('GET', '/contact_types'));
  }
  async listLeadStatuses() {
    return records(await this.request('GET', '/lead_statuses'));
  }
  async getAccount() {
    return record(await this.request('GET', '/account'));
  }
  async getApiUser() {
    return record(await this.request('GET', '/users/me'));
  }
  async listUsers() {
    const result: CopperRecord[] = [];
    const seen = new Set<number>();
    for (let page = 1; page <= 500; page++) {
      const batch = await this.search('users', { page_number: page, page_size: 200 });
      for (const user of batch) {
        if (seen.has(user.id))
          throw createApiServiceError(
            'User pagination repeated an ID; complete user discovery cannot be reported.'
          );
        seen.add(user.id);
        result.push(user);
      }
      if (batch.length < 200) return result;
    }
    throw createApiServiceError(
      'User discovery reached the 100,000-result search limit; complete results cannot be reported.'
    );
  }
  async getRelatedItems(entity: string, id: number) {
    if (
      !['people', 'companies', 'leads', 'opportunities', 'projects', 'tasks'].includes(entity)
    )
      throw createApiServiceError('Choose a supported source entity type.');
    const result = records(await this.request('GET', `${this.path(entity, id)}/related`));
    for (const item of result)
      if (!entityTypes.includes(item.type))
        throw createApiServiceError('Copper returned an invalid related entity type.');
    return result;
  }
  private async relationship(
    method: 'POST' | 'DELETE',
    entity: string,
    id: number,
    data: Record<string, any>
  ) {
    validateRelationship(entity, data.resource);
    const result = await this.request(method, `${this.path(entity, id)}/related`, data);
    const field = method === 'POST' ? 'added' : 'removed';
    if (
      !isApiErrorRecord(result) ||
      result[field] !== true ||
      !isApiErrorRecord(result.resource) ||
      result.resource.id !== data.resource.id ||
      result.resource.type !== data.resource.type
    )
      throw createApiServiceError(
        'Copper did not confirm the exact relationship change. Read related items before retrying.'
      );
    return result;
  }
  async createRelatedItem(entity: string, id: number, data: Record<string, any>) {
    return this.relationship('POST', entity, id, data);
  }
  async deleteRelatedItem(entity: string, id: number, data: Record<string, any>) {
    return this.relationship('DELETE', entity, id, data);
  }
}
