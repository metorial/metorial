import { createAxios, pickDefined } from 'slates';
import { z } from 'zod';
import { type AuthState, currentAuth, introspect } from './auth-state';
import {
  downloadUrl,
  errorFor,
  fail,
  id,
  type ListInput,
  listParams,
  nextCursor,
  opaque,
  optionalId,
  parsed,
  privateResponse,
  retiredAuth,
  timestamp
} from './helpers';
import {
  applicationSchema,
  appliedTagSchema,
  attachmentSchema,
  candidateSchema,
  departmentSchema,
  interviewSchema,
  jobSchema,
  noteSchema,
  offerSchema,
  officeSchema,
  rejectionReasonSchema,
  stageSchema,
  tagSchema,
  userSchema
} from './models';

export type Page<T> = { items: T[]; hasMore: boolean; nextCursor?: string };
type CandidateInput = {
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  emailAddresses?: { value: string; type: string }[];
  phoneNumbers?: { value: string; type: string }[];
  addresses?: { value: string; type: string }[];
  websiteAddresses?: { value: string; type: string }[];
  socialMediaAddresses?: { value: string; type: string }[];
  socialMediaUrls?: string[];
  tags?: string[];
  jobIds?: string[];
};

export class GreenhouseClient {
  private auth: ReturnType<typeof currentAuth>;
  constructor(auth: AuthState, config?: { onBehalfOf?: string }) {
    if (config?.onBehalfOf !== undefined) retiredAuth();
    this.auth = currentAuth(auth);
  }
  private requireScope(scope: string) {
    if (this.auth.scopes !== undefined && !this.auth.scopes.includes(scope))
      fail(
        `This connection lacks ${scope}. Grant that scope on the Harvest v3 credential, or ask Greenhouse Partner Support to enable it, then reconnect.`,
        'missing_scope'
      );
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    scope: string,
    params?: Record<string, unknown>,
    body?: unknown
  ) {
    this.requireScope(scope);
    const response = await createAxios({
      baseURL: 'https://harvest.greenhouse.io/v3',
      timeout: 30000,
      maxRedirects: 0,
      headers: {
        Authorization: `Bearer ${this.auth.token}`,
        'Content-Type': 'application/json'
      }
    })
      .request({ method, url: path, params, data: body })
      .catch(error => {
        throw errorFor(error, `${method} ${path.replace(/\d+/g, '{id}')}`);
      });
    privateResponse(response.data, this.auth);
    return response;
  }
  private async list<T>(
    path: string,
    schema: z.ZodType<T>,
    scope: string,
    input: ListInput = {},
    filters: Record<string, unknown> = {}
  ): Promise<Page<T>> {
    const response = await this.request('get', path, scope, listParams(input, filters));
    const items = parsed(z.array(schema), response.data);
    const cursor = nextCursor(response.headers, path);
    return { items, hasMore: cursor !== undefined, nextCursor: cursor };
  }
  private async all<T>(
    path: string,
    schema: z.ZodType<T>,
    scope: string,
    filters: Record<string, unknown> = {}
  ): Promise<T[]> {
    let page = await this.list(path, schema, scope, { perPage: 500 }, filters);
    const items = [...page.items];
    const cursors = new Set<string>();
    for (let count = 1; page.nextCursor !== undefined; count++) {
      if (count >= 25 || cursors.has(page.nextCursor))
        fail(
          'The Greenhouse lookup exceeded its bounded pagination limit. Narrow the selection in Greenhouse before trying again.',
          'lookup_limit'
        );
      cursors.add(page.nextCursor);
      page = await this.list(path, schema, scope, { cursor: page.nextCursor });
      items.push(...page.items);
    }
    return items;
  }
  private async one<T extends { id: number }>(
    path: string,
    schema: z.ZodType<T>,
    scope: string,
    resourceId: unknown
  ): Promise<T> {
    const target = id(resourceId);
    const page = await this.list(path, schema, scope, { perPage: 1 }, { ids: String(target) });
    if (page.items.length === 0)
      fail(
        'This resource was not returned for the authenticated account. Verify its ID and the connection’s scope and private-data permissions.',
        'not_found'
      );
    if (page.items.length !== 1 || page.hasMore || page.items[0]?.id !== target)
      fail('Greenhouse did not return the exact requested resource.', 'invalid_response');
    return page.items[0];
  }
  async getCurrentContext() {
    return introspect(this.auth);
  }
  async listCandidates(input: ListInput & { email?: string; jobId?: string } = {}) {
    if (input.jobId !== undefined)
      fail(
        'Harvest v3 cannot filter candidates by jobId. Use list_applications with jobId, then get_candidate for the returned candidate IDs.'
      );
    return this.list('/candidates', candidateSchema, 'harvest:candidates:list', input, {
      email: input.email
    });
  }
  getCandidate(candidateId: unknown) {
    return this.one('/candidates', candidateSchema, 'harvest:candidates:list', candidateId);
  }
  private candidateBody(data: CandidateInput) {
    if (data.socialMediaAddresses !== undefined)
      fail(
        'Harvest v3 social profiles are untyped. Use socialMediaUrls; socialMediaAddresses with platform types cannot be preserved.'
      );
    const body = pickDefined({
      first_name: data.firstName,
      last_name: data.lastName,
      company: data.company,
      title: data.title,
      email_addresses: data.emailAddresses,
      phone_numbers: data.phoneNumbers,
      addresses: data.addresses,
      website_addresses: data.websiteAddresses,
      social_media_addresses: data.socialMediaUrls?.map(value => ({ value })),
      tags: data.tags
    });
    for (const value of [data.firstName, data.lastName])
      if (value !== undefined && !value.trim())
        fail('Candidate names must be nonempty when provided.');
    for (const contacts of [
      data.emailAddresses,
      data.phoneNumbers,
      data.addresses,
      data.websiteAddresses
    ])
      if (contacts?.some(contact => !contact.value.trim()))
        fail('Contact values must be nonempty.');
    if (
      data.socialMediaUrls?.some(value => !value.trim()) ||
      data.tags?.some(value => !value.trim())
    )
      fail('Social profiles and tag names must be nonempty.');
    return body;
  }
  async createCandidate(data: CandidateInput & { firstName: string; lastName: string }) {
    const body = this.candidateBody(data);
    if ((data.jobIds?.length ?? 0) > 1)
      fail(
        'Harvest v3 creates at most one application with a candidate. Supply one job ID, or create additional applications in Greenhouse; no extra application writes are performed.'
      );
    const jobId = data.jobIds?.[0] === undefined ? undefined : id(data.jobIds[0], 'Job ID');
    const response = await this.request(
      'post',
      '/candidates',
      'harvest:candidates:create',
      undefined,
      { ...body, ...(jobId === undefined ? {} : { application: { job_id: jobId } }) }
    );
    const result = parsed(
      z.object({
        candidate: candidateSchema,
        application: applicationSchema.nullable().optional()
      }),
      response.data
    );
    if (result.application && result.application.candidate_id !== result.candidate.id)
      fail(
        'Greenhouse returned an application belonging to another candidate. Review the created candidate before retrying.',
        'invalid_response'
      );
    if (
      jobId !== undefined &&
      (!result.application ||
        result.application.candidate_id !== result.candidate.id ||
        result.application.job_id !== jobId)
    )
      fail(
        'Greenhouse did not confirm the created candidate’s requested application. Review the candidate before retrying.',
        'invalid_response'
      );
    this.confirmCandidateFields(result.candidate, body);
    return result;
  }
  private confirmCandidateFields(
    result: z.infer<typeof candidateSchema>,
    body: Record<string, unknown>
  ) {
    const canonical = (value: unknown): unknown =>
      Array.isArray(value)
        ? value
            .map(canonical)
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
        : value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, entry]) => [key, canonical(entry)])
            )
          : value;
    for (const [key, value] of Object.entries(body)) {
      if (
        JSON.stringify(canonical(result[key as keyof typeof result])) !==
        JSON.stringify(canonical(value))
      )
        fail(
          'Greenhouse did not confirm all requested candidate fields. Review the candidate before retrying; the write may have completed.',
          'invalid_response'
        );
    }
  }
  async updateCandidate(candidateId: unknown, data: CandidateInput) {
    const target = id(candidateId, 'Candidate ID');
    const body = this.candidateBody(data);
    if (!Object.keys(body).length) fail('Provide at least one candidate field to update.');
    const response = await this.request(
      'patch',
      `/candidates/${target}`,
      'harvest:candidates:update',
      undefined,
      body
    );
    const result = parsed(candidateSchema, response.data);
    if (result.id !== target)
      fail(
        'Greenhouse did not confirm the requested candidate update. Review it before retrying.',
        'invalid_response'
      );
    this.confirmCandidateFields(result, body);
    return result;
  }
  async addCandidateNote(
    candidateId: unknown,
    data: { userId: string; body: string; visibility: 'admin_only' | 'private' | 'public' }
  ) {
    const target = id(candidateId, 'Candidate ID');
    const author = id(data.userId, 'User ID');
    if (!data.body.trim()) fail('Provide nonempty note content.');
    const response = await this.request('post', '/notes', 'harvest:notes:create', undefined, {
      candidate_id: target,
      user_id: author,
      body: data.body,
      visibility: data.visibility,
      note_type: 'NOTE'
    });
    const result = parsed(noteSchema, response.data);
    if (
      result.candidate_id !== target ||
      result.user_id !== author ||
      result.body !== data.body ||
      result.visibility !== data.visibility ||
      result.type !== 'NOTE'
    )
      fail(
        'Greenhouse did not confirm the requested note and author. Review the candidate before retrying; the note may have been created.',
        'invalid_response'
      );
    return result;
  }
  async manageCandidateTag(candidateId: unknown, action: 'add' | 'remove', tagName: string) {
    const target = id(candidateId, 'Candidate ID');
    opaque(tagName, 'Tag name');
    await this.getCandidate(target);
    const tags = await this.all('/candidate_tags', tagSchema, 'harvest:candidate_tags:list');
    const matches = tags.filter(tag => tag.name === tagName);
    if (matches.length !== 1)
      fail(
        'Select a unique existing candidate tag in Greenhouse. This tool does not create or delete organization-wide tag definitions.'
      );
    const tagId = matches[0]?.id;
    const memberships = await this.all(
      '/applied_candidate_tags',
      appliedTagSchema,
      'harvest:applied_candidate_tags:list',
      { candidate_ids: String(target), candidate_tag_ids: String(tagId) }
    );
    if (
      memberships.some(row => row.candidate_id !== target || row.candidate_tag_id !== tagId) ||
      memberships.length > 1
    )
      fail('Greenhouse did not return an exact candidate-tag membership.', 'invalid_response');
    if (action === 'add' && !memberships.length) {
      const response = await this.request(
        'post',
        '/applied_candidate_tags',
        'harvest:applied_candidate_tags:create',
        undefined,
        { candidate_id: target, candidate_tag_id: tagId }
      );
      const row = parsed(appliedTagSchema, response.data);
      if (row.candidate_id !== target || row.candidate_tag_id !== tagId)
        fail(
          'Greenhouse did not confirm the requested tag membership. Review the candidate before retrying.',
          'invalid_response'
        );
    }
    if (action === 'remove' && memberships[0])
      await this.request(
        'delete',
        `/applied_candidate_tags/${memberships[0].id}`,
        'harvest:applied_candidate_tags:destroy'
      );
    const after = await this.all(
      '/applied_candidate_tags',
      appliedTagSchema,
      'harvest:applied_candidate_tags:list',
      { candidate_ids: String(target), candidate_tag_ids: String(tagId) }
    );
    if (
      after.some(row => row.candidate_id !== target || row.candidate_tag_id !== tagId) ||
      (action === 'add' ? after.length !== 1 : after.length !== 0)
    )
      fail(
        'The candidate-tag change could not be confirmed. Review the candidate before retrying.',
        'invalid_response'
      );
    return { success: true, candidateId: String(target), action, tagName };
  }
  listApplications(
    input: ListInput & { jobId?: string; candidateId?: string; status?: string } = {}
  ) {
    return this.list('/applications', applicationSchema, 'harvest:applications:list', input, {
      job_ids: optionalId(input.jobId, 'Job ID'),
      candidate_ids: optionalId(input.candidateId, 'Candidate ID'),
      status: input.status
    });
  }
  getApplication(applicationId: unknown) {
    return this.one(
      '/applications',
      applicationSchema,
      'harvest:applications:list',
      applicationId
    );
  }
  async advanceApplication(
    applicationId: unknown,
    data: { action: 'advance' | 'move'; fromStageId?: string; toStageId?: string }
  ) {
    const target = id(applicationId, 'Application ID');
    if (data.action === 'advance' && data.toStageId !== undefined)
      fail('Omit toStageId for automatic advance. Use action move to choose a target stage.');
    if (
      data.action === 'move' &&
      (data.fromStageId === undefined || data.toStageId === undefined)
    )
      fail(
        'Provide fromStageId and toStageId for move. Read get_application and get_job with includeStages first.'
      );
    const from = optionalId(data.fromStageId, 'Current stage ID');
    const to = optionalId(data.toStageId, 'Target stage ID');
    const before = await this.getApplication(target);
    const currentStage = before.job_interview_stage_id;
    if (
      before.status !== 'in_process' ||
      !currentStage ||
      !before.job_id ||
      (from !== undefined && from !== currentStage)
    )
      fail(
        'The application is not active in the specified current job interview stage. Read its latest state before moving it.'
      );
    if (to !== undefined) {
      const stages = await this.getJobStages(before.job_id);
      if (
        !stages.some(stage => stage.id === to && stage.active === true) ||
        to === currentStage
      )
        fail(
          'Select a different active interview stage belonging to the application’s current job.'
        );
    }
    await this.request(
      'post',
      `/applications/${target}/move`,
      'harvest:applications:move',
      undefined,
      pickDefined({ from_stage_id: from ?? currentStage, to_stage_id: to })
    );
    const after = await this.getApplication(target);
    if (
      after.candidate_id !== before.candidate_id ||
      after.job_id !== before.job_id ||
      !after.job_interview_stage_id ||
      (to === undefined
        ? after.job_interview_stage_id === currentStage
        : after.job_interview_stage_id !== to)
    )
      fail(
        'The application’s stage change could not be confirmed. Review its stage history before retrying; automated transition rules may have run.',
        'invalid_response'
      );
    return {
      success: true,
      applicationId: String(target),
      action: data.action,
      currentStageId: String(after.job_interview_stage_id)
    };
  }
  async rejectApplication(
    applicationId: unknown,
    data: {
      rejectionReasonId?: string;
      notes?: string;
      sendRejectionEmail?: boolean;
      emailTemplateId?: string;
      sendEmailAt?: string;
      emailFromUserId?: string;
    }
  ) {
    const target = id(applicationId, 'Application ID');
    if (data.rejectionReasonId === undefined)
      fail(
        'Harvest v3 requires rejectionReasonId. Discover a valid reason with list_rejection_reasons.'
      );
    const reason = id(data.rejectionReasonId, 'Rejection reason ID');
    let email: Record<string, unknown> | undefined;
    if (data.sendRejectionEmail) {
      if (data.emailTemplateId === undefined || data.sendEmailAt === undefined)
        fail('Provide emailTemplateId and sendEmailAt when requesting a rejection email.');
      timestamp(data.sendEmailAt, 'Send email timestamp');
      email = pickDefined({
        email_template_id: id(data.emailTemplateId, 'Email template ID'),
        send_email_at: data.sendEmailAt,
        email_from_user_id: optionalId(data.emailFromUserId, 'Email sender user ID')
      });
    } else if (
      data.emailTemplateId !== undefined ||
      data.sendEmailAt !== undefined ||
      data.emailFromUserId !== undefined
    )
      fail('Email fields require sendRejectionEmail true.');
    const before = await this.getApplication(target);
    await this.request(
      'post',
      `/applications/${target}/reject`,
      'harvest:applications:reject',
      undefined,
      pickDefined({ rejection_reason_id: reason, notes: data.notes, rejection_email: email })
    );
    const after = await this.getApplication(target);
    if (
      after.candidate_id !== before.candidate_id ||
      after.job_id !== before.job_id ||
      after.status !== 'rejected' ||
      after.rejection_reason_id !== reason
    )
      fail(
        'The requested rejection could not be confirmed. Review the application before retrying; emails or history may already have changed.',
        'invalid_response'
      );
    return {
      success: true,
      applicationId: String(target),
      rejectionReasonId: String(reason),
      emailRequested: data.sendRejectionEmail === true
    };
  }
  listJobs(
    input: ListInput & { status?: string; departmentId?: string; officeId?: string } = {}
  ) {
    return this.list('/jobs', jobSchema, 'harvest:jobs:list', input, {
      status: input.status,
      department_id: optionalId(input.departmentId, 'Department ID'),
      office_id: optionalId(input.officeId, 'Office ID')
    });
  }
  getJob(jobId: unknown) {
    return this.one('/jobs', jobSchema, 'harvest:jobs:list', jobId);
  }
  async createJob(data: {
    templateJobId: string;
    numberOfOpenings?: number;
    jobName?: string;
    departmentId?: string;
    officeIds?: string[];
  }) {
    const templateId = id(data.templateJobId, 'Template job ID');
    if (
      data.numberOfOpenings === undefined ||
      !Number.isInteger(data.numberOfOpenings) ||
      data.numberOfOpenings < 0 ||
      data.numberOfOpenings > 200
    )
      fail('Harvest v3 requires numberOfOpenings, a whole number between 0 and 200.');
    const response = await this.request(
      'post',
      '/jobs',
      'harvest:jobs:create',
      undefined,
      pickDefined({
        template_job_id: templateId,
        number_of_openings: data.numberOfOpenings,
        job_name: data.jobName,
        department_id: optionalId(data.departmentId, 'Department ID'),
        office_ids: data.officeIds?.map(value => id(value, 'Office ID'))
      })
    );
    const result = parsed(jobSchema, response.data);
    if (
      result.id === templateId ||
      result.copied_from_id !== templateId ||
      (data.jobName !== undefined && result.name !== data.jobName)
    )
      fail(
        'Greenhouse did not confirm the requested new job and source template. Review jobs before retrying.',
        'invalid_response'
      );
    return result;
  }
  async getJobStages(jobId: unknown) {
    const target = id(jobId, 'Job ID');
    const stages = await this.all(
      '/job_interview_stages',
      stageSchema,
      'harvest:job_interview_stages:list',
      { job_ids: String(target) }
    );
    if (stages.some(stage => stage.job_id !== target))
      fail('Greenhouse returned stages belonging to another job.', 'invalid_response');
    return stages;
  }
  listOffers(input: ListInput & { applicationId?: string; status?: string } = {}) {
    if (input.status === 'sent')
      fail(
        'Harvest v3 does not expose a sent offer status. Omit status and inspect the returned sentAt date.'
      );
    const statuses: Record<string, string> = {
      created: 'Created',
      accepted: 'Accepted',
      rejected: 'Rejected',
      deprecated: 'Deprecated'
    };
    return this.list('/offers', offerSchema, 'harvest:offers:list', input, {
      application_ids: optionalId(input.applicationId, 'Application ID'),
      status: input.status === undefined ? undefined : statuses[input.status]
    });
  }
  listUsers(input: ListInput & { email?: string } = {}) {
    return this.list('/users', userSchema, 'harvest:users:list', input, {
      primary_email: input.email
    });
  }
  getUser(userId: unknown) {
    return this.one('/users', userSchema, 'harvest:users:list', userId);
  }
  listDepartments(input: ListInput = {}) {
    return this.list('/departments', departmentSchema, 'harvest:departments:list', input);
  }
  listOffices(input: ListInput = {}) {
    return this.list('/offices', officeSchema, 'harvest:offices:list', input);
  }
  listScheduledInterviews(input: ListInput & { applicationId?: string } = {}) {
    return this.list('/interviews', interviewSchema, 'harvest:interviews:list', input, {
      application_ids: optionalId(input.applicationId, 'Application ID')
    });
  }
  listRejectionReasons(input: ListInput = {}) {
    return this.list(
      '/rejection_reasons',
      rejectionReasonSchema,
      'harvest:rejection_reasons:list',
      input
    );
  }
  async listApplicationAttachments(input: ListInput & { applicationId: string }) {
    const target = id(input.applicationId, 'Application ID');
    const page = await this.list(
      '/attachments',
      attachmentSchema,
      'harvest:attachments:list',
      { perPage: input.perPage, cursor: input.cursor, page: input.page },
      input.cursor === undefined ? { application_ids: String(target) } : {}
    );
    if (page.items.some(row => row.application_id !== target))
      fail('Greenhouse returned files belonging to another application.', 'invalid_response');
    return page;
  }
  async getApplicationFile(applicationId: unknown, attachmentId: unknown) {
    const application = id(applicationId, 'Application ID');
    const target = id(attachmentId, 'File ID');
    const startedAt = Date.now();
    const row = await this.one(
      '/attachments',
      attachmentSchema,
      'harvest:attachments:list',
      target
    );
    if (row.application_id !== application)
      fail(
        'The selected file does not belong to the requested application.',
        'invalid_file_reference'
      );
    const fileName = opaque(row.filename, 'Returned filename');
    if (fileName.includes('/') || fileName.includes('\\'))
      fail('Greenhouse returned an unsafe filename.', 'invalid_response');
    return {
      applicationId: String(application),
      attachmentId: String(target),
      fileName,
      type: row.type,
      url: downloadUrl(row.url),
      expiresAt: new Date(startedAt + 7 * 86400000).toISOString()
    };
  }
}
