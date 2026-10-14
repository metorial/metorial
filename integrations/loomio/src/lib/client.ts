import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import {
  commentsResponseSchema,
  discussionsResponseSchema,
  groupsResponseSchema,
  membershipsResultSchema,
  parseLoomioResponse,
  pollsResponseSchema
} from './schemas';

export interface CreateDiscussionParams {
  title: string;
  description?: string;
  descriptionFormat?: 'md' | 'html';
  groupId?: number;
  recipientUserIds?: number[];
  recipientEmails?: string[];
  recipientAudience?: string;
  recipientMessage?: string;
}

export interface CreatePollParams {
  title: string;
  pollType: 'proposal' | 'poll' | 'count' | 'score' | 'ranked_choice' | 'meeting' | 'dot_vote';
  details?: string;
  detailsFormat?: 'md' | 'html';
  closingAt?: string;
  options?: string[];
  groupId?: number;
  discussionId?: number;
  anonymous?: boolean;
  hideResults?: 'off' | 'until_vote' | 'until_closed';
  shuffleOptions?: boolean;
  specifiedVotersOnly?: boolean;
  recipientUserIds?: number[];
  recipientEmails?: string[];
  recipientAudience?: string;
  recipientMessage?: string;
  notifyRecipients?: boolean;
  notifyOnClosingSoon?: 'nobody' | 'author' | 'undecided_voters' | 'voters';
}

export interface MembershipSyncParams {
  groupId: number;
  emails: string[];
  removeAbsent?: boolean;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: `${config.baseUrl.replace(/\/+$/, '')}/api/b2`,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'Loomio', reason: 'loomio_api_error' })
    });
  }

  async createDiscussion(params: CreateDiscussionParams) {
    let response = await this.axios.post('/discussions', {
      title: params.title,
      description: params.description,
      description_format: params.descriptionFormat ?? 'md',
      group_id: params.groupId,
      recipient_user_ids: params.recipientUserIds,
      recipient_emails: params.recipientEmails,
      recipient_audience: params.recipientAudience,
      recipient_message: params.recipientMessage
    });
    let result = parseLoomioResponse(discussionsResponseSchema, response.data);
    let discussion = result.discussions[0];
    if (!discussion)
      throw createApiServiceError('Loomio did not return the created discussion.');
    return discussion;
  }

  async getDiscussion(idOrKey: string | number) {
    let response = await this.axios.get(`/discussions/${encodeURIComponent(idOrKey)}`);
    let result = parseLoomioResponse(discussionsResponseSchema, response.data);
    let discussion = result.discussions[0];
    if (!discussion)
      throw createApiServiceError('Loomio did not return the requested discussion.');
    return discussion;
  }

  async listDiscussions(params: {
    groupId?: number;
    status?: 'open' | 'closed' | 'all';
    limit?: number;
    offset?: number;
  }) {
    if (params.groupId === undefined) {
      throw createApiServiceError('Provide groupId from list_groups to list discussions.');
    }
    let response = await this.axios.get('/discussions', {
      params: {
        group_id: params.groupId,
        status: params.status,
        limit: params.limit,
        offset: params.offset
      }
    });
    return parseLoomioResponse(discussionsResponseSchema, response.data);
  }

  async updateDiscussion(
    idOrKey: string | number,
    params: { title?: string; description?: string; descriptionFormat?: 'md' | 'html' }
  ) {
    let response = await this.axios.patch(`/discussions/${encodeURIComponent(idOrKey)}`, {
      title: params.title,
      description: params.description,
      description_format: params.descriptionFormat
    });
    let result = parseLoomioResponse(discussionsResponseSchema, response.data);
    let discussion = result.discussions[0];
    if (!discussion)
      throw createApiServiceError('Loomio did not return the updated discussion.');
    return discussion;
  }

  async createComment(params: {
    discussionId: number;
    body: string;
    bodyFormat: 'md' | 'html';
  }) {
    let response = await this.axios.post('/comments', {
      discussion_id: params.discussionId,
      body: params.body,
      body_format: params.bodyFormat
    });
    let result = parseLoomioResponse(commentsResponseSchema, response.data);
    let comment = result.comments[0];
    if (!comment) throw createApiServiceError('Loomio did not return the created comment.');
    return comment;
  }

  async createPoll(params: CreatePollParams) {
    let response = await this.axios.post('/polls', {
      title: params.title,
      poll_type: params.pollType,
      details: params.details,
      details_format: params.detailsFormat ?? 'md',
      closing_at: params.closingAt,
      options: params.options,
      group_id: params.groupId,
      discussion_id: params.discussionId,
      anonymous: params.anonymous,
      hide_results: params.hideResults,
      shuffle_options: params.shuffleOptions,
      specified_voters_only: params.specifiedVotersOnly,
      recipient_user_ids: params.recipientUserIds,
      recipient_emails: params.recipientEmails,
      recipient_audience: params.recipientAudience,
      recipient_message: params.recipientMessage,
      notify_recipients: params.notifyRecipients,
      notify_on_closing_soon: params.notifyOnClosingSoon
    });
    let result = parseLoomioResponse(pollsResponseSchema, response.data);
    let poll = result.polls[0];
    if (!poll) throw createApiServiceError('Loomio did not return the created poll.');
    return poll;
  }

  async getPoll(idOrKey: string | number) {
    let response = await this.axios.get(`/polls/${encodeURIComponent(idOrKey)}`);
    let result = parseLoomioResponse(pollsResponseSchema, response.data);
    let poll = result.polls[0];
    if (!poll) throw createApiServiceError('Loomio did not return the requested poll.');
    return poll;
  }

  async listPolls(params: {
    groupId?: number;
    discussionId?: number;
    status?: 'active' | 'closed' | 'all';
    limit?: number;
    offset?: number;
  }) {
    let discussion =
      params.discussionId === undefined
        ? undefined
        : await this.getDiscussion(params.discussionId);
    if (params.groupId !== undefined && discussion && discussion.group_id !== params.groupId) {
      throw createApiServiceError('The discussion does not belong to the requested groupId.');
    }
    let groupId = params.groupId ?? discussion?.group_id;
    if (groupId === undefined || groupId === null) {
      throw createApiServiceError('Provide groupId from list_groups to list polls.');
    }
    let response = await this.axios.get('/polls', {
      params: {
        group_id: groupId,
        status: params.status,
        limit: params.limit,
        offset: params.offset
      }
    });
    let result = parseLoomioResponse(pollsResponseSchema, response.data);
    if (discussion) {
      result.polls = result.polls.filter(
        poll =>
          poll.discussion_id === discussion.id ||
          (discussion.topic_id != null && poll.topic_id === discussion.topic_id)
      );
      result.meta = undefined;
    }
    return result;
  }

  async syncMemberships(params: MembershipSyncParams) {
    let response = await this.axios.post('/memberships', {
      group_id: params.groupId,
      emails: params.emails,
      remove_absent: params.removeAbsent ? 1 : 0
    });
    return parseLoomioResponse(membershipsResultSchema, response.data);
  }

  async listGroups() {
    let response = await this.axios.get('/groups');
    return parseLoomioResponse(groupsResponseSchema, response.data);
  }
}
