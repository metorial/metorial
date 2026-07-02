import { createAxios } from 'slates';

export class HabiticaClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: {
    userId: string;
    token: string;
    xClient: string;
  }) {
    this.axios = createAxios({
      baseURL: 'https://habitica.com/api/v3',
      headers: {
        'x-api-user': config.userId,
        'x-api-key': config.token,
        'x-client': config.xClient,
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

  async getUserTasks(taskType?: string): Promise<Record<string, any>[]> {
    let params: Record<string, string> = {};
    if (taskType) params.type = taskType;
    let response = await this.axios.get('/tasks/user', { params });
    return response.data.data;
  }

  async getTask(taskId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/tasks/${taskId}`);
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
    let response = await this.axios.put(`/tasks/${taskId}`, taskData);
    return response.data.data;
  }

  async deleteTask(taskId: string): Promise<Record<string, any>> {
    let response = await this.axios.delete(`/tasks/${taskId}`);
    return response.data.data;
  }

  async scoreTask(taskId: string, direction: 'up' | 'down'): Promise<Record<string, any>> {
    let response = await this.axios.post(`/tasks/${taskId}/score/${direction}`);
    return response.data.data;
  }

  // ---- Task Checklists ----

  async addChecklistItem(taskId: string, text: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/tasks/${taskId}/checklist`, { text });
    return response.data.data;
  }

  async updateChecklistItem(
    taskId: string,
    itemId: string,
    text: string
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/tasks/${taskId}/checklist/${itemId}`, { text });
    return response.data.data;
  }

  async deleteChecklistItem(taskId: string, itemId: string): Promise<Record<string, any>> {
    let response = await this.axios.delete(`/tasks/${taskId}/checklist/${itemId}`);
    return response.data.data;
  }

  async scoreChecklistItem(taskId: string, itemId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/tasks/${taskId}/checklist/${itemId}/score`);
    return response.data.data;
  }

  // ---- Task Tags ----

  async addTagToTask(taskId: string, tagId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/tasks/${taskId}/tags/${tagId}`);
    return response.data.data;
  }

  async removeTagFromTask(taskId: string, tagId: string): Promise<Record<string, any>> {
    let response = await this.axios.delete(`/tasks/${taskId}/tags/${tagId}`);
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
    let response = await this.axios.get(`/tags/${tagId}`);
    return response.data.data;
  }

  async updateTag(tagId: string, name: string): Promise<Record<string, any>> {
    let response = await this.axios.put(`/tags/${tagId}`, { name });
    return response.data.data;
  }

  async deleteTag(tagId: string): Promise<void> {
    await this.axios.delete(`/tags/${tagId}`);
  }

  async reorderTags(tagIds: string[]): Promise<void> {
    await this.axios.post('/reorder-tags', { tags: tagIds });
  }

  // ---- Skills / Spells ----

  async castSkill(spellId: string, targetId?: string): Promise<Record<string, any>> {
    let params: Record<string, string> = {};
    if (targetId) params.targetId = targetId;
    let response = await this.axios.post(`/user/class/cast/${spellId}`, undefined, { params });
    return response.data.data;
  }

  // ---- Groups (Parties & Guilds) ----

  async getGroups(type: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/groups', { params: { type } });
    return response.data.data;
  }

  async getGroup(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/groups/${groupId}`);
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
    let response = await this.axios.put(`/groups/${groupId}`, groupData);
    return response.data.data;
  }

  async joinGroup(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/groups/${groupId}/join`);
    return response.data.data;
  }

  async leaveGroup(groupId: string, keep?: string): Promise<void> {
    await this.axios.post(`/groups/${groupId}/leave`, undefined, {
      params: keep ? { keep } : undefined
    });
  }

  async rejectGroupInvite(groupId: string): Promise<void> {
    await this.axios.post(`/groups/${groupId}/reject-invite`);
  }

  async removeMemberFromGroup(groupId: string, memberId: string): Promise<void> {
    await this.axios.post(`/groups/${groupId}/removeMember/${memberId}`);
  }

  async inviteToGroup(
    groupId: string,
    inviteData: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(`/groups/${groupId}/invite`, inviteData);
    return response.data.data;
  }

  async getGroupMembers(
    groupId: string,
    params?: { lastId?: string; limit?: number }
  ): Promise<Record<string, any>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.lastId) queryParams.lastId = params.lastId;
    if (params?.limit) queryParams.limit = String(params.limit);
    let response = await this.axios.get(`/groups/${groupId}/members`, { params: queryParams });
    return response.data.data;
  }

  // ---- Group Chat ----

  async getGroupChat(groupId: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get(`/groups/${groupId}/chat`);
    return response.data.data;
  }

  async postGroupChatMessage(groupId: string, message: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/groups/${groupId}/chat`, { message });
    return response.data.data;
  }

  async markGroupChatRead(groupId: string): Promise<void> {
    await this.axios.post(`/groups/${groupId}/chat/seen`);
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
    let response = await this.axios.post(`/groups/${groupId}/quests/invite/${questKey}`);
    return response.data.data;
  }

  async acceptQuest(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/groups/${groupId}/quests/accept`);
    return response.data.data;
  }

  async rejectQuest(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/groups/${groupId}/quests/reject`);
    return response.data.data;
  }

  async forceStartQuest(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/groups/${groupId}/quests/force-start`);
    return response.data.data;
  }

  async cancelQuest(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/groups/${groupId}/quests/cancel`);
    return response.data.data;
  }

  async abortQuest(groupId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/groups/${groupId}/quests/abort`);
    return response.data.data;
  }

  // ---- Challenges ----

  async getChallenges(params?: {
    page?: number;
    memberOnly?: boolean;
  }): Promise<Record<string, any>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.memberOnly !== undefined) queryParams.member = String(params.memberOnly);
    let response = await this.axios.get('/challenges/user', { params: queryParams });
    return response.data.data;
  }

  async getGroupChallenges(groupId: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get(`/challenges/groups/${groupId}`);
    return response.data.data;
  }

  async getChallenge(challengeId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/challenges/${challengeId}`);
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
    let response = await this.axios.put(`/challenges/${challengeId}`, challengeData);
    return response.data.data;
  }

  async deleteChallenge(challengeId: string): Promise<void> {
    await this.axios.delete(`/challenges/${challengeId}`);
  }

  async joinChallenge(challengeId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/challenges/${challengeId}/join`);
    return response.data.data;
  }

  async leaveChallenge(challengeId: string, keep?: string): Promise<void> {
    await this.axios.post(`/challenges/${challengeId}/leave`, keep ? { keep } : undefined);
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
    let response = await this.axios.post(`/user/buy-gear/${key}`);
    return response.data.data;
  }

  async equipItem(type: string, key: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/user/equip/${type}/${key}`);
    return response.data.data;
  }

  async hatchPet(egg: string, hatchingPotion: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/user/hatch/${egg}/${hatchingPotion}`);
    return response.data.data;
  }

  async feedPet(pet: string, food: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/user/feed/${pet}/${food}`);
    return response.data.data;
  }

  async sellItem(type: string, key: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/user/sell/${type}/${key}`);
    return response.data.data;
  }

  async purchaseItem(type: string, key: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/user/purchase/${type}/${key}`);
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
    let response = await this.axios.get(`/members/${memberId}`);
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
