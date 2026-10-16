import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let BASE_URL = 'https://api.heartbeat.chat/v0';

let createHeartbeatAxios = (token: string) =>
  createAuthenticatedAxios({
    baseURL: BASE_URL,
    authHeader: { value: `Bearer ${token}` },
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Heartbeat',
        reason: 'heartbeat_api_error',
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
        detailKeys: ['message', 'detail', 'error', 'code'],
        nestedKeys: ['errors', 'message', 'details']
      })
  });

type HeartbeatPage<T> = T[] | { data: T[]; hasMore?: boolean };

let normalizePage = <T>(response: HeartbeatPage<T>) => ({
  data: Array.isArray(response) ? response : response.data,
  hasMore: Array.isArray(response) ? undefined : response.hasMore,
  raw: response
});

type HeartbeatUserResponse = Omit<HeartbeatUser, 'groups' | 'roleId' | 'createdAt'> & {
  groups: (string | { id: string; name?: string })[] | null;
  roleId?: string;
  roleID?: string;
  createdAt?: string;
};

let normalizeUser = (user: HeartbeatUserResponse) => ({
  ...user,
  groups:
    user.groups === null
      ? null
      : user.groups?.map(group => (typeof group === 'string' ? group : group.id)),
  roleId: user.roleId ?? user.roleID,
  raw: user
});

type HeartbeatGroupResponse = Omit<HeartbeatGroup, 'isJoinable' | 'parentGroup'> & {
  isJoinable?: boolean;
  parentGroup?: string | null;
  parentGroupID?: string | null;
};

type HeartbeatChannelResponse = Omit<
  HeartbeatChannel,
  'channelType' | 'isReadOnly' | 'createdAt'
> & {
  channelType?: string;
  type?: string;
  isReadOnly?: boolean;
  createdAt?: string;
};

let channelTypes: Record<string, string> = { POSTS: 'thread', CHAT: 'chat', VOICE: 'voice' };

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createHeartbeatAxios(config.token);
  }

  // ---- Users ----

  async listUsers(params?: {
    limit?: number;
    startingAfter?: string;
    createdAfter?: string;
    createdBefore?: string;
    groupId?: string;
    role?: string;
  }) {
    let response = await this.axios.get<HeartbeatPage<HeartbeatUserResponse>>('/users', {
      params
    });
    let page = normalizePage(response.data);
    return { ...page, data: page.data.map(normalizeUser) };
  }

  async getUser(userId: string) {
    let response = await this.axios.get<HeartbeatUserResponse>(
      `/users/${encodeURIComponent(userId)}`
    );
    return normalizeUser(response.data);
  }

  async findUserByEmail(email: string) {
    let response = await this.axios.get<HeartbeatPage<HeartbeatUserResponse>>('/find/users', {
      params: { email }
    });
    let page = normalizePage(response.data);
    return { ...page, data: page.data.map(normalizeUser) };
  }

  async createUser(data: {
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    roles?: string[];
    groups?: string[];
    profilePicture?: string;
    bio?: string;
    status?: string;
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    createIntroductionThread?: boolean;
  }) {
    let response = await this.axios.post('/users', data);
    return response.data as HeartbeatUser;
  }

  async updateUser(
    userId: string,
    data: {
      name?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      roles?: string[];
      groups?: string[];
      profilePicture?: string;
      bio?: string;
      status?: string;
      linkedin?: string;
      twitter?: string;
      instagram?: string;
    }
  ) {
    let response = await this.axios.put(`/users/${userId}`, data);
    return response.data as HeartbeatUser;
  }

  async deleteUser(userId: string) {
    let email = await this.resolveUserEmail(userId);
    let response = await this.axios.delete('/users', { data: { email } });
    return response.data;
  }

  async reactivateUser(userId: string) {
    let email = await this.resolveUserEmail(userId);
    let response = await this.axios.post('/users/reactivate', { email });
    return response.data;
  }

  private async resolveUserEmail(userId: string) {
    let user = await this.getUser(userId);
    if (typeof user.email !== 'string') {
      throw createApiServiceError(
        'Heartbeat did not return an email address for the requested user.',
        { reason: 'heartbeat_user_email_missing' }
      );
    }
    return user.email;
  }

  // ---- Groups ----

  async listGroups(params?: {
    limit?: number;
    startingAfter?: string;
    parentGroupId?: string;
    userId?: string;
  }) {
    let response = await this.axios.get<HeartbeatPage<HeartbeatGroupResponse>>('/groups', {
      params
    });
    let page = normalizePage(response.data);
    return {
      ...page,
      data: page.data.map(group => {
        let parentGroup =
          group.parentGroup !== undefined ? group.parentGroup : group.parentGroupID;
        return { ...group, parentGroup, raw: group };
      })
    };
  }

  async getGroup(groupId: string) {
    let response = await this.axios.get(`/groups/${groupId}`);
    return response.data as HeartbeatGroup;
  }

  async createGroup(data: {
    name: string;
    description?: string;
    parentGroupId?: string;
    isJoinable?: boolean;
  }) {
    let { parentGroupId, ...group } = data;
    let response = await this.axios.put<unknown>('/groups', {
      ...group,
      parentGroupID: parentGroupId
    });
    let result = isApiErrorRecord(response.data) ? response.data : undefined;
    return {
      id: typeof result?.id === 'string' ? result.id : undefined,
      name: typeof result?.name === 'string' ? result.name : undefined,
      raw: response.data
    };
  }

  async addUserToGroup(
    groupId: string,
    data: {
      userId: string;
      removeFromSiblingGroups?: boolean;
    }
  ) {
    let email = await this.resolveUserEmail(data.userId);
    let response = await this.axios.put(`/groups/${encodeURIComponent(groupId)}/memberships`, {
      emails: [email],
      shouldRemoveFromSiblingGroups: data.removeFromSiblingGroups
    });
    return response.data;
  }

  async removeUserFromGroup(groupId: string, userId: string) {
    let email = await this.resolveUserEmail(userId);
    let response = await this.axios.delete(
      `/groups/${encodeURIComponent(groupId)}/memberships`,
      {
        data: { emails: [email] }
      }
    );
    return response.data;
  }

  // ---- Channels ----

  async listChannels(params?: {
    limit?: number;
    startingAfter?: string;
    archived?: string;
    channelType?: string;
  }) {
    let response = await this.axios.get<HeartbeatPage<HeartbeatChannelResponse>>('/channels', {
      params
    });
    let page = normalizePage(response.data);
    return {
      ...page,
      data: page.data.map(channel => {
        let channelType =
          channel.channelType ??
          (channel.type === undefined
            ? undefined
            : (channelTypes[channel.type] ?? channel.type));
        return { ...channel, channelType, raw: channel };
      })
    };
  }

  async getChannel(channelId: string) {
    let response = await this.axios.get(`/channels/${channelId}`);
    return response.data as HeartbeatChannel;
  }

  async createChannel(data: {
    name: string;
    channelType?: string;
    emoji?: string;
    isReadOnly?: boolean;
  }) {
    let response = await this.axios.post('/channels', data);
    return response.data as HeartbeatChannel;
  }

  // ---- Threads ----

  async createThread(data: {
    channelId: string;
    title?: string;
    text?: string;
    richText?: string;
    userId?: string;
  }) {
    let response = await this.axios.put<HeartbeatThread & { channelID?: string }>('/threads', {
      channelID: data.channelId,
      title: data.title,
      text: data.richText !== undefined ? data.richText : data.text,
      userID: data.userId
    });
    return {
      ...response.data,
      channelId: response.data.channelId ?? response.data.channelID ?? data.channelId,
      raw: response.data
    };
  }

  async getRecentPosts(params?: {
    channelId?: string;
    limit?: number;
    startingAfter?: string;
  }) {
    let response = await this.axios.get('/threads', { params });
    return response.data as {
      data: HeartbeatThread[];
      hasMore: boolean;
    };
  }

  // ---- Comments ----

  async createComment(data: {
    threadId: string;
    text?: string;
    richText?: string;
    userId?: string;
  }) {
    let response = await this.axios.put<HeartbeatComment>('/comments', {
      threadID: data.threadId,
      parentCommentID: null,
      text: data.richText !== undefined ? data.richText : data.text,
      userID: data.userId
    });
    return { ...response.data, raw: response.data };
  }

  // ---- Events ----

  async createEvent(data: {
    name: string;
    description?: string;
    startDate: string;
    endDate?: string;
    location?: string;
    emails?: string[];
  }) {
    let response = await this.axios.post('/events', data);
    return response.data as HeartbeatEvent;
  }

  // ---- Direct Messages ----

  async sendDirectMessage(data: { userId: string; text: string; fromUserId?: string }) {
    let response = await this.axios.put('/directMessages', {
      to: data.userId,
      text: data.text,
      from: data.fromUserId
    });
    return response.data;
  }

  // ---- Invitations ----

  async sendInvitation(data: { email: string; invitationLinkId?: string }) {
    let response = await this.axios.post('/invitations', data);
    return response.data;
  }
}

// Current documented operations are kept separate from the deprecated request contracts.
export class CommunityClient {
  private axios;

  constructor(token: string) {
    this.axios = createHeartbeatAxios(token);
  }

  async request<T>(
    method: 'GET' | 'PUT' | 'POST' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ) {
    let response = await this.axios.request<T>({ method, url: path, data, params });
    return response.data;
  }

  async mutate(method: 'PUT' | 'POST' | 'DELETE', path: string, data?: unknown) {
    let response = await this.axios.request<unknown>({ method, url: path, data });
    return { httpStatus: response.status, response: response.data };
  }
}

// ---- Types ----

export interface HeartbeatUser {
  id: string;
  createdAt: string;
  email: string;
  firstName: string;
  lastName: string;
  groups: string[] | null;
  roleId: string;
  bio?: string;
  status?: string;
  profilePicture?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
}

export interface HeartbeatGroup {
  id: string;
  name: string;
  description: string;
  isJoinable: boolean;
  parentGroup: string | null;
  accessibleTo: Array<{ id: string; type: string }> | null;
}

export interface HeartbeatChannel {
  id: string;
  name: string;
  channelType: string;
  emoji: string;
  isReadOnly: boolean;
  accessibleTo: Array<{ id: string; type: string }> | null;
  createdAt: string;
}

export interface HeartbeatThread {
  id: string;
  channelId: string;
  title?: string;
  text?: string;
  richText?: string;
  userId?: string;
  createdAt: string;
}

export interface HeartbeatComment {
  id: string;
  threadId: string;
  text?: string;
  richText?: string;
  userId?: string;
  createdAt: string;
}

export interface HeartbeatEvent {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  createdAt: string;
}
