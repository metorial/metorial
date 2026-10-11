import { ChatErrors, parseRetryAfterMs } from '@slates/adapter-chat';
import { createAxios } from 'slates';
import { normalizeServiceUrl } from '../../lib/botFramework';
import { type TeamsChatErrorContext, withTeamsChatErrors } from './errors';

// https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference?view=azure-bot-service-4.0#conversation-operations

export interface TeamsBotAuth {
  token: string;
  appId?: string;
  tenantId?: string;
  serviceUrl?: string;
  botName?: string;
}

export interface TeamsBotIdentity {
  token: string;
  appId: string;
  tenantId?: string;
  serviceUrl: string;
  botName?: string;
}

export interface TeamsOutgoingActivity {
  type: 'message' | 'typing';
  text?: string;
  textFormat?: 'markdown' | 'plain' | 'xml';
  replyToId?: string;
  [key: string]: unknown;
}

export interface TeamsResourceResponse {
  id?: string;
}

export interface TeamsConversationResourceResponse {
  id: string;
  activityId?: string;
  serviceUrl?: string;
}

export interface TeamsPagedMembersResult {
  continuationToken?: string | null;
  members: Record<string, any>[];
}

export let requireTeamsBotIdentity = (
  auth: TeamsBotAuth,
  action: string
): TeamsBotIdentity => {
  if (!auth.appId) {
    throw ChatErrors.authInvalid({
      action,
      message:
        'This action requires a Teams Bot (Azure Bot) connection. Microsoft Graph user connections cannot act as a Teams bot.'
    });
  }
  let serviceUrl: string;
  try {
    serviceUrl = normalizeServiceUrl(auth.serviceUrl);
  } catch (error) {
    throw ChatErrors.authInvalid({
      action,
      message: 'The connection has an invalid Teams service URL. Reconnect the Teams bot.',
      cause: error
    });
  }
  return {
    token: auth.token,
    appId: auth.appId,
    tenantId: auth.tenantId,
    serviceUrl,
    botName: auth.botName
  };
};

/** An object so root contract tests can stub provider HTTP. */
export let teamsBotHttp = {
  create: (serviceUrl: string) =>
    createAxios({
      baseURL: serviceUrl,
      errorMapping: {
        // Retry-After is in seconds: https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/rate-limit
        mapAxiosError: (error, inferred) => {
          let retryAfterMs = parseRetryAfterMs(
            (error.response?.headers as Record<string, unknown> | undefined)?.['retry-after']
          );
          if (retryAfterMs === undefined) return inferred;
          return { ...inferred, baggage: { ...inferred.baggage, retryAfterMs } };
        }
      }
    })
};

let conversationPath = (conversationId: string) =>
  `v3/conversations/${encodeURIComponent(conversationId)}`;

export class TeamsBotClient {
  private http: ReturnType<typeof createAxios>;

  constructor(
    readonly identity: TeamsBotIdentity,
    private readonly errorContext: TeamsChatErrorContext
  ) {
    this.http = teamsBotHttp.create(identity.serviceUrl);
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.identity.token}`,
      'Content-Type': 'application/json'
    };
  }

  private run<T>(context: TeamsChatErrorContext, request: () => Promise<{ data: T }>) {
    return withTeamsChatErrors({ ...this.errorContext, ...context }, async () => {
      let response = await request();
      return response.data;
    });
  }

  sendToConversation(conversationId: string, activity: TeamsOutgoingActivity) {
    return this.run<TeamsResourceResponse>({ channelId: conversationId }, () =>
      this.http.post(`${conversationPath(conversationId)}/activities`, activity, {
        headers: this.headers
      })
    );
  }

  replyToActivity(
    conversationId: string,
    activityId: string,
    activity: TeamsOutgoingActivity
  ) {
    return this.run<TeamsResourceResponse>(
      {
        channelId: conversationId,
        messageId: activityId,
        ambiguous: { activitynotfoundinconversation: 'chat.message.not_found' }
      },
      () =>
        this.http.post(
          `${conversationPath(conversationId)}/activities/${encodeURIComponent(activityId)}`,
          activity,
          { headers: this.headers }
        )
    );
  }

  updateActivity(conversationId: string, activityId: string, activity: TeamsOutgoingActivity) {
    return this.run<TeamsResourceResponse>(
      { channelId: conversationId, messageId: activityId },
      () =>
        this.http.put(
          `${conversationPath(conversationId)}/activities/${encodeURIComponent(activityId)}`,
          { ...activity, id: activityId },
          { headers: this.headers }
        )
    );
  }

  deleteActivity(conversationId: string, activityId: string) {
    return this.run<unknown>({ channelId: conversationId, messageId: activityId }, () =>
      this.http.delete(
        `${conversationPath(conversationId)}/activities/${encodeURIComponent(activityId)}`,
        { headers: this.headers }
      )
    );
  }

  createConversation(body: Record<string, unknown>, userId: string) {
    return this.run<TeamsConversationResourceResponse>(
      {
        userId,
        ambiguous: {
          '404': 'chat.user.not_found',
          forbiddenoperationexception: 'chat.auth.app_not_installed'
        }
      },
      () => this.http.post('v3/conversations', body, { headers: this.headers })
    );
  }

  getPagedMembers(conversationId: string, pageSize: number, continuationToken?: string) {
    return this.run<TeamsPagedMembersResult>({ channelId: conversationId }, () =>
      this.http.get(`${conversationPath(conversationId)}/pagedmembers`, {
        headers: this.headers,
        params: {
          pageSize,
          ...(continuationToken ? { continuationToken } : {})
        }
      })
    );
  }
}

export let createTeamsBotClient = (
  auth: TeamsBotAuth,
  action: string,
  context: Omit<TeamsChatErrorContext, 'action'> = {}
) => new TeamsBotClient(requireTeamsBotIdentity(auth, action), { ...context, action });
