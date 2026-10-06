import { createAuthenticatedAxios, createAxios } from 'slates';
import { z } from 'zod';
import {
  credential,
  dateRange,
  exactId,
  externalId,
  incomplete,
  invalid,
  parse,
  protect,
  upstream
} from './contracts';

const surveySchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  type: z.string().optional(),
  state: z.string().optional()
});
const userSchema = z.object({
  id: z.string().min(1),
  project: z.string().min(1),
  userId: z.string().optional(),
  traits: z.record(z.string(), z.unknown()).optional(),
  lastSeen: z.string().optional(),
  created: z.string().optional(),
  unsubscribed: z.boolean().optional()
});
const responseSchema = z.object({
  id: z.string().min(1),
  project: z.string().min(1),
  campaign: z.string().min(1),
  rating: z.number().optional(),
  feedback: z.string().optional(),
  answers: z.array(z.record(z.string(), z.unknown())),
  category: z.string().optional(),
  completed: z.boolean().optional(),
  created: z.string(),
  method: z.string().optional(),
  user: z.record(z.string(), z.unknown()).optional()
});
const unique = (ids: string[]) => {
  if (new Set(ids).size !== ids.length) incomplete();
};
const pathId = (value: string) => encodeURIComponent(exactId(value));

export interface ListResponsesParams {
  projectId: string;
  campaignId?: string;
  startDate?: string;
  endDate?: string;
  pageCursor?: string;
  pageSize?: number;
}
export interface SurveyStatisticsParams {
  projectId: string;
  campaignId: string;
  startDate?: string;
  endDate?: string;
}
export interface UpsertUserParams {
  projectId: string;
  userId: string;
  traits?: Record<string, unknown>;
  surveyDate?: string;
}
export interface TrackEventParams {
  projectId: string;
  userId: string;
  event: string;
}
export interface InsertResponseParams {
  projectId: string;
  campaignId: string;
  userId?: string;
  anonymousId?: string;
  answers: Array<{ questionId: string; value: string | number }>;
  method?: 'In-App' | 'Mobile' | 'Email';
  traits?: Record<string, unknown>;
}
export interface ListUsersParams {
  projectId: string;
  userId?: string;
}

export class SatisMeterClient {
  private http;
  private writeHttp;
  private secrets;
  private writeKey?: string;
  constructor(token: string, writeKey?: string) {
    token = credential(token);
    this.writeKey = writeKey === undefined ? undefined : credential(writeKey);
    this.secrets = { token, writeKey: this.writeKey };
    this.http = createAuthenticatedAxios({
      baseURL: 'https://app.satismeter.com',
      authHeader: { value: `Bearer ${token}` },
      timeout: 30_000,
      maxRedirects: 0
    });
    this.writeHttp = createAxios({
      baseURL: 'https://app.satismeter.com',
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
      maxRedirects: 0
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    params?: Record<string, string | number | undefined>,
    data?: unknown,
    statuses = [200],
    write = false
  ): Promise<unknown> {
    // The write credential is allowed only in the documented response-insertion field.
    protect(
      {
        path,
        params,
        data:
          write && data && typeof data === 'object'
            ? Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'writeKey'))
            : data
      },
      this.secrets
    );
    let response: Awaited<ReturnType<typeof this.http.request<unknown>>>;
    try {
      response = await (write ? this.writeHttp : this.http).request<unknown>({
        method,
        url: path,
        params,
        data
      });
    } catch (error) {
      throw upstream(error);
    }
    if (!statuses.includes(response.status))
      throw upstream({ response: { status: response.status } });
    protect(response.data, this.secrets);
    return response.data;
  }
  async getProject(projectId: string) {
    const result = parse(
      z.object({ data: z.object({ id: z.string().min(1), name: z.string() }) }),
      await this.request('GET', `/api/v3/projects/${pathId(projectId)}`)
    );
    if (result.data.id !== projectId) incomplete();
    return result.data;
  }
  async listSurveys(projectId: string) {
    const result = parse(
      z.object({ data: z.array(surveySchema) }),
      await this.request('GET', `/api/v3/projects/${pathId(projectId)}/campaigns`)
    );
    unique(result.data.map(item => item.id));
    return result.data;
  }
  async getSurvey(projectId: string, campaignId: string) {
    const result = parse(
      z.object({ data: surveySchema }),
      await this.request(
        'GET',
        `/api/v3/projects/${pathId(projectId)}/campaigns/${pathId(campaignId)}`
      )
    );
    if (result.data.id !== campaignId) incomplete();
    return result.data;
  }
  async listResponses(input: ListResponsesParams) {
    dateRange(input.startDate, input.endDate);
    const size = input.pageSize ?? 20;
    if (!Number.isInteger(size) || size < 1 || size > 100)
      invalid('pageSize must be an integer from 1 to 100.');
    if (input.pageCursor !== undefined) {
      if (
        !input.pageCursor ||
        Array.from(input.pageCursor).some(
          char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127
        )
      )
        invalid('Provide the exact nonempty page cursor from the preceding response.');
      try {
        encodeURIComponent(input.pageCursor);
      } catch {
        invalid('Provide a cursor containing valid Unicode text.');
      }
    }
    const scope =
      `/api/v3/projects/${pathId(input.projectId)}` +
      (input.campaignId === undefined ? '' : `/campaigns/${pathId(input.campaignId)}`);
    const result = parse(
      z.object({
        data: z.array(responseSchema),
        page: z.object({
          hasNextPage: z.boolean(),
          size: z.number().int().min(1).max(100),
          nextPageCursor: z.string().optional()
        })
      }),
      await this.request('GET', `${scope}/responses`, {
        startDate: input.startDate,
        endDate: input.endDate,
        pageCursor: input.pageCursor,
        pageSize: size
      })
    );
    if (
      result.data.length > size ||
      result.data.length > result.page.size ||
      result.page.size > size ||
      result.data.some(
        item =>
          item.project !== input.projectId ||
          (input.campaignId !== undefined && item.campaign !== input.campaignId)
      )
    )
      incomplete();
    unique(result.data.map(item => item.id));
    if (
      result.page.hasNextPage &&
      (!result.page.nextPageCursor || result.page.nextPageCursor === input.pageCursor)
    )
      incomplete();
    if (!result.page.hasNextPage && result.page.nextPageCursor) incomplete();
    return {
      data: result.data,
      nextPageCursor: result.page.hasNextPage ? result.page.nextPageCursor : undefined
    };
  }
  async getSurveyStatistics(input: SurveyStatisticsParams) {
    dateRange(input.startDate, input.endDate);
    await this.getSurvey(input.projectId, input.campaignId);
    const result = parse(
      z.object({
        data: z.object({
          statistics: z.record(z.string(), z.unknown()),
          questions: z.array(z.record(z.string(), z.unknown()))
        })
      }),
      await this.request(
        'GET',
        `/api/v3/projects/${pathId(input.projectId)}/campaigns/${pathId(input.campaignId)}/statistics`,
        { startDate: input.startDate, endDate: input.endDate }
      )
    );
    return result.data;
  }
  async listUsers(input: ListUsersParams) {
    const project = exactId(input.projectId);
    const userId = input.userId === undefined ? undefined : externalId(input.userId);
    const value = await this.request('GET', '/api/users', { project, userId });
    const result =
      Array.isArray(value) && userId !== undefined
        ? parse(z.array(userSchema), value)
        : parse(z.object({ users: z.array(userSchema) }), value).users;
    if (
      result.some(
        item => item.project !== project || (userId !== undefined && item.userId !== userId)
      )
    )
      incomplete();
    unique(result.map(item => item.id));
    return result;
  }
  async upsertUser(input: UpsertUserParams) {
    if (input.surveyDate !== undefined) dateRange(input.surveyDate);
    externalId(input.userId);
    await this.getProject(input.projectId);
    await this.request(
      'POST',
      '/api/users',
      undefined,
      {
        userId: input.userId,
        traits: input.traits,
        project: input.projectId,
        surveyDate: input.surveyDate
      },
      [200, 201, 204]
    );
  }
  async deleteUser(projectId: string, userInternalId: string) {
    exactId(userInternalId);
    const users = await this.listUsers({ projectId });
    if (!users.some(item => item.id === userInternalId))
      invalid(
        'The exact internal user ID was not found in the selected project. No deletion was attempted.'
      );
    await this.request(
      'DELETE',
      `/api/users/${pathId(userInternalId)}`,
      undefined,
      undefined,
      [204]
    );
  }
  async trackEvent(input: TrackEventParams) {
    externalId(input.userId);
    externalId(input.event);
    await this.getProject(input.projectId);
    await this.request(
      'POST',
      '/api/users',
      undefined,
      { type: 'track', userId: input.userId, event: input.event, project: input.projectId },
      [200, 201, 204]
    );
  }
  async insertResponse(input: InsertResponseParams) {
    if (!this.writeKey) invalid('A Write Key is required to insert survey responses.');
    if ((input.userId === undefined) === (input.anonymousId === undefined))
      invalid('Provide exactly one of userId or anonymousId.');
    externalId(input.userId ?? input.anonymousId);
    if (!input.answers.length) invalid('Provide at least one answer.');
    for (const answer of input.answers) {
      exactId(answer.questionId);
      if (typeof answer.value === 'number' && !Number.isSafeInteger(answer.value))
        invalid('Numeric answers must be safe integers.');
    }
    if (new Set(input.answers.map(item => item.questionId)).size !== input.answers.length)
      invalid('Provide each question ID only once.');
    await this.getSurvey(input.projectId, input.campaignId);
    await this.request(
      'POST',
      '/api/responses',
      undefined,
      {
        writeKey: this.writeKey,
        campaign: input.campaignId,
        userId: input.userId,
        anonymousId: input.anonymousId,
        answers: input.answers.map(item => ({ id: item.questionId, value: item.value })),
        method: input.method,
        traits: input.traits
      },
      [200, 201, 204],
      true
    );
  }
  async getUnsubscribedEmails(projectId: string) {
    const result = parse(
      z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('project-unsubscribes'),
          attributes: z.object({ emails: z.array(z.string()) })
        })
      }),
      await this.request('GET', `/api/v2/project-unsubscribes/${pathId(projectId)}`)
    );
    if (result.data.id !== projectId) incomplete();
    unique(result.data.attributes.emails);
    return result.data.attributes.emails;
  }
  async updateUnsubscribedEmails(projectId: string, emails: string[]) {
    if (
      emails.some(email => !z.email().safeParse(email).success) ||
      new Set(emails).size !== emails.length
    )
      invalid('Provide distinct valid email addresses.');
    await this.request(
      'PATCH',
      `/api/v2/project-unsubscribes/${pathId(projectId)}`,
      undefined,
      { data: { id: projectId, type: 'project-unsubscribes', attributes: { emails } } },
      [200, 204]
    );
    const current = await this.getUnsubscribedEmails(projectId);
    if (JSON.stringify([...current].sort()) !== JSON.stringify([...emails].sort()))
      incomplete();
    return current;
  }
}
