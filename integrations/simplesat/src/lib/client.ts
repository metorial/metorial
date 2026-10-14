import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Survey {
  id: number;
  name: string;
  brand_name: string;
  metric: string;
  survey_type: string;
  survey_token: string;
}

export interface QuestionChoice {
  label: string;
  value: string;
}

export interface QuestionRule {
  condition: string;
  value: string;
}

export interface Question {
  id: number;
  text: string;
  metric: string;
  order: number;
  rating_scale: number | boolean | null;
  type?: string;
  required: boolean;
  choices: (string | QuestionChoice)[];
  rules: QuestionRule[];
  survey: {
    id: number;
    name: string;
  };
}

export interface AnswerQuestion {
  id: number;
  text: string;
}

export interface AnswerSurvey {
  id: number;
  name: string;
}

export interface Answer {
  id: number;
  choice: string | null;
  choice_label?: string | null;
  created: string;
  modified: string;
  follow_up_answer: string | null;
  published_as_testimonial: boolean;
  question: AnswerQuestion;
  response_id: number;
  sentiment: string | null;
  survey: AnswerSurvey;
}

export interface ResponseCustomer {
  name: string | null;
  email: string | null;
  company: string | null;
}

export interface ResponseTicket {
  id: number | string | null;
  external_id?: string | null;
  subject: string | null;
}

export interface ResponseSurvey {
  id: number;
  name: string;
}

export interface ResponseAnswer {
  id: number;
  choice: string | null;
  choice_label?: string | null;
  sentiment: string | null;
  follow_up_answer: string | null;
  question: AnswerQuestion;
}

export interface SurveyResponse {
  id: number;
  created: string;
  modified: string;
  ip_address: string | null;
  customer: ResponseCustomer | null;
  ticket: ResponseTicket | null;
  survey: ResponseSurvey;
  answers: ResponseAnswer[];
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
}

export interface CustomerUpsertInput {
  email: string;
  name?: string;
  company?: string;
  customAttributes?: Record<string, string>;
}

export interface SendSurveyEmailInput {
  surveyToken: string;
  customer: {
    email: string;
    name?: string;
    company?: string;
    customAttributes?: Record<string, string>;
  };
  teamMember?: {
    teamMemberId?: string;
    email?: string;
    name?: string;
  };
  ticket?: {
    ticketId?: string;
    subject?: string;
    customAttributes?: Record<string, string>;
  };
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Simplesat API key is required. Reconnect with a valid API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.simplesat.io/api/v1',
      authHeader: { name: 'X-Simplesat-Token', value: config.token.trim() },
      headers: { Accept: 'application/json' },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Simplesat',
          reason: 'simplesat_api_error'
        })
    });
  }

  private pagination(params?: { page?: number; pageSize?: number }, maxPageSize = 100) {
    let page = params?.page ?? 1;
    let pageSize = params?.pageSize ?? 100;
    if (!Number.isSafeInteger(page) || page < 1) {
      throw createApiServiceError('Page must be a positive whole number.');
    }
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
      throw createApiServiceError(
        `Page size must be a whole number between 1 and ${maxPageSize}.`
      );
    }
    return { page, page_size: pageSize };
  }

  private normalizePage<T>(
    data: {
      count: number;
      next: string | null;
      previous: string | null;
      results?: T[];
    } & Record<string, unknown>,
    resource: string
  ): PaginatedResponse<T> {
    let results = data[resource] ?? data.results;
    if (!Array.isArray(results)) {
      throw createApiServiceError(`Simplesat returned an invalid ${resource} page.`);
    }
    return {
      count: data.count,
      next: data.next ?? null,
      previous: data.previous ?? null,
      results
    };
  }

  private dateFilter(value: string | undefined, endOfDay = false) {
    if (value === undefined) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      let date = new Date(`${value}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw createApiServiceError(
          'Date filters must be valid YYYY-MM-DD dates or ISO 8601 timestamps.'
        );
      }
      return `${value}T${endOfDay ? '23:59:59.999999' : '00:00:00'}Z`;
    }
    if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) {
      throw createApiServiceError(
        'Date filters must be valid YYYY-MM-DD dates or ISO 8601 timestamps.'
      );
    }
    return value;
  }

  async listSurveys(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Survey>> {
    let response = await this.axios.get('/surveys', {
      params: this.pagination(params)
    });
    return this.normalizePage<Survey>(response.data, 'surveys');
  }

  async listQuestions(params?: {
    page?: number;
    pageSize?: number;
    surveyId?: number;
  }): Promise<PaginatedResponse<Question>> {
    let queryParams: Record<string, unknown> = this.pagination(params);
    if (params?.surveyId !== undefined) {
      if (!Number.isSafeInteger(params.surveyId) || params.surveyId < 1) {
        throw createApiServiceError('Survey ID must be a positive whole number.');
      }
      queryParams.survey_id = params.surveyId;
    }
    let response = await this.axios.get('/questions', {
      params: queryParams
    });
    return this.normalizePage<Question>(response.data, 'questions');
  }

  async searchAnswers(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Answer>> {
    let body = pickDefined({
      start_date: this.dateFilter(params?.startDate),
      end_date: this.dateFilter(params?.endDate, true)
    });

    let response = await this.axios.post('/answers/search', body, {
      params: this.pagination(params)
    });
    return this.normalizePage<Answer>(response.data, 'answers');
  }

  async searchResponses(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<SurveyResponse>> {
    let body = pickDefined({
      start_date: this.dateFilter(params?.startDate),
      end_date: this.dateFilter(params?.endDate, true)
    });

    let response = await this.axios.post('/responses/search', body, {
      params: this.pagination(params)
    });
    return this.normalizePage<SurveyResponse>(response.data, 'responses');
  }

  async upsertCustomer(input: CustomerUpsertInput): Promise<Record<string, unknown>> {
    let body = pickDefined({
      email: input.email,
      name: input.name,
      company: input.company,
      custom_attributes: input.customAttributes
    });
    let response = await this.axios.post('/customers', body);
    return response.data;
  }

  async sendSurveyEmail(input: SendSurveyEmailInput): Promise<Record<string, unknown>> {
    let body = pickDefined({
      customer: pickDefined({
        email: input.customer.email,
        name: input.customer.name,
        company: input.customer.company,
        custom_attributes: input.customer.customAttributes
      }),
      team_member: input.teamMember
        ? pickDefined({
            id: input.teamMember.teamMemberId,
            email: input.teamMember.email,
            name: input.teamMember.name
          })
        : undefined,
      ticket: input.ticket
        ? pickDefined({
            id: input.ticket.ticketId,
            subject: input.ticket.subject,
            custom_attributes: input.ticket.customAttributes
          })
        : undefined
    });
    let response = await this.axios.post(
      `/surveys/${encodeURIComponent(input.surveyToken)}/email`,
      body
    );
    return response.data;
  }

  async getTeamMember(teamMemberId: number): Promise<TeamMember> {
    if (!Number.isSafeInteger(teamMemberId) || teamMemberId < 1) {
      throw createApiServiceError('Team member ID must be a positive whole number.');
    }
    let response = await this.axios.get(`/team-members/${teamMemberId}`);
    return response.data;
  }

  async listTeamMembers(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<TeamMember>> {
    let response = await this.axios.get('/team-members', {
      params: this.pagination(params)
    });
    return this.normalizePage<TeamMember>(response.data, 'team_members');
  }

  async listCustomers(params?: {
    page?: number;
    pageSize?: number;
    createdAfter?: string;
    createdBefore?: string;
    modifiedAfter?: string;
    modifiedBefore?: string;
    subscribed?: boolean;
  }): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/customers', {
      params: pickDefined({
        ...this.pagination(params, 250),
        created_after: this.dateFilter(params?.createdAfter),
        created_before: this.dateFilter(params?.createdBefore, true),
        modified_after: this.dateFilter(params?.modifiedAfter),
        modified_before: this.dateFilter(params?.modifiedBefore, true),
        subscribed: params?.subscribed
      })
    });
    return this.normalizePage<Record<string, unknown>>(response.data, 'customers');
  }

  async getCustomer(customerId: number): Promise<Record<string, unknown>> {
    if (!Number.isSafeInteger(customerId) || customerId < 1) {
      throw createApiServiceError(
        'Customer ID must be a positive whole number. Call list_customers to discover IDs.'
      );
    }
    let response = await this.axios.get(`/customers/${customerId}`);
    return response.data;
  }

  async getAllPages<T>(
    fetcher: (page: number) => Promise<PaginatedResponse<T>>,
    maxPages: number = 10
  ): Promise<T[]> {
    let allResults: T[] = [];
    let page = 1;

    while (page <= maxPages) {
      let response = await fetcher(page);
      allResults = allResults.concat(response.results);
      if (!response.next) break;
      page++;
    }

    return allResults;
  }
}
