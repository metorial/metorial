import { createAxios } from 'slates';

export interface CreateDiscussionParams {
  title: string;
  description?: string;
  descriptionFormat?: 'md' | 'html';
  groupId?: number;
  recipientUserIds?: number[];
  recipientEmails?: string[];
  recipientAudience?: string;
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
  notifyRecipients?: boolean;
}

export interface MembershipSyncParams {
  groupId: number;
  emails: string[];
  removeAbsent?: boolean;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string; baseUrl: string }) {
    this.token = config.token;
    this.axios = createAxios({
      baseURL: `${config.baseUrl.replace(/\/+$/, '')}/api/b2`
    });
  }

  async createDiscussion(params: CreateDiscussionParams) {
    let response = await this.axios.post('/discussions', {
      api_key: this.token,
      title: params.title,
      description: params.description,
      description_format: params.descriptionFormat || 'md',
      group_id: params.groupId,
      recipient_user_ids: params.recipientUserIds,
      recipient_emails: params.recipientEmails,
      recipient_audience: params.recipientAudience
    });
    return response.data;
  }

  async getDiscussion(idOrKey: string | number) {
    let response = await this.axios.get('/discussions', {
      params: {
        api_key: this.token,
        id: idOrKey
      }
    });
    return response.data;
  }

  async listDiscussions(params?: { groupId?: number; since?: string }) {
    let queryParams: Record<string, string | number> = {
      api_key: this.token
    };
    if (params?.groupId) {
      queryParams.group_id = params.groupId;
    }
    if (params?.since) {
      queryParams.since = params.since;
    }
    let response = await this.axios.get('/discussions', {
      params: queryParams
    });
    return response.data;
  }

  async createPoll(params: CreatePollParams) {
    let response = await this.axios.post('/polls', {
      api_key: this.token,
      title: params.title,
      poll_type: params.pollType,
      details: params.details,
      details_format: params.detailsFormat || 'md',
      closing_at: params.closingAt,
      poll_option_names: params.options,
      group_id: params.groupId,
      discussion_id: params.discussionId,
      anonymous: params.anonymous,
      hide_results: params.hideResults,
      shuffle_options: params.shuffleOptions,
      specified_voters_only: params.specifiedVotersOnly,
      recipient_user_ids: params.recipientUserIds,
      recipient_emails: params.recipientEmails,
      recipient_audience: params.recipientAudience,
      notify_recipients: params.notifyRecipients
    });
    return response.data;
  }

  async getPoll(idOrKey: string | number) {
    let response = await this.axios.get('/polls', {
      params: {
        api_key: this.token,
        id: idOrKey
      }
    });
    return response.data;
  }

  async listPolls(params?: { groupId?: number; discussionId?: number; since?: string }) {
    let queryParams: Record<string, string | number> = {
      api_key: this.token
    };
    if (params?.groupId) {
      queryParams.group_id = params.groupId;
    }
    if (params?.discussionId) {
      queryParams.discussion_id = params.discussionId;
    }
    if (params?.since) {
      queryParams.since = params.since;
    }
    let response = await this.axios.get('/polls', {
      params: queryParams
    });
    return response.data;
  }

  async syncMemberships(params: MembershipSyncParams) {
    let response = await this.axios.post('/memberships', {
      api_key: this.token,
      group_id: params.groupId,
      emails: params.emails,
      remove_absent: params.removeAbsent ? 1 : 0
    });
    return response.data;
  }

  async listMemberships(groupId: number) {
    let response = await this.axios.get('/memberships', {
      params: {
        api_key: this.token,
        group_id: groupId
      }
    });
    return response.data;
  }
}
