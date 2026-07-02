import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.chatwork.com/v2'
});

export class ChatworkClient {
  private headers: Record<string, string>;

  constructor(token: string, authType: 'oauth' | 'api_token' = 'api_token') {
    if (authType === 'oauth') {
      this.headers = { Authorization: `Bearer ${token}` };
    } else {
      this.headers = { 'X-ChatWorkToken': token };
    }
  }

  // ---- User ----

  async getMe(): Promise<ChatworkUser> {
    let response = await api.get('/me', { headers: this.headers });
    return response.data;
  }

  async getMyStatus(): Promise<ChatworkStatus> {
    let response = await api.get('/my/status', { headers: this.headers });
    return response.data;
  }

  async getMyTasks(params?: {
    assignedByAccountId?: number;
    status?: 'open' | 'done';
  }): Promise<ChatworkTask[]> {
    let query: Record<string, string> = {};
    if (params?.assignedByAccountId)
      query.assigned_by_account_id = String(params.assignedByAccountId);
    if (params?.status) query.status = params.status;

    let response = await api.get('/my/tasks', { headers: this.headers, params: query });
    return response.data || [];
  }

  // ---- Contacts ----

  async getContacts(): Promise<ChatworkContact[]> {
    let response = await api.get('/contacts', { headers: this.headers });
    return response.data || [];
  }

  async getIncomingRequests(): Promise<ChatworkContactRequest[]> {
    let response = await api.get('/incoming_requests', { headers: this.headers });
    return response.data || [];
  }

  async approveRequest(requestId: number): Promise<ChatworkContact> {
    let response = await api.put(`/incoming_requests/${requestId}`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async declineRequest(requestId: number): Promise<void> {
    await api.delete(`/incoming_requests/${requestId}`, { headers: this.headers });
  }

  // ---- Rooms ----

  async getRooms(): Promise<ChatworkRoom[]> {
    let response = await api.get('/rooms', { headers: this.headers });
    return response.data || [];
  }

  async getRoom(roomId: number): Promise<ChatworkRoomDetail> {
    let response = await api.get(`/rooms/${roomId}`, { headers: this.headers });
    return response.data;
  }

  async createRoom(params: {
    name: string;
    description?: string;
    iconPreset?: string;
    membersAdminIds: number[];
    membersMemberIds?: number[];
    membersReadonlyIds?: number[];
    link?: boolean;
    linkCode?: string;
    linkNeedAcceptance?: boolean;
  }): Promise<{ room_id: number }> {
    let body = new URLSearchParams();
    body.append('name', params.name);
    if (params.description) body.append('description', params.description);
    if (params.iconPreset) body.append('icon_preset', params.iconPreset);
    body.append('members_admin_ids', params.membersAdminIds.join(','));
    if (params.membersMemberIds?.length)
      body.append('members_member_ids', params.membersMemberIds.join(','));
    if (params.membersReadonlyIds?.length)
      body.append('members_readonly_ids', params.membersReadonlyIds.join(','));
    if (params.link !== undefined) body.append('link', params.link ? '1' : '0');
    if (params.linkCode) body.append('link_code', params.linkCode);
    if (params.linkNeedAcceptance !== undefined)
      body.append('link_need_acceptance', params.linkNeedAcceptance ? '1' : '0');

    let response = await api.post('/rooms', body.toString(), {
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async updateRoom(
    roomId: number,
    params: {
      name?: string;
      description?: string;
      iconPreset?: string;
    }
  ): Promise<{ room_id: number }> {
    let body = new URLSearchParams();
    if (params.name) body.append('name', params.name);
    if (params.description !== undefined) body.append('description', params.description);
    if (params.iconPreset) body.append('icon_preset', params.iconPreset);

    let response = await api.put(`/rooms/${roomId}`, body.toString(), {
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async deleteRoom(roomId: number, actionType: 'leave' | 'delete'): Promise<void> {
    await api.delete(`/rooms/${roomId}`, {
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      data: new URLSearchParams({ action_type: actionType }).toString()
    });
  }

  // ---- Room Members ----

  async getRoomMembers(roomId: number): Promise<ChatworkMember[]> {
    let response = await api.get(`/rooms/${roomId}/members`, { headers: this.headers });
    return response.data || [];
  }

  async updateRoomMembers(
    roomId: number,
    params: {
      membersAdminIds: number[];
      membersMemberIds?: number[];
      membersReadonlyIds?: number[];
    }
  ): Promise<{ admin: number[]; member: number[]; readonly: number[] }> {
    let body = new URLSearchParams();
    body.append('members_admin_ids', params.membersAdminIds.join(','));
    if (params.membersMemberIds?.length)
      body.append('members_member_ids', params.membersMemberIds.join(','));
    if (params.membersReadonlyIds?.length)
      body.append('members_readonly_ids', params.membersReadonlyIds.join(','));

    let response = await api.put(`/rooms/${roomId}/members`, body.toString(), {
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  // ---- Messages ----

  async getMessages(roomId: number, force?: boolean): Promise<ChatworkMessage[]> {
    let params: Record<string, string> = {};
    if (force !== undefined) params.force = force ? '1' : '0';

    let response = await api.get(`/rooms/${roomId}/messages`, {
      headers: this.headers,
      params
    });
    return response.data || [];
  }

  async getMessage(roomId: number, messageId: string): Promise<ChatworkMessage> {
    let response = await api.get(`/rooms/${roomId}/messages/${messageId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async sendMessage(
    roomId: number,
    body: string,
    selfUnread?: boolean
  ): Promise<{ message_id: string }> {
    let formBody = new URLSearchParams({ body });
    if (selfUnread !== undefined) formBody.append('self_unread', selfUnread ? '1' : '0');

    let response = await api.post(`/rooms/${roomId}/messages`, formBody.toString(), {
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async updateMessage(
    roomId: number,
    messageId: string,
    body: string
  ): Promise<{ message_id: string }> {
    let formBody = new URLSearchParams({ body });

    let response = await api.put(
      `/rooms/${roomId}/messages/${messageId}`,
      formBody.toString(),
      {
        headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async deleteMessage(roomId: number, messageId: string): Promise<void> {
    await api.delete(`/rooms/${roomId}/messages/${messageId}`, { headers: this.headers });
  }

  async markMessagesRead(
    roomId: number,
    messageId: string
  ): Promise<{ unread_num: number; mention_num: number }> {
    let body = new URLSearchParams({ message_id: messageId });

    let response = await api.put(`/rooms/${roomId}/messages/read`, body.toString(), {
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async markMessagesUnread(
    roomId: number,
    messageId: string
  ): Promise<{ unread_num: number; mention_num: number }> {
    let body = new URLSearchParams({ message_id: messageId });

    let response = await api.put(`/rooms/${roomId}/messages/unread`, body.toString(), {
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  // ---- Tasks ----

  async getRoomTasks(roomId: number): Promise<ChatworkRoomTask[]> {
    let response = await api.get(`/rooms/${roomId}/tasks`, { headers: this.headers });
    return response.data || [];
  }

  async getRoomTask(roomId: number, taskId: number): Promise<ChatworkRoomTask> {
    let response = await api.get(`/rooms/${roomId}/tasks/${taskId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createTask(
    roomId: number,
    params: {
      body: string;
      toIds: number[];
      limit?: number;
      limitType?: 'none' | 'date' | 'time';
    }
  ): Promise<{ task_ids: number[] }> {
    let formBody = new URLSearchParams();
    formBody.append('body', params.body);
    formBody.append('to_ids', params.toIds.join(','));
    if (params.limit) formBody.append('limit', String(params.limit));
    if (params.limitType) formBody.append('limit_type', params.limitType);

    let response = await api.post(`/rooms/${roomId}/tasks`, formBody.toString(), {
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async updateTaskStatus(
    roomId: number,
    taskId: number,
    status: 'open' | 'done'
  ): Promise<ChatworkRoomTask> {
    let body = new URLSearchParams({ status });

    let response = await api.put(`/rooms/${roomId}/tasks/${taskId}/status`, body.toString(), {
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  // ---- Files ----

  async getRoomFiles(roomId: number): Promise<ChatworkFile[]> {
    let response = await api.get(`/rooms/${roomId}/files`, { headers: this.headers });
    return response.data || [];
  }

  async getRoomFile(roomId: number, fileId: number): Promise<ChatworkFileDetail> {
    let response = await api.get(`/rooms/${roomId}/files/${fileId}`, {
      headers: this.headers,
      params: { create_download_url: '1' }
    });
    return response.data;
  }

  // ---- Invitation Links ----

  async getRoomLink(roomId: number): Promise<ChatworkLink> {
    let response = await api.get(`/rooms/${roomId}/link`, { headers: this.headers });
    return response.data;
  }

  async createRoomLink(
    roomId: number,
    params?: {
      code?: string;
      needAcceptance?: boolean;
      description?: string;
    }
  ): Promise<ChatworkLink> {
    let body = new URLSearchParams();
    if (params?.code) body.append('code', params.code);
    if (params?.needAcceptance !== undefined)
      body.append('need_acceptance', params.needAcceptance ? '1' : '0');
    if (params?.description) body.append('description', params.description);

    let response = await api.post(`/rooms/${roomId}/link`, body.toString(), {
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async deleteRoomLink(roomId: number): Promise<void> {
    await api.delete(`/rooms/${roomId}/link`, { headers: this.headers });
  }
}

// ---- Types ----

export interface ChatworkUser {
  account_id: number;
  room_id: number;
  name: string;
  chatwork_id: string;
  organization_id: number;
  organization_name: string;
  department: string;
  title: string;
  url: string;
  introduction: string;
  mail: string;
  tel_organization: string;
  tel_extension: string;
  tel_mobile: string;
  skype: string;
  facebook: string;
  twitter: string;
  avatar_image_url: string;
  login_mail: string;
}

export interface ChatworkStatus {
  unread_room_num: number;
  mention_room_num: number;
  mytask_room_num: number;
  unread_num: number;
  mention_num: number;
  mytask_num: number;
}

export interface ChatworkContact {
  account_id: number;
  room_id: number;
  name: string;
  chatwork_id: string;
  organization_id: number;
  organization_name: string;
  department: string;
  avatar_image_url: string;
}

export interface ChatworkContactRequest {
  request_id: number;
  account_id: number;
  message: string;
  name: string;
  chatwork_id: string;
  organization_id: number;
  organization_name: string;
  department: string;
  avatar_image_url: string;
}

export interface ChatworkRoom {
  room_id: number;
  name: string;
  type: string;
  role: string;
  sticky: boolean;
  unread_num: number;
  mention_num: number;
  mytask_num: number;
  message_num: number;
  file_num: number;
  task_num: number;
  icon_path: string;
  last_update_time: number;
}

export interface ChatworkRoomDetail extends ChatworkRoom {
  description: string;
}

export interface ChatworkMember {
  account_id: number;
  role: string;
  name: string;
  chatwork_id: string;
  organization_id: number;
  organization_name: string;
  department: string;
  avatar_image_url: string;
}

export interface ChatworkMessage {
  message_id: string;
  account: {
    account_id: number;
    name: string;
    avatar_image_url: string;
  };
  body: string;
  send_time: number;
  update_time: number;
}

export interface ChatworkTask {
  task_id: number;
  room: {
    room_id: number;
    name: string;
    icon_path: string;
  };
  assigned_by_account: {
    account_id: number;
    name: string;
    avatar_image_url: string;
  };
  message_id: string;
  body: string;
  limit_time: number;
  status: string;
  limit_type: string;
}

export interface ChatworkRoomTask {
  task_id: number;
  account: {
    account_id: number;
    name: string;
    avatar_image_url: string;
  };
  assigned_by_account: {
    account_id: number;
    name: string;
    avatar_image_url: string;
  };
  message_id: string;
  body: string;
  limit_time: number;
  status: string;
  limit_type: string;
}

export interface ChatworkFile {
  file_id: number;
  account: {
    account_id: number;
    name: string;
    avatar_image_url: string;
  };
  file_name: string;
  file_size: number;
  upload_time: number;
}

export interface ChatworkFileDetail extends ChatworkFile {
  download_url?: string;
}

export interface ChatworkLink {
  public: boolean;
  url: string;
  need_acceptance: boolean;
  description: string;
}
