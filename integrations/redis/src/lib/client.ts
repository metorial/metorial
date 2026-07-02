import { createAxios } from 'slates';
import { redisApiError } from './errors';

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

  private async request(operation: string, run: () => Promise<{ data: any }>) {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw redisApiError(error, operation);
    }
  }

  // ===== Subscriptions (Pro) =====

  async listSubscriptions() {
    return await this.request('list subscriptions', () => this.http.get('/subscriptions'));
  }

  async getSubscription(subscriptionId: number) {
    return await this.request('get subscription', () =>
      this.http.get(`/subscriptions/${subscriptionId}`)
    );
  }

  async createSubscription(body: Record<string, any>) {
    return await this.request('create subscription', () =>
      this.http.post('/subscriptions', body)
    );
  }

  async updateSubscription(subscriptionId: number, body: Record<string, any>) {
    return await this.request('update subscription', () =>
      this.http.put(`/subscriptions/${subscriptionId}`, body)
    );
  }

  async deleteSubscription(subscriptionId: number) {
    return await this.request('delete subscription', () =>
      this.http.delete(`/subscriptions/${subscriptionId}`)
    );
  }

  // ===== Subscriptions (Essentials) =====

  async listEssentialsSubscriptions() {
    return await this.request('list Essentials subscriptions', () =>
      this.http.get('/fixed/subscriptions')
    );
  }

  async getEssentialsSubscription(subscriptionId: number) {
    return await this.request('get Essentials subscription', () =>
      this.http.get(`/fixed/subscriptions/${subscriptionId}`)
    );
  }

  async createEssentialsSubscription(body: Record<string, any>) {
    return await this.request('create Essentials subscription', () =>
      this.http.post('/fixed/subscriptions', body)
    );
  }

  async updateEssentialsSubscription(subscriptionId: number, body: Record<string, any>) {
    return await this.request('update Essentials subscription', () =>
      this.http.put(`/fixed/subscriptions/${subscriptionId}`, body)
    );
  }

  async deleteEssentialsSubscription(subscriptionId: number) {
    return await this.request('delete Essentials subscription', () =>
      this.http.delete(`/fixed/subscriptions/${subscriptionId}`)
    );
  }

  // ===== Essentials Plans =====

  async listEssentialsPlans() {
    return await this.request('list Essentials plans', () => this.http.get('/fixed/plans'));
  }

  async getEssentialsPlan(planId: number) {
    return await this.request('get Essentials plan', () =>
      this.http.get(`/fixed/plans/${planId}`)
    );
  }

  async listCompatibleEssentialsPlans(subscriptionId: number) {
    return await this.request('list compatible Essentials plans', () =>
      this.http.get(`/fixed/plans/subscriptions/${subscriptionId}`)
    );
  }

  // ===== Databases (Pro) =====

  async listDatabases(subscriptionId: number) {
    return await this.request('list databases', () =>
      this.http.get(`/subscriptions/${subscriptionId}/databases`)
    );
  }

  async getDatabase(subscriptionId: number, databaseId: number) {
    return await this.request('get database', () =>
      this.http.get(`/subscriptions/${subscriptionId}/databases/${databaseId}`)
    );
  }

  async createDatabase(subscriptionId: number, body: Record<string, any>) {
    return await this.request('create database', () =>
      this.http.post(`/subscriptions/${subscriptionId}/databases`, body)
    );
  }

  async updateDatabase(subscriptionId: number, databaseId: number, body: Record<string, any>) {
    return await this.request('update database', () =>
      this.http.put(`/subscriptions/${subscriptionId}/databases/${databaseId}`, body)
    );
  }

  async deleteDatabase(subscriptionId: number, databaseId: number) {
    return await this.request('delete database', () =>
      this.http.delete(`/subscriptions/${subscriptionId}/databases/${databaseId}`)
    );
  }

  // ===== Databases (Essentials) =====

  async listEssentialsDatabases(subscriptionId: number) {
    return await this.request('list Essentials databases', () =>
      this.http.get(`/fixed/subscriptions/${subscriptionId}/databases`)
    );
  }

  async getEssentialsDatabase(subscriptionId: number, databaseId: number) {
    return await this.request('get Essentials database', () =>
      this.http.get(`/fixed/subscriptions/${subscriptionId}/databases/${databaseId}`)
    );
  }

  async createEssentialsDatabase(subscriptionId: number, body: Record<string, any>) {
    return await this.request('create Essentials database', () =>
      this.http.post(`/fixed/subscriptions/${subscriptionId}/databases`, body)
    );
  }

  async updateEssentialsDatabase(
    subscriptionId: number,
    databaseId: number,
    body: Record<string, any>
  ) {
    return await this.request('update Essentials database', () =>
      this.http.put(`/fixed/subscriptions/${subscriptionId}/databases/${databaseId}`, body)
    );
  }

  async deleteEssentialsDatabase(subscriptionId: number, databaseId: number) {
    return await this.request('delete Essentials database', () =>
      this.http.delete(`/fixed/subscriptions/${subscriptionId}/databases/${databaseId}`)
    );
  }

  // ===== Database Backup & Import =====

  async backupDatabase(
    subscriptionId: number,
    databaseId: number,
    body?: Record<string, any>
  ) {
    return await this.request('back up database', () =>
      this.http.post(
        `/subscriptions/${subscriptionId}/databases/${databaseId}/backup`,
        body || {}
      )
    );
  }

  async importDatabase(subscriptionId: number, databaseId: number, body: Record<string, any>) {
    return await this.request('import database', () =>
      this.http.post(`/subscriptions/${subscriptionId}/databases/${databaseId}/import`, body)
    );
  }

  async backupEssentialsDatabase(
    subscriptionId: number,
    databaseId: number,
    body?: Record<string, any>
  ) {
    return await this.request('back up Essentials database', () =>
      this.http.post(
        `/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/backup`,
        body || {}
      )
    );
  }

  async importEssentialsDatabase(
    subscriptionId: number,
    databaseId: number,
    body: Record<string, any>
  ) {
    return await this.request('import Essentials database', () =>
      this.http.post(
        `/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/import`,
        body
      )
    );
  }

  async getDatabaseBackupStatus(
    subscriptionId: number,
    databaseId: number,
    params?: { regionName?: string }
  ) {
    return await this.request('get database backup status', () =>
      this.http.get(`/subscriptions/${subscriptionId}/databases/${databaseId}/backup`, {
        params
      })
    );
  }

  async getEssentialsDatabaseBackupStatus(subscriptionId: number, databaseId: number) {
    return await this.request('get Essentials database backup status', () =>
      this.http.get(`/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/backup`)
    );
  }

  async getDatabaseImportStatus(subscriptionId: number, databaseId: number) {
    return await this.request('get database import status', () =>
      this.http.get(`/subscriptions/${subscriptionId}/databases/${databaseId}/import`)
    );
  }

  async getEssentialsDatabaseImportStatus(subscriptionId: number, databaseId: number) {
    return await this.request('get Essentials database import status', () =>
      this.http.get(`/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/import`)
    );
  }

  async getDatabaseTraffic(subscriptionId: number, databaseId: number) {
    return await this.request('get database traffic', () =>
      this.http.get(`/subscriptions/${subscriptionId}/databases/${databaseId}/traffic`)
    );
  }

  async getEssentialsDatabaseTraffic(subscriptionId: number, databaseId: number) {
    return await this.request('get Essentials database traffic', () =>
      this.http.get(`/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/traffic`)
    );
  }

  async getDatabaseSlowLog(
    subscriptionId: number,
    databaseId: number,
    params?: { regionName?: string }
  ) {
    return await this.request('get database slow log', () =>
      this.http.get(`/subscriptions/${subscriptionId}/databases/${databaseId}/slow-log`, {
        params
      })
    );
  }

  async getEssentialsDatabaseSlowLog(subscriptionId: number, databaseId: number) {
    return await this.request('get Essentials database slow log', () =>
      this.http.get(`/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/slow-log`)
    );
  }

  // ===== ACL Redis Rules =====

  async listAclRules() {
    return await this.request('list ACL rules', () => this.http.get('/acl/redisRules'));
  }

  async getAclRule(ruleId: number) {
    return await this.request('get ACL rule', () =>
      this.http.get(`/acl/redisRules/${ruleId}`)
    );
  }

  async createAclRule(body: Record<string, any>) {
    return await this.request('create ACL rule', () =>
      this.http.post('/acl/redisRules', body)
    );
  }

  async updateAclRule(ruleId: number, body: Record<string, any>) {
    return await this.request('update ACL rule', () =>
      this.http.put(`/acl/redisRules/${ruleId}`, body)
    );
  }

  async deleteAclRule(ruleId: number) {
    return await this.request('delete ACL rule', () =>
      this.http.delete(`/acl/redisRules/${ruleId}`)
    );
  }

  // ===== ACL Roles =====

  async listAclRoles() {
    return await this.request('list ACL roles', () => this.http.get('/acl/roles'));
  }

  async getAclRole(roleId: number) {
    return await this.request('get ACL role', () => this.http.get(`/acl/roles/${roleId}`));
  }

  async createAclRole(body: Record<string, any>) {
    return await this.request('create ACL role', () => this.http.post('/acl/roles', body));
  }

  async updateAclRole(roleId: number, body: Record<string, any>) {
    return await this.request('update ACL role', () =>
      this.http.put(`/acl/roles/${roleId}`, body)
    );
  }

  async deleteAclRole(roleId: number) {
    return await this.request('delete ACL role', () =>
      this.http.delete(`/acl/roles/${roleId}`)
    );
  }

  // ===== ACL Users =====

  async listAclUsers() {
    return await this.request('list ACL users', () => this.http.get('/acl/users'));
  }

  async getAclUser(userId: number) {
    return await this.request('get ACL user', () => this.http.get(`/acl/users/${userId}`));
  }

  async createAclUser(body: Record<string, any>) {
    return await this.request('create ACL user', () => this.http.post('/acl/users', body));
  }

  async updateAclUser(userId: number, body: Record<string, any>) {
    return await this.request('update ACL user', () =>
      this.http.put(`/acl/users/${userId}`, body)
    );
  }

  async deleteAclUser(userId: number) {
    return await this.request('delete ACL user', () =>
      this.http.delete(`/acl/users/${userId}`)
    );
  }

  // ===== Account Users =====

  async listUsers() {
    return await this.request('list users', () => this.http.get('/users'));
  }

  async getUser(userId: number) {
    return await this.request('get user', () => this.http.get(`/users/${userId}`));
  }

  async updateUser(userId: number, body: Record<string, any>) {
    return await this.request('update user', () => this.http.put(`/users/${userId}`, body));
  }

  async deleteUser(userId: number) {
    return await this.request('delete user', () => this.http.delete(`/users/${userId}`));
  }

  // ===== Cloud Accounts =====

  async listCloudAccounts() {
    return await this.request('list cloud accounts', () => this.http.get('/cloud-accounts'));
  }

  async getCloudAccount(cloudAccountId: number) {
    return await this.request('get cloud account', () =>
      this.http.get(`/cloud-accounts/${cloudAccountId}`)
    );
  }

  async createCloudAccount(body: Record<string, any>) {
    return await this.request('create cloud account', () =>
      this.http.post('/cloud-accounts', body)
    );
  }

  async updateCloudAccount(cloudAccountId: number, body: Record<string, any>) {
    return await this.request('update cloud account', () =>
      this.http.put(`/cloud-accounts/${cloudAccountId}`, body)
    );
  }

  async deleteCloudAccount(cloudAccountId: number) {
    return await this.request('delete cloud account', () =>
      this.http.delete(`/cloud-accounts/${cloudAccountId}`)
    );
  }

  // ===== Payment Methods =====

  async listPaymentMethods() {
    return await this.request('list payment methods', () => this.http.get('/payment-methods'));
  }

  // ===== Tasks =====

  async listTasks() {
    return await this.request('list tasks', () => this.http.get('/tasks'));
  }

  async getTask(taskId: string) {
    return await this.request('get task', () => this.http.get(`/tasks/${taskId}`));
  }

  // ===== System Logs =====

  async getLogs(params?: { offset?: number; limit?: number }) {
    return await this.request('get system logs', () => this.http.get('/logs', { params }));
  }

  // ===== Database Configuration Metadata =====

  async listProRedisVersions(subscriptionId?: number) {
    let params = subscriptionId === undefined ? undefined : { subscriptionId };
    return await this.request('list Pro Redis versions', () =>
      this.http.get('/subscriptions/redis-versions', { params })
    );
  }

  async listEssentialsRedisVersions(subscriptionId: number) {
    return await this.request('list Essentials Redis versions', () =>
      this.http.get('/fixed/redis-versions', { params: { subscriptionId } })
    );
  }

  async listDatabaseModules() {
    return await this.request('list database modules', () =>
      this.http.get('/database-modules')
    );
  }

  async listDataPersistenceOptions() {
    return await this.request('list data persistence options', () =>
      this.http.get('/data-persistence')
    );
  }

  // ===== Account =====

  async getAccount() {
    return await this.request('get account', () => this.http.get('/'));
  }
}
