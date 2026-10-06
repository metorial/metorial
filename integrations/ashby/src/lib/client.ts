import { ServiceError } from '@lowerdeck/error';
import {
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined,
  requestAxios
} from 'slates';
import {
  type AshbyAuth,
  credential,
  id,
  pageInput,
  providerFailure,
  type Row,
  row,
  rows,
  safeApiError,
  safeData,
  text,
  unexpected
} from './contracts';

export class AshbyClient {
  private readonly http: ReturnType<typeof createAuthenticatedAxios>;
  readonly warnings: string[] = [];
  constructor(private readonly auth: AshbyAuth) {
    const token = credential(auth.token);
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.ashbyhq.com',
      timeout: 60_000,
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      maxBodyLength: 2 * 1024 * 1024,
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}`
      },
      errorAdapter: safeApiError
    });
  }
  async post(endpoint: string, body: Row = {}): Promise<Row> {
    if (!/^\/[a-zA-Z]+\.[a-zA-Z]+$/.test(endpoint)) return unexpected();
    const data = pickDefined(body);
    safeData(data, this.auth);
    const response = await requestAxios(
      'Ashby request',
      () => this.http.post<unknown>(endpoint, data),
      safeApiError
    );
    if (response.status !== 200) throw safeApiError({ response: { status: response.status } });
    const envelope = row(response.data);
    if (envelope.success === false) return providerFailure(envelope);
    if (envelope.success !== true || !Object.hasOwn(envelope, 'results')) return unexpected();
    if (envelope.warnings !== undefined) {
      if (!Array.isArray(envelope.warnings)) return unexpected();
      for (const warning of envelope.warnings)
        this.warnings.push(
          warning === 'unable_to_add_application_metadata'
            ? warning
            : 'provider_warning_details_omitted'
        );
    }
    const { warnings: _warnings, ...result } = envelope;
    return row(safeData(result, this.auth));
  }
  async exact(endpoint: string, body: Row, expected: string): Promise<Row> {
    const response = await this.post(endpoint, body);
    if (row(response.results).id !== expected) return unexpected();
    return response;
  }
  async sequence(
    steps: { label: string; run: () => Promise<unknown> }[],
    confirmedResource?: () => Row
  ) {
    const completed: string[] = [];
    try {
      for (const step of steps) {
        await step.run();
        completed.push(step.label);
      }
    } catch (error) {
      if (!completed.length) throw error;
      const failure = createApiServiceError(
        `Ashby accepted these prior operations: ${completed.join(', ')}. The remaining operation or readback failed; completion may be unknown. Read the exact resource before retrying; operations are not atomic.`,
        {
          reason: 'ashby_partial_write',
          upstreamStatus:
            error instanceof ServiceError ? error.data.upstreamStatus : undefined,
          upstreamCode: error instanceof ServiceError ? error.data.upstreamCode : undefined
        }
      );
      failure.data.completedActions = completed;
      if (confirmedResource)
        failure.data.confirmedResource = safeData(confirmedResource(), this.auth);
      throw failure;
    }
    return completed;
  }
  getCandidate(candidateId: string) {
    const key = id(candidateId, 'Candidate ID');
    return this.exact('/candidate.info', { id: key }, key);
  }
  getApplication(applicationId: string, expand?: string[]) {
    const key = id(applicationId, 'Application ID');
    return this.exact('/application.info', { applicationId: key, expand }, key);
  }
  getJob(jobId: string) {
    const key = id(jobId, 'Job ID');
    return this.exact('/job.info', { id: key }, key);
  }
  getOffer(offerId: string) {
    const key = id(offerId, 'Offer ID');
    return this.exact('/offer.info', { offerId: key }, key);
  }
  async list(
    endpoint: string,
    params: { cursor?: string; perPage?: number; syncToken?: string },
    extra: Row = {}
  ) {
    const result = await this.post(endpoint, { ...pageInput(params), ...extra });
    if (result.moreDataAvailable === true && result.nextCursor === params.cursor)
      return unexpected();
    return result;
  }
  async findSchedule(scheduleId: string, applicationId?: string): Promise<Row> {
    const expected = id(scheduleId, 'Interview schedule ID');
    let cursor: string | undefined;
    const seen = new Set<string>();
    for (let page = 0; page < 100; page++) {
      const response = await this.list(
        '/interviewSchedule.list',
        { perPage: 100, cursor },
        { applicationId }
      );
      const matches = rows(response.results).filter(item => item.id === expected);
      if (matches.length > 1) return unexpected();
      if (matches.length === 1) {
        if (applicationId !== undefined && matches[0]?.applicationId !== applicationId)
          return unexpected();
        return { success: true, results: matches[0] };
      }
      if (response.moreDataAvailable === false)
        throw createApiServiceError(
          'The selected schedule was not found. Refresh schedule listing and verify application identity.',
          { reason: 'ashby_validation' }
        );
      if (
        response.moreDataAvailable !== true ||
        typeof response.nextCursor !== 'string' ||
        !response.nextCursor ||
        seen.has(response.nextCursor)
      )
        return unexpected();
      cursor = response.nextCursor;
      seen.add(cursor);
    }
    throw createApiServiceError(
      'Schedule lookup exceeded 100 pages. Provide the exact applicationId to narrow lookup before updating.',
      { reason: 'ashby_validation' }
    );
  }
  async roleId(value: string) {
    if (/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value))
      return id(value, 'Hiring role ID');
    text(value, 'Hiring role');
    const roles = rows((await this.post('/applicationHiringTeamRole.list')).results);
    const matches = roles.filter(role => role.name === value || role.title === value);
    if (matches.length !== 1)
      throw createApiServiceError(
        'Hiring role name is missing or ambiguous. Use list_organization hiring_roles and pass the exact role ID.',
        { reason: 'ashby_validation' }
      );
    return id(matches[0]?.id, 'Hiring role ID');
  }
}
