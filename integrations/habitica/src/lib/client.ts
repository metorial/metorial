import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export class HabiticaClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: {
    userId: string;
    token: string;
    xClient?: string;
  }) {
    if (!config.userId.trim() || !config.token.trim()) {
      throw createApiServiceError(
        'Habitica User ID and API Token are required. Reconnect with your API credentials.'
      );
    }
    let xClient = config.xClient?.trim();
    if (!xClient) {
      throw createApiServiceError(
        "The Habitica application identifier is missing. Reconnect and provide the tool creator's User ID and app name as CreatorUserID-AppName."
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://habitica.com/api/v3',
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Habitica',
          reason: 'habitica_api_error'
        }),
      headers: {
        'x-api-user': config.userId.trim(),
        'x-api-key': config.token.trim(),
        'x-client': xClient,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- User ----

  async getUser(userFields?: string): Promise<Record<string, any>> {
    let params: Record<string, string> = {};
    if (userFields) params.userFields = userFields;
    let response = await this.axios.get('/user', { params });
    return response.data.data;
  }

  async updateUser(updates: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.put('/user', updates);
    return response.data.data;
  }

  async buyHealthPotion(): Promise<Record<string, any>> {
    let response = await this.axios.post('/user/buy-health-potion');
    return response.data.data;
  }

  async revive(): Promise<Record<string, any>> {
    let response = await this.axios.post('/user/revive');
    return response.data.data;
  }

  async allocateStatPoint(stat: string): Promise<Record<string, any>> {
    let response = await this.axios.post('/user/allocate', undefined, {
      params: { stat }
    });
    return response.data.data;
  }

  async changeClass(className: string): Promise<Record<string, any>> {
    let response = await this.axios.post('/user/change-class', undefined, {
      params: { class: className }
    });
    return response.data.data;
  }

  // ---- Tasks ----

  async getUserTasks(taskType?: string, dueDate?: string): Promise<Record<string, any>[]> {
    let params: Record<string, string> = {};
    if (taskType) params.type = taskType;
    if (dueDate) params.dueDate = dueDate;
    let response = await this.axios.get('/tasks/user', { params });
    return response.data.data;
  }

  async getTask(taskId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/tasks/${encodeURIComponent(taskId)}`);
    return response.data.data;
  }

  async createTask(taskData: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/tasks/user', taskData);
    return response.data.data;
  }

  async updateTask(
    taskId: string,
    taskData: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/tasks/${encodeURIComponent(taskId)}`, taskData);
    return response.data.data;
  }

  async deleteTask(taskId: string): Promise<Record<string, any>> {
    let response = await this.axios.delete(`/tasks/${encodeURIComponent(taskId)}`);
    return response.data.data;
  }

  async scoreTask(taskId: string, direction: 'up' | 'down'): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/tasks/${encodeURIComponent(taskId)}/score/${direction}`
    );
    return response.data.data;
  }

  // ---- Task Checklists ----

  async addChecklistItem(
    taskId: string,
    text: string,
    completed?: boolean
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/tasks/${encodeURIComponent(taskId)}/checklist`,
      pickDefined({ text, completed })
    );
    return response.data.data;
  }

  async updateChecklistItem(
    taskId: string,
    itemId: string,
    text: string,
    completed?: boolean
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(
      `/tasks/${encodeURIComponent(taskId)}/checklist/${encodeURIComponent(itemId)}`,
      pickDefined({ text, completed })
    );
    return response.data.data;
  }

  async deleteChecklistItem(taskId: string, itemId: string): Promise<Record<string, any>> {
    let response = await this.axios.delete(
      `/tasks/${encodeURIComponent(taskId)}/checklist/${encodeURIComponent(itemId)}`
    );
    return response.data.data;
  }

  async scoreChecklistItem(taskId: string, itemId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/tasks/${encodeURIComponent(taskId)}/checklist/${encodeURIComponent(itemId)}/score`
    );
    return response.data.data;
  }

  // ---- Task Tags ----

  async addTagToTask(taskId: string, tagId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/tasks/${encodeURIComponent(taskId)}/tags/${encodeURIComponent(tagId)}`
    );
    return response.data.data;
  }

  async removeTagFromTask(taskId: string, tagId: string): Promise<Record<string, any>> {
    let response = await this.axios.delete(
      `/tasks/${encodeURIComponent(taskId)}/tags/${encodeURIComponent(tagId)}`
    );
    return response.data.data;
  }

  // ---- Tags ----

  async getTags(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/tags');
    return response.data.data;
  }

  async createTag(name: string): Promise<Record<string, any>> {
    let response = await this.axios.post('/tags', { name });
    return response.data.data;
  }

  async getTag(tagId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/tags/${encodeURIComponent(tagId)}`);
    return response.data.data;
  }

  async updateTag(tagId: string, name: string): Promise<Record<string, any>> {
    let response = await this.axios.put(`/tags/${encodeURIComponent(tagId)}`, { name });
    return response.data.data;
  }

  async deleteTag(tagId: string): Promise<void> {
    await this.axios.delete(`/tags/${encodeURIComponent(tagId)}`);
  }

  async reorderTags(tagIds: string[]): Promise<void> {
    await this.axios.post('/reorder-tags', { tags: tagIds });
  }

  // ---- Skills / Spells ----

  async castSkill(spellId: string, targetId?: string): Promise<Record<string, any>> {
    let params: Record<string, string> = {};
    if (targetId) params.targetId = targetId;
    let response = await this.axios.post(
      `/user/class/cast/${encodeURIComponent(spellId)}`,
      undefined,
      { params }
    );
    return response.data.data;
  }

  // ---- Groups (Parties & Guilds) ----

  async getGroups(type: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/groups', { params: { type } });
    return response.data.data;
  }

  async getGroup(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/groups/${encodeURIComponent(groupId)}`);
    return response.data.data;
  }

  async createGroup(groupData: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/groups', groupData);
    return response.data.data;
  }

  async updateGroup(
    groupId: string,
    groupData: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/groups/${encodeURIComponent(groupId)}`, groupData);
    return response.data.data;
  }

  async joinGroup(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/groups/${encodeURIComponent(groupId)}/join`);
    return response.data.data;
  }

  async leaveGroup(groupId: string, keep?: string): Promise<void> {
    await this.axios.post(`/groups/${encodeURIComponent(groupId)}/leave`, undefined, {
      params: keep ? { keep } : undefined
    });
  }

  async rejectGroupInvite(groupId: string): Promise<void> {
    await this.axios.post(`/groups/${encodeURIComponent(groupId)}/reject-invite`);
  }

  async removeMemberFromGroup(groupId: string, memberId: string): Promise<void> {
    await this.axios.post(
      `/groups/${encodeURIComponent(groupId)}/removeMember/${encodeURIComponent(memberId)}`
    );
  }

  async inviteToGroup(
    groupId: string,
    inviteData: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/groups/${encodeURIComponent(groupId)}/invite`,
      inviteData
    );
    return response.data.data;
  }

  async getGroupMembers(
    groupId: string,
    params?: { lastId?: string; limit?: number }
  ): Promise<Record<string, any>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.lastId) queryParams.lastId = params.lastId;
    if (params?.limit) queryParams.limit = String(params.limit);
    let response = await this.axios.get(`/groups/${encodeURIComponent(groupId)}/members`, {
      params: queryParams
    });
    return response.data.data;
  }

  // ---- Group Chat ----

  async getGroupChat(groupId: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get(`/groups/${encodeURIComponent(groupId)}/chat`);
    return response.data.data;
  }

  async postGroupChatMessage(groupId: string, message: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/groups/${encodeURIComponent(groupId)}/chat`, {
      message
    });
    return response.data.data;
  }

  async markGroupChatRead(groupId: string): Promise<void> {
    await this.axios.post(`/groups/${encodeURIComponent(groupId)}/chat/seen`);
  }

  // ---- Private Messages ----

  async sendPrivateMessage(toUserId: string, message: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/members/send-private-message`, {
      toUserId,
      message
    });
    return response.data.data;
  }

  async markPrivateMessagesRead(): Promise<void> {
    await this.axios.post('/user/mark-pms-read');
  }

  // ---- Quests ----

  async inviteToQuest(groupId: string, questKey: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/groups/${encodeURIComponent(groupId)}/quests/invite/${encodeURIComponent(questKey)}`
    );
    return response.data.data;
  }

  async acceptQuest(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/groups/${encodeURIComponent(groupId)}/quests/accept`
    );
    return response.data.data;
  }

  async rejectQuest(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/groups/${encodeURIComponent(groupId)}/quests/reject`
    );
    return response.data.data;
  }

  async forceStartQuest(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/groups/${encodeURIComponent(groupId)}/quests/force-start`
    );
    return response.data.data;
  }

  async cancelQuest(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/groups/${encodeURIComponent(groupId)}/quests/cancel`
    );
    return response.data.data;
  }

  async abortQuest(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/groups/${encodeURIComponent(groupId)}/quests/abort`
    );
    return response.data.data;
  }

  // ---- Challenges ----

  async getChallenges(params?: {
    page?: number;
    memberOnly?: boolean;
  }): Promise<Record<string, any>[]> {
    let queryParams: Record<string, string> = { page: String(params?.page ?? 0) };
    if (params?.memberOnly === true) queryParams.member = 'true';
    let response = await this.axios.get('/challenges/user', { params: queryParams });
    return response.data.data;
  }

  async getGroupChallenges(groupId: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get(`/challenges/groups/${encodeURIComponent(groupId)}`);
    return response.data.data;
  }

  async getChallenge(challengeId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/challenges/${encodeURIComponent(challengeId)}`);
    return response.data.data;
  }

  async createChallenge(challengeData: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/challenges', challengeData);
    return response.data.data;
  }

  async updateChallenge(
    challengeId: string,
    challengeData: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(
      `/challenges/${encodeURIComponent(challengeId)}`,
      challengeData
    );
    return response.data.data;
  }

  async deleteChallenge(challengeId: string): Promise<void> {
    await this.axios.delete(`/challenges/${encodeURIComponent(challengeId)}`);
  }

  async joinChallenge(challengeId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/challenges/${encodeURIComponent(challengeId)}/join`
    );
    return response.data.data;
  }

  async leaveChallenge(challengeId: string, keep?: string): Promise<void> {
    await this.axios.post(
      `/challenges/${encodeURIComponent(challengeId)}/leave`,
      keep ? { keep } : undefined
    );
  }

  // ---- Content ----

  async getContent(language?: string): Promise<Record<string, any>> {
    let params: Record<string, string> = {};
    if (language) params.language = language;
    let response = await this.axios.get('/content', { params });
    return response.data.data;
  }

  // ---- Inventory / Equipment ----

  async buyGear(key: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/user/buy-gear/${encodeURIComponent(key)}`);
    return response.data.data;
  }

  async equipItem(type: string, key: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/user/equip/${encodeURIComponent(type)}/${encodeURIComponent(key)}`
    );
    return response.data.data;
  }

  async hatchPet(egg: string, hatchingPotion: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/user/hatch/${encodeURIComponent(egg)}/${encodeURIComponent(hatchingPotion)}`
    );
    return response.data.data;
  }

  async feedPet(pet: string, food: string): Promise<{ value: number; message?: string }> {
    let response = await this.axios.post(
      `/user/feed/${encodeURIComponent(pet)}/${encodeURIComponent(food)}`
    );
    return { value: response.data.data, message: response.data.message };
  }

  async sellItem(type: string, key: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/user/sell/${encodeURIComponent(type)}/${encodeURIComponent(key)}`
    );
    return response.data.data;
  }

  async purchaseItem(type: string, key: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/user/purchase/${encodeURIComponent(type)}/${encodeURIComponent(key)}`
    );
    return response.data.data;
  }

  // ---- Webhooks ----

  async getWebhooks(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/user/webhook');
    return response.data.data;
  }

  async createWebhook(webhookData: {
    url: string;
    label?: string;
    type: string;
    enabled?: boolean;
    options?: Record<string, any>;
  }): Promise<Record<string, any>> {
    let response = await this.axios.post('/user/webhook', webhookData);
    return response.data.data;
  }

  async updateWebhook(
    webhookId: string,
    webhookData: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/user/webhook/${webhookId}`, webhookData);
    return response.data.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/user/webhook/${webhookId}`);
  }

  // ---- Members ----

  async getMember(memberId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/members/${encodeURIComponent(memberId)}`);
    return response.data.data;
  }

  // ---- Status ----

  async getStatus(): Promise<Record<string, any>> {
    let response = await this.axios.get('/status');
    return response.data.data;
  }

  // ---- Cron ----

  async runCron(): Promise<void> {
    await this.axios.post('/cron');
  }
}
