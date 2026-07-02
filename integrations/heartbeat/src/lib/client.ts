import { createAxios } from 'slates';

let BASE_URL = 'https://api.heartbeat.chat/v0';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
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
    let response = await this.axios.get('/users', { params });
    return response.data as {
      data: HeartbeatUser[];
      hasMore: boolean;
    };
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data as HeartbeatUser;
  }

  async findUserByEmail(email: string) {
    let response = await this.axios.get('/users', {
      params: { email }
    });
    return response.data as {
      data: HeartbeatUser[];
      hasMore: boolean;
    };
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
    let response = await this.axios.delete(`/users/${userId}`);
    return response.data;
  }

  async reactivateUser(userId: string) {
    let response = await this.axios.post(`/users/${userId}/reactivate`);
    return response.data as HeartbeatUser;
  }

  // ---- Groups ----

  async listGroups(params?: {
    limit?: number;
    startingAfter?: string;
    parentGroupId?: string;
    userId?: string;
  }) {
    let response = await this.axios.get('/groups', { params });
    return response.data as {
      data: HeartbeatGroup[];
      hasMore: boolean;
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
    let response = await this.axios.post('/groups', data);
    return response.data as HeartbeatGroup;
  }

  async addUserToGroup(
    groupId: string,
    data: {
      userId: string;
      removeFromSiblingGroups?: boolean;
    }
  ) {
    let response = await this.axios.post(`/groups/${groupId}/members`, data);
    return response.data;
  }

  async removeUserFromGroup(groupId: string, userId: string) {
    let response = await this.axios.delete(`/groups/${groupId}/members/${userId}`);
    return response.data;
  }

  // ---- Channels ----

  async listChannels(params?: {
    limit?: number;
    startingAfter?: string;
    archived?: string;
    channelType?: string;
  }) {
    let response = await this.axios.get('/channels', { params });
    return response.data as {
      data: HeartbeatChannel[];
      hasMore: boolean;
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
    let response = await this.axios.post('/threads', data);
    return response.data as HeartbeatThread;
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
    let response = await this.axios.post('/comments', data);
    return response.data as HeartbeatComment;
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

  async sendDirectMessage(data: { userId: string; text: string }) {
    let response = await this.axios.put('/directMessages', data);
    return response.data;
  }

  // ---- Invitations ----

  async sendInvitation(data: { email: string; invitationLinkId?: string }) {
    let response = await this.axios.post('/invitations', data);
    return response.data;
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
