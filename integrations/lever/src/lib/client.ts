import { createAuthenticatedAxios, pickDefined, requestAxios } from 'slates';
import {
  authorization,
  baseUrl,
  canonical,
  ensureNoSecrets,
  id,
  integer,
  invalid,
  type LeverAuth,
  pathId,
  type Resource,
  type Row,
  resource,
  row,
  safeApiError,
  text,
  unexpected,
  writable
} from './contracts';

export type ClientConfig = LeverAuth;
export const userFields = [
  'name',
  'email',
  'accessRole',
  'externalDirectoryId',
  'jobTitle',
  'managerId'
] as const;
export const requisitionFields = [
  'name',
  'headcountTotal',
  'requisitionCode',
  'backfill',
  'compensationBand',
  'createdAt',
  'customFields',
  'employmentStatus',
  'hiringManager',
  'internalNotes',
  'location',
  'owner',
  'status',
  'team',
  'postingIds',
  'timeToFillStartAt',
  'timeToFillEndAt'
] as const;
export const interviewFields = [
  'panel',
  'subject',
  'note',
  'interviewers',
  'date',
  'duration',
  'location',
  'feedbackTemplate',
  'feedbackReminder',
  'conferenceData'
] as const;

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(private auth: ClientConfig) {
    this.http = createAuthenticatedAxios({
      baseURL: baseUrl(auth),
      authHeader: { value: authorization(auth) },
      timeout: 30000,
      maxRedirects: 0
    });
  }
  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    data?: Row,
    params?: Row
  ): Promise<unknown> {
    const response = await requestAxios(
      `API ${method.toUpperCase()}`,
      () => this.http.request<unknown>({ method, url: path, data, params }),
      safeApiError
    );
    const expected = method === 'get' ? [200] : method === 'delete' ? [200, 204] : [200, 201];
    if (!expected.includes(response.status)) unexpected();
    ensureNoSecrets(response.data, this.auth);
    return response.data;
  }
  private async read(
    path: string,
    expectedId: string,
    params?: Row
  ): Promise<{ data: Resource }> {
    return { data: resource(await this.request('get', path, undefined, params), expectedId) };
  }
  private async write(
    method: 'post' | 'put',
    path: string,
    data: Row,
    params?: Row,
    expectedId?: string
  ) {
    return { data: resource(await this.request(method, path, data, params), expectedId) };
  }
  private actor(value: string | undefined): Row {
    return { perform_as: id(value, 'Acting user ID; discover it with list_users') };
  }
  private combine(before: Row, changes: Row): Row {
    const result = { ...before };
    for (const [key, value] of Object.entries(changes)) {
      const prior = before[key];
      result[key] =
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        prior &&
        typeof prior === 'object' &&
        !Array.isArray(prior)
          ? this.combine(row(prior), row(value))
          : value;
    }
    return result;
  }
  private async merge(
    path: string,
    expectedId: string,
    fields: readonly string[],
    changes: Row
  ): Promise<Row> {
    const before = (await this.read(path, expectedId)).data;
    const body = { ...writable(before, fields), ...pickDefined(changes) };
    if (fields === interviewFields) {
      if (
        Array.isArray(before.conferences) &&
        before.conferences.length &&
        changes.conferenceData === undefined
      )
        invalid(
          'This interview has conference details that cannot be safely preserved from readback. Update it in Lever.'
        );
      if (!Array.isArray(body.interviewers) || !body.interviewers.length) unexpected();
      body.interviewers = body.interviewers.map(value => {
        const interviewer = row(value);
        return pickDefined({
          id: id(interviewer.id, 'Returned interviewer ID'),
          feedbackTemplate: interviewer.feedbackTemplate
        });
      });
    }
    for (const key of ['compensationBand', 'customFields'])
      if (changes[key] !== undefined && before[key] !== undefined)
        body[key] = this.combine(row(before[key]), row(changes[key]));
    if (fields === userFields) {
      text(body.name, 'Returned user name');
      text(body.email, 'Returned user email');
      if (
        ![
          'super admin',
          'admin',
          'team member',
          'limited team member',
          'interviewer'
        ].includes(String(body.accessRole))
      )
        unexpected();
    }
    if (fields === requisitionFields) {
      text(body.name, 'Returned requisition name');
      text(body.requisitionCode, 'Returned requisition code');
      if (body.headcountTotal !== 'unlimited')
        integer(body.headcountTotal, 'Returned requisition headcount', 0);
    }
    if (fields === interviewFields) {
      id(body.panel, 'Returned interview panel');
      integer(body.date, 'Returned interview timestamp', 0);
      integer(body.duration, 'Returned interview duration', 1);
    }
    const current = (await this.read(path, expectedId)).data;
    if (canonical(writable(current, fields)) !== canonical(writable(before, fields)))
      invalid('The exact resource changed during readback. Read it again before updating.');
    return body;
  }
  listOpportunities(params?: Row) {
    return this.request('get', '/opportunities', undefined, params);
  }
  getOpportunity(opportunityId: string, params?: Row) {
    return this.read(`/opportunities/${pathId(opportunityId)}`, id(opportunityId), params);
  }
  async createOpportunity(data: Row, actor?: string) {
    const result = await this.write('post', '/opportunities', data, this.actor(actor));
    return {
      data: { ...result.data, contact: id(result.data.contact, 'Returned contact ID') }
    };
  }
  async updateOpportunityStage(opportunityId: string, stageId: string) {
    await this.request('put', `/opportunities/${pathId(opportunityId)}/stage`, {
      stage: id(stageId)
    });
  }
  async updateOpportunityArchived(opportunityId: string, reasonId?: string) {
    await this.request('put', `/opportunities/${pathId(opportunityId)}/archived`, {
      reason: id(reasonId, 'Archive reason ID; discover it with get_pipeline_metadata')
    });
  }
  async deleteOpportunityArchived(opportunityId: string) {
    await this.request('put', `/opportunities/${pathId(opportunityId)}/archived`, {
      reason: null
    });
  }
  async addOpportunityTags(opportunityId: string, tags: string[]) {
    await this.request('post', `/opportunities/${pathId(opportunityId)}/addTags`, { tags });
  }
  async removeOpportunityTags(opportunityId: string, tags: string[]) {
    await this.request('post', `/opportunities/${pathId(opportunityId)}/removeTags`, { tags });
  }
  async addOpportunityLinks(opportunityId: string, links: string[]) {
    await this.request('post', `/opportunities/${pathId(opportunityId)}/addLinks`, { links });
  }
  async removeOpportunityLinks(opportunityId: string, links: string[]) {
    await this.request('post', `/opportunities/${pathId(opportunityId)}/removeLinks`, {
      links
    });
  }
  async addOpportunitySources(opportunityId: string, sources: string[]) {
    await this.request('post', `/opportunities/${pathId(opportunityId)}/addSources`, {
      sources
    });
  }
  async removeOpportunitySources(opportunityId: string, sources: string[]) {
    await this.request('post', `/opportunities/${pathId(opportunityId)}/removeSources`, {
      sources
    });
  }
  listOpportunityApplications(opportunityId: string, params?: Row) {
    return this.request(
      'get',
      `/opportunities/${pathId(opportunityId)}/applications`,
      undefined,
      params
    );
  }
  getContact(contactId: string) {
    return this.read(`/contacts/${pathId(contactId)}`, id(contactId));
  }
  async updateContact(contactId: string, data: Row) {
    const path = `/contacts/${pathId(contactId)}`;
    const body = await this.merge(
      path,
      id(contactId),
      ['name', 'headline', 'location', 'emails', 'phones'],
      data
    );
    if (data.location === undefined && body.location && typeof body.location === 'object') {
      const location = row(body.location);
      // Free-text locations read back as {name}; writable objects require a country.
      if (Object.keys(location).length === 1 && typeof location.name === 'string')
        body.location = text(location.name, 'Returned contact location', true);
      else if (typeof location.country !== 'string' || !/^[A-Za-z]{2}$/.test(location.country))
        invalid(
          'The current contact location cannot be safely preserved. Provide a complete free-text location or update the contact in Lever.'
        );
    }
    return this.write('put', path, body, undefined, id(contactId));
  }
  listPostings(params?: Row) {
    return this.request('get', '/postings', undefined, params);
  }
  getPosting(postingId: string) {
    return this.read(`/postings/${pathId(postingId)}`, id(postingId));
  }
  createPosting(data: Row, actor?: string) {
    return this.write('post', '/postings', data, this.actor(actor));
  }
  async updatePosting(postingId: string, data: Row, actor?: string, before?: Row) {
    const current = (await this.getPosting(postingId)).data;
    const nested = ['categories', 'content'].filter(key => data[key] !== undefined);
    if (before && canonical(writable(current, nested)) !== canonical(writable(before, nested)))
      invalid(
        'Posting content or categories changed during readback. Read it again before updating.'
      );
    return this.write(
      'post',
      `/postings/${pathId(postingId)}`,
      data,
      this.actor(actor),
      id(postingId)
    );
  }
  listOpportunityInterviews(opportunityId: string, params?: Row) {
    return this.request(
      'get',
      `/opportunities/${pathId(opportunityId)}/interviews`,
      undefined,
      params
    );
  }
  getInterview(opportunityId: string, interviewId: string) {
    return this.read(
      `/opportunities/${pathId(opportunityId)}/interviews/${pathId(interviewId)}`,
      id(interviewId)
    );
  }
  async createInterview(opportunityId: string, panelId: string, data: Row, actor?: string) {
    const panel = (await this.getPanel(opportunityId, panelId)).data;
    if (panel.externallyManaged !== true)
      invalid('Only an externally managed panel can receive API-created interviews.');
    return this.write(
      'post',
      `/opportunities/${pathId(opportunityId)}/interviews`,
      { ...data, panel: id(panelId) },
      this.actor(actor)
    );
  }
  async updateInterview(
    opportunityId: string,
    interviewId: string,
    data: Row,
    actor?: string
  ) {
    const path = `/opportunities/${pathId(opportunityId)}/interviews/${pathId(interviewId)}`;
    const body = await this.merge(path, id(interviewId), interviewFields, data);
    const panel = (await this.getPanel(opportunityId, id(body.panel, 'Interview panel ID')))
      .data;
    if (panel.externallyManaged !== true)
      invalid('Only interviews in externally managed panels can be updated.');
    // Read responses expose conferences rather than writable conferenceData. A replacement PUT must not silently erase them.
    return this.write('put', path, body, this.actor(actor), id(interviewId));
  }
  async deleteInterview(opportunityId: string, interviewId: string, actor?: string) {
    const before = (await this.getInterview(opportunityId, interviewId)).data;
    const panel = (await this.getPanel(opportunityId, id(before.panel, 'Interview panel ID')))
      .data;
    if (panel.externallyManaged !== true)
      invalid('Only interviews in externally managed panels can be deleted.');
    await this.request(
      'delete',
      `/opportunities/${pathId(opportunityId)}/interviews/${pathId(interviewId)}`,
      undefined,
      this.actor(actor)
    );
  }
  listOpportunityPanels(opportunityId: string, params?: Row) {
    return this.request(
      'get',
      `/opportunities/${pathId(opportunityId)}/panels`,
      undefined,
      params
    );
  }
  getPanel(opportunityId: string, panelId: string) {
    return this.read(
      `/opportunities/${pathId(opportunityId)}/panels/${pathId(panelId)}`,
      id(panelId)
    );
  }
  listOpportunityFeedback(opportunityId: string, params?: Row) {
    return this.request(
      'get',
      `/opportunities/${pathId(opportunityId)}/feedback`,
      undefined,
      params
    );
  }
  listOpportunityNotes(opportunityId: string, params?: Row) {
    return this.request(
      'get',
      `/opportunities/${pathId(opportunityId)}/notes`,
      undefined,
      params
    );
  }
  getNote(opportunityId: string, noteId: string) {
    return this.read(
      `/opportunities/${pathId(opportunityId)}/notes/${pathId(noteId)}`,
      id(noteId)
    );
  }
  async createNote(opportunityId: string, data: Row) {
    const envelope = row(
      await this.request('post', `/opportunities/${pathId(opportunityId)}/notes`, data)
    );
    const receipt = row(envelope.data);
    const noteId = id(receipt.noteId ?? receipt.id, 'Returned note ID');
    return this.getNote(opportunityId, noteId);
  }
  listOpportunityOffers(opportunityId: string, params?: Row) {
    return this.request(
      'get',
      `/opportunities/${pathId(opportunityId)}/offers`,
      undefined,
      params
    );
  }
  listOpportunityResumes(opportunityId: string, params?: Row) {
    return this.request(
      'get',
      `/opportunities/${pathId(opportunityId)}/resumes`,
      undefined,
      params
    );
  }
  listOpportunityFiles(opportunityId: string, params?: Row) {
    return this.request(
      'get',
      `/opportunities/${pathId(opportunityId)}/files`,
      undefined,
      params
    );
  }
  getFile(opportunityId: string, fileId: string, kind: 'files' | 'resumes') {
    return this.read(
      `/opportunities/${pathId(opportunityId)}/${kind}/${pathId(fileId)}`,
      id(fileId)
    );
  }
  listOpportunityReferrals(opportunityId: string, params?: Row) {
    return this.request(
      'get',
      `/opportunities/${pathId(opportunityId)}/referrals`,
      undefined,
      params
    );
  }
  listUsers(params?: Row) {
    return this.request('get', '/users', undefined, params);
  }
  getUser(userId: string) {
    return this.read(`/users/${pathId(userId)}`, id(userId));
  }
  createUser(data: Row) {
    return this.write('post', '/users', data);
  }
  async updateUser(userId: string, data: Row) {
    const path = `/users/${pathId(userId)}`;
    return this.write(
      'put',
      path,
      await this.merge(path, id(userId), userFields, data),
      undefined,
      id(userId)
    );
  }
  async deactivateUser(userId: string) {
    await this.getUser(userId);
    return this.write(
      'post',
      `/users/${pathId(userId)}/deactivate`,
      {},
      undefined,
      id(userId)
    );
  }
  async reactivateUser(userId: string) {
    await this.getUser(userId);
    return this.write(
      'post',
      `/users/${pathId(userId)}/reactivate`,
      {},
      undefined,
      id(userId)
    );
  }
  listStages(params?: Row) {
    return this.request('get', '/stages', undefined, params);
  }
  listArchiveReasons(params?: Row) {
    return this.request('get', '/archive_reasons', undefined, params);
  }
  listSources(params?: Row) {
    return this.request('get', '/sources', undefined, params);
  }
  listTags(params?: Row) {
    return this.request('get', '/tags', undefined, params);
  }
  listFeedbackTemplates(params?: Row) {
    return this.request('get', '/feedback_templates', undefined, params);
  }
  listRequisitions(params?: Row) {
    return this.request('get', '/requisitions', undefined, params);
  }
  getRequisition(requisitionId: string) {
    return this.read(`/requisitions/${pathId(requisitionId)}`, id(requisitionId));
  }
  createRequisition(data: Row) {
    return this.write('post', '/requisitions', data);
  }
  async updateRequisition(requisitionId: string, data: Row) {
    const path = `/requisitions/${pathId(requisitionId)}`;
    return this.write(
      'put',
      path,
      await this.merge(path, id(requisitionId), requisitionFields, data),
      undefined,
      id(requisitionId)
    );
  }
  async deleteRequisition(requisitionId: string) {
    await this.getRequisition(requisitionId);
    await this.request('delete', `/requisitions/${pathId(requisitionId)}`);
  }
}
