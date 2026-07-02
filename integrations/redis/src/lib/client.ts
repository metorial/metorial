import { createAxios } from 'slates';

export class RedisCloudClient {
  private http;

  constructor(auth: { accountKey: string; userKey: string }) {
    this.http = createAxios({
      baseURL: 'https://api.redislabs.com/v1',
      headers: {
        'x-api-key': auth.accountKey,
        'x-api-secret-key': auth.userKey,
        'Content-Type': 'application/json'
      }
    });
  }

  // ===== Subscriptions (Pro) =====

  async listSubscriptions() {
    let response = await this.http.get('/subscriptions');
    return response.data;
  }

  async getSubscription(subscriptionId: number) {
    let response = await this.http.get(`/subscriptions/${subscriptionId}`);
    return response.data;
  }

  async createSubscription(body: Record<string, any>) {
    let response = await this.http.post('/subscriptions', body);
    return response.data;
  }

  async updateSubscription(subscriptionId: number, body: Record<string, any>) {
    let response = await this.http.put(`/subscriptions/${subscriptionId}`, body);
    return response.data;
  }

  async deleteSubscription(subscriptionId: number) {
    let response = await this.http.delete(`/subscriptions/${subscriptionId}`);
    return response.data;
  }

  // ===== Subscriptions (Essentials) =====

  async listEssentialsSubscriptions() {
    let response = await this.http.get('/fixed/subscriptions');
    return response.data;
  }

  async getEssentialsSubscription(subscriptionId: number) {
    let response = await this.http.get(`/fixed/subscriptions/${subscriptionId}`);
    return response.data;
  }

  async createEssentialsSubscription(body: Record<string, any>) {
    let response = await this.http.post('/fixed/subscriptions', body);
    return response.data;
  }

  async updateEssentialsSubscription(subscriptionId: number, body: Record<string, any>) {
    let response = await this.http.put(`/fixed/subscriptions/${subscriptionId}`, body);
    return response.data;
  }

  async deleteEssentialsSubscription(subscriptionId: number) {
    let response = await this.http.delete(`/fixed/subscriptions/${subscriptionId}`);
    return response.data;
  }

  // ===== Essentials Plans =====

  async listEssentialsPlans() {
    let response = await this.http.get('/fixed/plans');
    return response.data;
  }

  // ===== Databases (Pro) =====

  async listDatabases(subscriptionId: number) {
    let response = await this.http.get(`/subscriptions/${subscriptionId}/databases`);
    return response.data;
  }

  async getDatabase(subscriptionId: number, databaseId: number) {
    let response = await this.http.get(
      `/subscriptions/${subscriptionId}/databases/${databaseId}`
    );
    return response.data;
  }

  async createDatabase(subscriptionId: number, body: Record<string, any>) {
    let response = await this.http.post(`/subscriptions/${subscriptionId}/databases`, body);
    return response.data;
  }

  async updateDatabase(subscriptionId: number, databaseId: number, body: Record<string, any>) {
    let response = await this.http.put(
      `/subscriptions/${subscriptionId}/databases/${databaseId}`,
      body
    );
    return response.data;
  }

  async deleteDatabase(subscriptionId: number, databaseId: number) {
    let response = await this.http.delete(
      `/subscriptions/${subscriptionId}/databases/${databaseId}`
    );
    return response.data;
  }

  // ===== Databases (Essentials) =====

  async listEssentialsDatabases(subscriptionId: number) {
    let response = await this.http.get(`/fixed/subscriptions/${subscriptionId}/databases`);
    return response.data;
  }

  async getEssentialsDatabase(subscriptionId: number, databaseId: number) {
    let response = await this.http.get(
      `/fixed/subscriptions/${subscriptionId}/databases/${databaseId}`
    );
    return response.data;
  }

  async createEssentialsDatabase(subscriptionId: number, body: Record<string, any>) {
    let response = await this.http.post(
      `/fixed/subscriptions/${subscriptionId}/databases`,
      body
    );
    return response.data;
  }

  async updateEssentialsDatabase(
    subscriptionId: number,
    databaseId: number,
    body: Record<string, any>
  ) {
    let response = await this.http.put(
      `/fixed/subscriptions/${subscriptionId}/databases/${databaseId}`,
      body
    );
    return response.data;
  }

  async deleteEssentialsDatabase(subscriptionId: number, databaseId: number) {
    let response = await this.http.delete(
      `/fixed/subscriptions/${subscriptionId}/databases/${databaseId}`
    );
    return response.data;
  }

  // ===== Database Backup & Import =====

  async backupDatabase(
    subscriptionId: number,
    databaseId: number,
    body?: Record<string, any>
  ) {
    let response = await this.http.post(
      `/subscriptions/${subscriptionId}/databases/${databaseId}/backup`,
      body || {}
    );
    return response.data;
  }

  async importDatabase(subscriptionId: number, databaseId: number, body: Record<string, any>) {
    let response = await this.http.post(
      `/subscriptions/${subscriptionId}/databases/${databaseId}/import`,
      body
    );
    return response.data;
  }

  async backupEssentialsDatabase(
    subscriptionId: number,
    databaseId: number,
    body?: Record<string, any>
  ) {
    let response = await this.http.post(
      `/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/backup`,
      body || {}
    );
    return response.data;
  }

  async importEssentialsDatabase(
    subscriptionId: number,
    databaseId: number,
    body: Record<string, any>
  ) {
    let response = await this.http.post(
      `/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/import`,
      body
    );
    return response.data;
  }

  // ===== ACL Redis Rules =====

  async listAclRules() {
    let response = await this.http.get('/acl/redisRules');
    return response.data;
  }

  async getAclRule(ruleId: number) {
    let response = await this.http.get(`/acl/redisRules/${ruleId}`);
    return response.data;
  }

  async createAclRule(body: Record<string, any>) {
    let response = await this.http.post('/acl/redisRules', body);
    return response.data;
  }

  async updateAclRule(ruleId: number, body: Record<string, any>) {
    let response = await this.http.put(`/acl/redisRules/${ruleId}`, body);
    return response.data;
  }

  async deleteAclRule(ruleId: number) {
    let response = await this.http.delete(`/acl/redisRules/${ruleId}`);
    return response.data;
  }

  // ===== ACL Roles =====

  async listAclRoles() {
    let response = await this.http.get('/acl/roles');
    return response.data;
  }

  async getAclRole(roleId: number) {
    let response = await this.http.get(`/acl/roles/${roleId}`);
    return response.data;
  }

  async createAclRole(body: Record<string, any>) {
    let response = await this.http.post('/acl/roles', body);
    return response.data;
  }

  async updateAclRole(roleId: number, body: Record<string, any>) {
    let response = await this.http.put(`/acl/roles/${roleId}`, body);
    return response.data;
  }

  async deleteAclRole(roleId: number) {
    let response = await this.http.delete(`/acl/roles/${roleId}`);
    return response.data;
  }

  // ===== ACL Users =====

  async listAclUsers() {
    let response = await this.http.get('/acl/users');
    return response.data;
  }

  async getAclUser(userId: number) {
    let response = await this.http.get(`/acl/users/${userId}`);
    return response.data;
  }

  async createAclUser(body: Record<string, any>) {
    let response = await this.http.post('/acl/users', body);
    return response.data;
  }

  async updateAclUser(userId: number, body: Record<string, any>) {
    let response = await this.http.put(`/acl/users/${userId}`, body);
    return response.data;
  }

  async deleteAclUser(userId: number) {
    let response = await this.http.delete(`/acl/users/${userId}`);
    return response.data;
  }

  // ===== Account Users =====

  async listUsers() {
    let response = await this.http.get('/users');
    return response.data;
  }

  async getUser(userId: number) {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  async updateUser(userId: number, body: Record<string, any>) {
    let response = await this.http.put(`/users/${userId}`, body);
    return response.data;
  }

  async deleteUser(userId: number) {
    let response = await this.http.delete(`/users/${userId}`);
    return response.data;
  }

  // ===== Cloud Accounts =====

  async listCloudAccounts() {
    let response = await this.http.get('/cloud-accounts');
    return response.data;
  }

  async getCloudAccount(cloudAccountId: number) {
    let response = await this.http.get(`/cloud-accounts/${cloudAccountId}`);
    return response.data;
  }

  async createCloudAccount(body: Record<string, any>) {
    let response = await this.http.post('/cloud-accounts', body);
    return response.data;
  }

  async updateCloudAccount(cloudAccountId: number, body: Record<string, any>) {
    let response = await this.http.put(`/cloud-accounts/${cloudAccountId}`, body);
    return response.data;
  }

  async deleteCloudAccount(cloudAccountId: number) {
    let response = await this.http.delete(`/cloud-accounts/${cloudAccountId}`);
    return response.data;
  }

  // ===== Payment Methods =====

  async listPaymentMethods() {
    let response = await this.http.get('/payment-methods');
    return response.data;
  }

  async getPaymentMethod(paymentMethodId: number) {
    let response = await this.http.get(`/payment-methods/${paymentMethodId}`);
    return response.data;
  }

  // ===== Tasks =====

  async listTasks() {
    let response = await this.http.get('/tasks');
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await this.http.get(`/tasks/${taskId}`);
    return response.data;
  }

  // ===== System Logs =====

  async getLogs(params?: { offset?: number; limit?: number }) {
    let response = await this.http.get('/logs', { params });
    return response.data;
  }

  // ===== Account =====

  async getAccount() {
    let response = await this.http.get('/');
    return response.data;
  }
}
