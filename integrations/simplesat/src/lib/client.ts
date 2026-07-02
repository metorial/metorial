import { createAxios } from 'slates';

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
  rating_scale: number | null;
  required: boolean;
  choices: QuestionChoice[];
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
  choice_label: string | null;
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
  id: string | null;
  subject: string | null;
}

export interface ResponseSurvey {
  id: number;
  name: string;
}

export interface ResponseAnswer {
  id: number;
  choice: string | null;
  choice_label: string | null;
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
    this.axios = createAxios({
      baseURL: 'https://api.simplesat.io/api/v1',
      headers: {
        'X-Simplesat-Token': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async listSurveys(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Survey>> {
    let response = await this.axios.get('/surveys', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100
      }
    });
    return response.data;
  }

  async listQuestions(params?: {
    page?: number;
    pageSize?: number;
    surveyId?: number;
  }): Promise<PaginatedResponse<Question>> {
    let queryParams: Record<string, unknown> = {
      page: params?.page ?? 1,
      page_size: params?.pageSize ?? 100
    };
    if (params?.surveyId) {
      queryParams.survey = params.surveyId;
    }
    let response = await this.axios.get('/questions', {
      params: queryParams
    });
    return response.data;
  }

  async searchAnswers(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Answer>> {
    let body: Record<string, unknown> = {};
    if (params?.startDate) body.start_date = params.startDate;
    if (params?.endDate) body.end_date = params.endDate;

    let response = await this.axios.post('/answers/search', body, {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100
      }
    });
    return response.data;
  }

  async searchResponses(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<SurveyResponse>> {
    let body: Record<string, unknown> = {};
    if (params?.startDate) body.start_date = params.startDate;
    if (params?.endDate) body.end_date = params.endDate;

    let response = await this.axios.post('/responses/search', body, {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100
      }
    });
    return response.data;
  }

  async upsertCustomer(input: CustomerUpsertInput): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      email: input.email
    };
    if (input.name) body.name = input.name;
    if (input.company) body.company = input.company;
    if (input.customAttributes) body.custom_attributes = input.customAttributes;

    let response = await this.axios.post(
      'https://api.simplesat.io/api/customers/create-or-update/',
      body
    );
    return response.data;
  }

  async sendSurveyEmail(input: SendSurveyEmailInput): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      customer: {
        email: input.customer.email,
        ...(input.customer.name && { name: input.customer.name }),
        ...(input.customer.company && { company: input.customer.company }),
        ...(input.customer.customAttributes && {
          custom_attributes: input.customer.customAttributes
        })
      }
    };

    if (input.teamMember) {
      let teamMemberObj: Record<string, unknown> = {};
      if (input.teamMember.teamMemberId) teamMemberObj.id = input.teamMember.teamMemberId;
      if (input.teamMember.email) teamMemberObj.email = input.teamMember.email;
      if (input.teamMember.name) teamMemberObj.name = input.teamMember.name;
      body.team_member = teamMemberObj;
    }

    if (input.ticket) {
      let ticketObj: Record<string, unknown> = {};
      if (input.ticket.ticketId) ticketObj.id = input.ticket.ticketId;
      if (input.ticket.subject) ticketObj.subject = input.ticket.subject;
      if (input.ticket.customAttributes)
        ticketObj.custom_attributes = input.ticket.customAttributes;
      body.ticket = ticketObj;
    }

    let response = await this.axios.post(
      `https://api.simplesat.io/api/v1/event-based-emails/${input.surveyToken}/send`,
      body
    );
    return response.data;
  }

  async getTeamMember(teamMemberId: number): Promise<TeamMember> {
    let response = await this.axios.get(`/team-members/${teamMemberId}`);
    return response.data;
  }

  async listTeamMembers(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<TeamMember>> {
    let response = await this.axios.get('/team-members', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100
      }
    });
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
