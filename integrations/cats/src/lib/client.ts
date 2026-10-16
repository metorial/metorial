import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { collection, requiredId, validateNumber } from './response';

const BASE_URL = 'https://api.catsone.com/v3';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('A CATS API key is required.');
    let redact = (value: unknown): any => {
      if (typeof value === 'string') {
        return value
          .split(config.token)
          .join('[REDACTED]')
          .replace(
            /([?&](?:api[_-]?key|token|access_token|authorization)=)[^&#\s]*/gi,
            '$1[REDACTED]'
          )
          .replace(/(https?:\/\/)[^/@\s]+:[^/@\s]+@/gi, '$1[REDACTED]@');
      }
      if (Array.isArray(value)) return value.map(redact);
      if (isApiErrorRecord(value))
        return Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, redact(item)])
        );
      return value;
    };
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Token ${config.token}` },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'CATS',
          reason: 'cats_api_error',
          extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
          extractMessage: (failure, helpers) => {
            let response = helpers.getResponseWithBody(failure);
            return redact(
              helpers.extractMessage({ response }, { fallbackMessage: 'Request failed' })
            );
          }
        })
    });
    this.axios.interceptors.request.use(request => {
      validateNumber(request.params?.page, 'page');
      validateNumber(request.params?.per_page, 'perPage', 1, 100);
      if (isApiErrorRecord(request.data)) {
        for (let [key, value] of Object.entries(request.data)) {
          if (key.endsWith('_id') && key !== 'external_id') validateNumber(value, key);
        }
        if (isApiErrorRecord(request.data.data_item))
          validateNumber(request.data.data_item.id, 'regardingId');
        if (Array.isArray(request.data.triggers)) {
          for (let trigger of request.data.triggers) validateNumber(trigger?.id, 'trigger ID');
        }
        validateNumber(request.data.rating, 'rating', 0, 5);
        validateNumber(request.data.priority, 'priority', 1, 5);
        validateNumber(request.data.openings, 'openings', 0);
        if (
          request.method === 'put' &&
          !Object.values(request.data).some(value => value !== undefined)
        ) {
          throw createApiServiceError('Provide at least one field to update.');
        }
      }
      return request;
    });
    this.axios.interceptors.response.use(response => {
      response.data = redact(response.data);
      if (response.status === 201 && response.config.method === 'post') {
        let location = getResponseHeaderValue(response.headers, 'location');
        if (location) {
          let path = location.split(/[?#]/, 1)[0] ?? '';
          let id = path.replace(/\/$/, '').split('/').pop();
          if (id && /^[1-9]\d*$/.test(id)) {
            response.data = { ...(isApiErrorRecord(response.data) ? response.data : {}), id };
          }
        }
      }
      return response;
    });
  }

  async listCandidates(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/candidates', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getCandidate(candidateId: string) {
    let response = await this.axios.get(`/candidates/${requiredId(candidateId, 'resource')}`);
    return response.data;
  }

  async createCandidate(data: Record<string, any>, checkDuplicate?: boolean) {
    let response = await this.axios.post('/candidates', data, {
      params: checkDuplicate ? { check_duplicate: true } : undefined
    });
    return response.data;
  }

  async updateCandidate(candidateId: string, data: Record<string, any>) {
    let changes = pickDefined(data);
    if (!Object.keys(changes).length)
      throw createApiServiceError('Provide at least one field to update.');
    let current = await this.getCandidate(candidateId);
    requiredId(current?.id, 'candidate');
    data = {
      first_name: current.first_name,
      last_name: current.last_name,
      ...changes
    };
    if (typeof data.first_name !== 'string')
      throw createApiServiceError('CATS candidate update requires a valid first_name.');
    if (typeof data.last_name !== 'string')
      throw createApiServiceError('CATS candidate update requires a valid last_name.');
    let response = await this.axios.put(
      `/candidates/${requiredId(candidateId, 'resource')}`,
      data
    );
    return response.data;
  }

  async deleteCandidate(candidateId: string) {
    await this.axios.delete(`/candidates/${requiredId(candidateId, 'resource')}`);
  }

  async searchCandidates(query: string, params?: { page?: number; perPage?: number }) {
    if (!query.trim()) return this.listCandidates(params);
    let response = await this.axios.get('/candidates/search', {
      params: { query, page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async filterCandidates(
    filters: Record<string, any>,
    params?: { page?: number; perPage?: number }
  ) {
    if (!isApiErrorRecord(filters) || Object.keys(filters).length === 0)
      throw createApiServiceError('filters must be a nonempty JSON object.');
    let response = await this.axios.post('/candidates/search', filters, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getRecordTags(resourceType: string, resourceId: string) {
    let tags: Record<string, any>[] = [];
    for (let page = 1; page <= 1000; page++) {
      let data = (
        await this.axios.get(`/${resourceType}/${requiredId(resourceId, 'resource')}/tags`, {
          params: { page, per_page: 100 }
        })
      ).data;
      let items = collection(data, 'tags');
      tags.push(...items);
      if (items.length < 100 || (typeof data.total === 'number' && tags.length >= data.total))
        return tags;
    }
    throw createApiServiceError('Too many tag pages to retrieve.');
  }

  async createCandidateActivity(candidateId: string, data: Record<string, any>) {
    let response = await this.axios.post(
      `/candidates/${requiredId(candidateId, 'resource')}/activities`,
      data
    );
    return response.data;
  }

  async listJobs(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/jobs', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getJob(jobId: string) {
    let response = await this.axios.get(`/jobs/${requiredId(jobId, 'resource')}`);
    return response.data;
  }

  async createJob(data: Record<string, any>) {
    let response = await this.axios.post('/jobs', data);
    return response.data;
  }

  async updateJob(jobId: string, data: Record<string, any>) {
    if (!Object.keys(data).length)
      throw createApiServiceError('Provide at least one field to update.');
    let current = await this.getJob(jobId);
    requiredId(current?.id, 'job');
    data = {
      ...data,
      title: data.title ?? current.title,
      company_id: data.company_id ?? current.company_id,
      location: {
        ...(isApiErrorRecord(current.location) ? current.location : {}),
        ...pickDefined(data.location ?? {})
      }
    };
    if (
      typeof data.title !== 'string' ||
      data.company_id === undefined ||
      !Object.keys(data.location).length
    )
      throw createApiServiceError(
        'CATS returned a job without the required title, company, or location.'
      );
    let response = await this.axios.put(`/jobs/${requiredId(jobId, 'resource')}`, data);
    return response.data;
  }

  async deleteJob(jobId: string) {
    await this.axios.delete(`/jobs/${requiredId(jobId, 'resource')}`);
  }

  async searchJobs(query: string, params?: { page?: number; perPage?: number }) {
    if (!query.trim()) return this.listJobs(params);
    let response = await this.axios.get('/jobs/search', {
      params: { query, page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async filterJobs(
    filters: Record<string, any>,
    params?: { page?: number; perPage?: number }
  ) {
    if (!isApiErrorRecord(filters) || Object.keys(filters).length === 0)
      throw createApiServiceError('filters must be a nonempty JSON object.');
    let response = await this.axios.post('/jobs/search', filters, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getJobStatuses(params?: { page?: number; perPage?: number }) {
    return (
      await this.axios.get('/jobs/statuses', {
        params: { page: params?.page, per_page: params?.perPage }
      })
    ).data;
  }

  async changeJobStatus(jobId: string, data: Record<string, any>) {
    return (await this.axios.post(`/jobs/${requiredId(jobId, 'job')}/status`, data)).data;
  }

  async listCompanies(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/companies', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getCompany(companyId: string) {
    let response = await this.axios.get(`/companies/${requiredId(companyId, 'resource')}`);
    return response.data;
  }

  async createCompany(data: Record<string, any>) {
    let response = await this.axios.post('/companies', data);
    return response.data;
  }

  async updateCompany(companyId: string, data: Record<string, any>) {
    let changes = pickDefined(data);
    if (!Object.keys(changes).length)
      throw createApiServiceError('Provide at least one field to update.');
    let current = await this.getCompany(companyId);
    requiredId(current?.id, 'company');
    data = {
      name: current.name,
      owner_id: current.owner_id,
      ...changes
    };
    if (typeof data.name !== 'string')
      throw createApiServiceError('CATS company update requires a valid name.');
    if (typeof data.owner_id !== 'number')
      throw createApiServiceError('CATS company update requires a valid owner_id.');
    validateNumber(data.owner_id, 'owner_id');
    let response = await this.axios.put(
      `/companies/${requiredId(companyId, 'resource')}`,
      data
    );
    return response.data;
  }

  async deleteCompany(companyId: string) {
    await this.axios.delete(`/companies/${requiredId(companyId, 'resource')}`);
  }

  async searchCompanies(query: string, params?: { page?: number; perPage?: number }) {
    if (!query.trim()) return this.listCompanies(params);
    let response = await this.axios.get('/companies/search', {
      params: { query, page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async filterCompanies(
    filters: Record<string, any>,
    params?: { page?: number; perPage?: number }
  ) {
    if (!isApiErrorRecord(filters) || Object.keys(filters).length === 0)
      throw createApiServiceError('filters must be a nonempty JSON object.');
    let response = await this.axios.post('/companies/search', filters, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async listContacts(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/contacts', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/${requiredId(contactId, 'resource')}`);
    return response.data;
  }

  async createContact(data: Record<string, any>) {
    let response = await this.axios.post('/contacts', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    let changes = pickDefined(data);
    if (!Object.keys(changes).length)
      throw createApiServiceError('Provide at least one field to update.');
    let current = await this.getContact(contactId);
    requiredId(current?.id, 'contact');
    data = {
      first_name: current.first_name,
      last_name: current.last_name,
      owner_id: current.owner_id,
      company_id: current.company_id,
      ...changes
    };
    if (typeof data.first_name !== 'string')
      throw createApiServiceError('CATS contact update requires a valid first_name.');
    if (typeof data.last_name !== 'string')
      throw createApiServiceError('CATS contact update requires a valid last_name.');
    if (typeof data.owner_id !== 'number')
      throw createApiServiceError('CATS contact update requires a valid owner_id.');
    validateNumber(data.owner_id, 'owner_id');
    if (typeof data.company_id !== 'number')
      throw createApiServiceError('CATS contact update requires a valid company_id.');
    validateNumber(data.company_id, 'company_id');
    let response = await this.axios.put(
      `/contacts/${requiredId(contactId, 'resource')}`,
      data
    );
    return response.data;
  }

  async deleteContact(contactId: string) {
    await this.axios.delete(`/contacts/${requiredId(contactId, 'resource')}`);
  }

  async searchContacts(query: string, params?: { page?: number; perPage?: number }) {
    if (!query.trim()) return this.listContacts(params);
    let response = await this.axios.get('/contacts/search', {
      params: { query, page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async filterContacts(
    filters: Record<string, any>,
    params?: { page?: number; perPage?: number }
  ) {
    if (!isApiErrorRecord(filters) || Object.keys(filters).length === 0)
      throw createApiServiceError('filters must be a nonempty JSON object.');
    let response = await this.axios.post('/contacts/search', filters, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async createContactActivity(contactId: string, data: Record<string, any>) {
    let response = await this.axios.post(
      `/contacts/${requiredId(contactId, 'resource')}/activities`,
      data
    );
    return response.data;
  }

  async listPipelines(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/pipelines', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getPipeline(pipelineId: string) {
    let response = await this.axios.get(`/pipelines/${requiredId(pipelineId, 'resource')}`);
    return response.data;
  }

  async createPipeline(data: Record<string, any>) {
    let response = await this.axios.post('/pipelines', data);
    return response.data;
  }

  async updatePipeline(pipelineId: string, data: Record<string, any>) {
    let response = await this.axios.put(
      `/pipelines/${requiredId(pipelineId, 'resource')}`,
      data
    );
    return response.data;
  }

  async deletePipeline(pipelineId: string) {
    await this.axios.delete(`/pipelines/${requiredId(pipelineId, 'resource')}`);
  }

  async changePipelineStatus(pipelineId: string, data: Record<string, any>) {
    let response = await this.axios.post(
      `/pipelines/${requiredId(pipelineId, 'resource')}/status`,
      data
    );
    return response.data;
  }

  async listActivities(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/activities', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getActivity(activityId: string) {
    let response = await this.axios.get(`/activities/${requiredId(activityId, 'resource')}`);
    return response.data;
  }

  async listTasks(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/tasks', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await this.axios.get(`/tasks/${requiredId(taskId, 'resource')}`);
    return response.data;
  }

  async createTask(data: Record<string, any>) {
    let response = await this.axios.post('/tasks', data);
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/tasks/${requiredId(taskId, 'resource')}`, data);
    return response.data;
  }

  async deleteTask(taskId: string) {
    await this.axios.delete(`/tasks/${requiredId(taskId, 'resource')}`);
  }

  async listUsers(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/users', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async listTags(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/tags', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async listWorkflows(params?: { page?: number; perPage?: number }) {
    return (
      await this.axios.get('/pipelines/workflows', {
        params: { page: params?.page, per_page: params?.perPage }
      })
    ).data;
  }

  async listWorkflowStatuses(
    workflowId: string,
    params?: { page?: number; perPage?: number }
  ) {
    return (
      await this.axios.get(
        `/pipelines/workflows/${requiredId(workflowId, 'workflow')}/statuses`,
        { params: { page: params?.page, per_page: params?.perPage } }
      )
    ).data;
  }

  async getWorkflowStatus(workflowId: string, statusId: string) {
    return (
      await this.axios.get(
        `/pipelines/workflows/${requiredId(workflowId, 'workflow')}/statuses/${requiredId(statusId, 'status')}`
      )
    ).data;
  }

  async replaceTags(resourceType: string, resourceId: string, tags: { id: number }[]) {
    return (
      await this.axios.post(`/${resourceType}/${requiredId(resourceId, 'resource')}/tags`, {
        tags
      })
    ).data;
  }

  async attachTags(resourceType: string, resourceId: string, tags: { id: number }[]) {
    return (
      await this.axios.put(`/${resourceType}/${requiredId(resourceId, 'resource')}/tags`, {
        tags
      })
    ).data;
  }

  async setPipelineStatus(pipelineId: string, statusId: number, fireTriggers?: boolean) {
    validateNumber(statusId, 'statusId');
    let body: Record<string, any> = { status_id: statusId };
    if (fireTriggers !== undefined) {
      let pipeline = await this.getPipeline(pipelineId);
      let workflowId = requiredId(pipeline?.workflow_id, 'workflow');
      let status = await this.getWorkflowStatus(workflowId, String(statusId));
      if (!Array.isArray(status?.triggers))
        throw createApiServiceError('CATS returned a status without its trigger list.');
      body.triggers = status.triggers.map((trigger: any) => ({
        id: Number(requiredId(trigger?.id, 'trigger')),
        fire: fireTriggers
      }));
    }
    return this.changePipelineStatus(pipelineId, body);
  }

  async getSite() {
    let response = await this.axios.get('/site');
    return response.data;
  }
}
