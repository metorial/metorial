import { createAxios } from 'slates';
import { auth0ApiError } from './errors';

export class Auth0Client {
  private http: ReturnType<typeof createAxios>;

  constructor(params: { token: string; domain: string }) {
    this.http = createAxios({
      baseURL: `https://${params.domain}/api/v2`,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async request(operation: string, run: () => Promise<{ data: any }>): Promise<any> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw auth0ApiError(error, operation);
    }
  }

  private async send(operation: string, run: () => Promise<unknown>) {
    try {
      await run();
    } catch (error) {
      throw auth0ApiError(error, operation);
    }
  }

  // ─── Users ───

  async listUsers(params?: {
    q?: string;
    page?: number;
    perPage?: number;
    includeTotals?: boolean;
    sort?: string;
    connection?: string;
    fields?: string;
    includeFields?: boolean;
    searchEngine?: string;
  }) {
    return await this.request('list users', () =>
      this.http.get('/users', {
        params: {
          q: params?.q,
          page: params?.page,
          per_page: params?.perPage,
          include_totals: params?.includeTotals,
          sort: params?.sort,
          connection: params?.connection,
          fields: params?.fields,
          include_fields: params?.includeFields,
          search_engine: params?.searchEngine ?? 'v3'
        }
      })
    );
  }

  async getUser(userId: string) {
    return await this.request('get user', () =>
      this.http.get(`/users/${encodeURIComponent(userId)}`)
    );
  }

  async createUser(data: {
    connection: string;
    email?: string;
    password?: string;
    username?: string;
    phoneNumber?: string;
    userMetadata?: Record<string, unknown>;
    appMetadata?: Record<string, unknown>;
    blocked?: boolean;
    emailVerified?: boolean;
    verifyEmail?: boolean;
    phoneVerified?: boolean;
  }) {
    return await this.request('create user', () =>
      this.http.post('/users', {
        connection: data.connection,
        email: data.email,
        password: data.password,
        username: data.username,
        phone_number: data.phoneNumber,
        user_metadata: data.userMetadata,
        app_metadata: data.appMetadata,
        blocked: data.blocked,
        email_verified: data.emailVerified,
        verify_email: data.verifyEmail,
        phone_verified: data.phoneVerified
      })
    );
  }

  async updateUser(
    userId: string,
    data: {
      email?: string;
      password?: string;
      username?: string;
      phoneNumber?: string;
      userMetadata?: Record<string, unknown>;
      appMetadata?: Record<string, unknown>;
      blocked?: boolean;
      emailVerified?: boolean;
      phoneVerified?: boolean;
      connection?: string;
      clientId?: string;
      name?: string;
      nickname?: string;
      picture?: string;
      givenName?: string;
      familyName?: string;
    }
  ) {
    return await this.request('update user', () =>
      this.http.patch(`/users/${encodeURIComponent(userId)}`, {
        email: data.email,
        password: data.password,
        username: data.username,
        phone_number: data.phoneNumber,
        user_metadata: data.userMetadata,
        app_metadata: data.appMetadata,
        blocked: data.blocked,
        email_verified: data.emailVerified,
        phone_verified: data.phoneVerified,
        connection: data.connection,
        client_id: data.clientId,
        name: data.name,
        nickname: data.nickname,
        picture: data.picture,
        given_name: data.givenName,
        family_name: data.familyName
      })
    );
  }

  async deleteUser(userId: string) {
    await this.send('delete user', () =>
      this.http.delete(`/users/${encodeURIComponent(userId)}`)
    );
  }

  async getUserRoles(userId: string, params?: { page?: number; perPage?: number }) {
    return await this.request('get user roles', () =>
      this.http.get(`/users/${encodeURIComponent(userId)}/roles`, {
        params: { page: params?.page, per_page: params?.perPage }
      })
    );
  }

  async assignUserRoles(userId: string, roleIds: string[]) {
    await this.send('assign user roles', () =>
      this.http.post(`/users/${encodeURIComponent(userId)}/roles`, {
        roles: roleIds
      })
    );
  }

  async removeUserRoles(userId: string, roleIds: string[]) {
    await this.send('remove user roles', () =>
      this.http.delete(`/users/${encodeURIComponent(userId)}/roles`, {
        data: { roles: roleIds }
      })
    );
  }

  async getUserPermissions(userId: string, params?: { page?: number; perPage?: number }) {
    return await this.request('get user permissions', () =>
      this.http.get(`/users/${encodeURIComponent(userId)}/permissions`, {
        params: { page: params?.page, per_page: params?.perPage }
      })
    );
  }

  async assignUserPermissions(
    userId: string,
    permissions: Array<{ resourceServerIdentifier: string; permissionName: string }>
  ) {
    await this.send('assign user permissions', () =>
      this.http.post(`/users/${encodeURIComponent(userId)}/permissions`, {
        permissions: permissions.map(p => ({
          resource_server_identifier: p.resourceServerIdentifier,
          permission_name: p.permissionName
        }))
      })
    );
  }

  async removeUserPermissions(
    userId: string,
    permissions: Array<{ resourceServerIdentifier: string; permissionName: string }>
  ) {
    await this.send('remove user permissions', () =>
      this.http.delete(`/users/${encodeURIComponent(userId)}/permissions`, {
        data: {
          permissions: permissions.map(p => ({
            resource_server_identifier: p.resourceServerIdentifier,
            permission_name: p.permissionName
          }))
        }
      })
    );
  }

  // ─── Roles ───

  async listRoles(params?: {
    page?: number;
    perPage?: number;
    includeTotals?: boolean;
    nameFilter?: string;
  }) {
    return await this.request('list roles', () =>
      this.http.get('/roles', {
        params: {
          page: params?.page,
          per_page: params?.perPage,
          include_totals: params?.includeTotals,
          name_filter: params?.nameFilter
        }
      })
    );
  }

  async getRole(roleId: string) {
    return await this.request('get role', () =>
      this.http.get(`/roles/${encodeURIComponent(roleId)}`)
    );
  }

  async createRole(data: { name: string; description?: string }) {
    return await this.request('create role', () => this.http.post('/roles', data));
  }

  async updateRole(roleId: string, data: { name?: string; description?: string }) {
    return await this.request('update role', () =>
      this.http.patch(`/roles/${encodeURIComponent(roleId)}`, data)
    );
  }

  async deleteRole(roleId: string) {
    await this.send('delete role', () =>
      this.http.delete(`/roles/${encodeURIComponent(roleId)}`)
    );
  }

  async getRolePermissions(roleId: string, params?: { page?: number; perPage?: number }) {
    return await this.request('get role permissions', () =>
      this.http.get(`/roles/${encodeURIComponent(roleId)}/permissions`, {
        params: { page: params?.page, per_page: params?.perPage }
      })
    );
  }

  async addRolePermissions(
    roleId: string,
    permissions: Array<{ resourceServerIdentifier: string; permissionName: string }>
  ) {
    await this.send('add role permissions', () =>
      this.http.post(`/roles/${encodeURIComponent(roleId)}/permissions`, {
        permissions: permissions.map(p => ({
          resource_server_identifier: p.resourceServerIdentifier,
          permission_name: p.permissionName
        }))
      })
    );
  }

  async removeRolePermissions(
    roleId: string,
    permissions: Array<{ resourceServerIdentifier: string; permissionName: string }>
  ) {
    await this.send('remove role permissions', () =>
      this.http.delete(`/roles/${encodeURIComponent(roleId)}/permissions`, {
        data: {
          permissions: permissions.map(p => ({
            resource_server_identifier: p.resourceServerIdentifier,
            permission_name: p.permissionName
          }))
        }
      })
    );
  }

  // ─── Connections ───

  async listConnections(params?: {
    page?: number;
    perPage?: number;
    includeTotals?: boolean;
    strategy?: string;
    name?: string;
    fields?: string;
  }) {
    return await this.request('list connections', () =>
      this.http.get('/connections', {
        params: {
          page: params?.page,
          per_page: params?.perPage,
          include_totals: params?.includeTotals,
          strategy: params?.strategy,
          name: params?.name,
          fields: params?.fields
        }
      })
    );
  }

  async getConnection(connectionId: string) {
    return await this.request('get connection', () =>
      this.http.get(`/connections/${encodeURIComponent(connectionId)}`)
    );
  }

  async createConnection(data: {
    name: string;
    strategy: string;
    options?: Record<string, unknown>;
    enabledClients?: string[];
    metadata?: Record<string, string>;
  }) {
    return await this.request('create connection', () =>
      this.http.post('/connections', {
        name: data.name,
        strategy: data.strategy,
        options: data.options,
        enabled_clients: data.enabledClients,
        metadata: data.metadata
      })
    );
  }

  async updateConnection(
    connectionId: string,
    data: {
      options?: Record<string, unknown>;
      enabledClients?: string[];
      metadata?: Record<string, string>;
    }
  ) {
    return await this.request('update connection', () =>
      this.http.patch(`/connections/${encodeURIComponent(connectionId)}`, {
        options: data.options,
        enabled_clients: data.enabledClients,
        metadata: data.metadata
      })
    );
  }

  async deleteConnection(connectionId: string) {
    await this.send('delete connection', () =>
      this.http.delete(`/connections/${encodeURIComponent(connectionId)}`)
    );
  }

  // ─── Applications (Clients) ───

  async listClients(params?: {
    page?: number;
    perPage?: number;
    includeTotals?: boolean;
    fields?: string;
    appType?: string;
  }) {
    return await this.request('list applications', () =>
      this.http.get('/clients', {
        params: {
          page: params?.page,
          per_page: params?.perPage,
          include_totals: params?.includeTotals,
          fields: params?.fields,
          app_type: params?.appType
        }
      })
    );
  }

  async getClient(clientId: string) {
    return await this.request('get application', () =>
      this.http.get(`/clients/${encodeURIComponent(clientId)}`)
    );
  }

  async createClient(data: {
    name: string;
    appType?: string;
    description?: string;
    callbacks?: string[];
    allowedOrigins?: string[];
    webOrigins?: string[];
    allowedLogoutUrls?: string[];
    logoUri?: string;
  }) {
    return await this.request('create application', () =>
      this.http.post('/clients', {
        name: data.name,
        app_type: data.appType,
        description: data.description,
        callbacks: data.callbacks,
        allowed_origins: data.allowedOrigins,
        web_origins: data.webOrigins,
        allowed_logout_urls: data.allowedLogoutUrls,
        logo_uri: data.logoUri
      })
    );
  }

  async updateClient(
    clientId: string,
    data: {
      name?: string;
      appType?: string;
      description?: string;
      callbacks?: string[];
      allowedOrigins?: string[];
      webOrigins?: string[];
      allowedLogoutUrls?: string[];
      logoUri?: string;
    }
  ) {
    return await this.request('update application', () =>
      this.http.patch(`/clients/${encodeURIComponent(clientId)}`, {
        name: data.name,
        app_type: data.appType,
        description: data.description,
        callbacks: data.callbacks,
        allowed_origins: data.allowedOrigins,
        web_origins: data.webOrigins,
        allowed_logout_urls: data.allowedLogoutUrls,
        logo_uri: data.logoUri
      })
    );
  }

  async deleteClient(clientId: string) {
    await this.send('delete application', () =>
      this.http.delete(`/clients/${encodeURIComponent(clientId)}`)
    );
  }

  // ─── Organizations ───

  async listOrganizations(params?: {
    page?: number;
    perPage?: number;
    includeTotals?: boolean;
  }) {
    return await this.request('list organizations', () =>
      this.http.get('/organizations', {
        params: {
          page: params?.page,
          per_page: params?.perPage,
          include_totals: params?.includeTotals
        }
      })
    );
  }

  async getOrganization(organizationId: string) {
    return await this.request('get organization', () =>
      this.http.get(`/organizations/${encodeURIComponent(organizationId)}`)
    );
  }

  async getOrganizationByName(name: string) {
    return await this.request('get organization by name', () =>
      this.http.get(`/organizations/name/${encodeURIComponent(name)}`)
    );
  }

  async createOrganization(data: {
    name: string;
    displayName?: string;
    branding?: { logoUrl?: string; colors?: Record<string, string> };
    metadata?: Record<string, string>;
  }) {
    return await this.request('create organization', () =>
      this.http.post('/organizations', {
        name: data.name,
        display_name: data.displayName,
        branding: data.branding
          ? {
              logo_url: data.branding.logoUrl,
              colors: data.branding.colors
            }
          : undefined,
        metadata: data.metadata
      })
    );
  }

  async updateOrganization(
    organizationId: string,
    data: {
      name?: string;
      displayName?: string;
      branding?: { logoUrl?: string; colors?: Record<string, string> };
      metadata?: Record<string, string>;
    }
  ) {
    return await this.request('update organization', () =>
      this.http.patch(`/organizations/${encodeURIComponent(organizationId)}`, {
        name: data.name,
        display_name: data.displayName,
        branding: data.branding
          ? {
              logo_url: data.branding.logoUrl,
              colors: data.branding.colors
            }
          : undefined,
        metadata: data.metadata
      })
    );
  }

  async deleteOrganization(organizationId: string) {
    await this.send('delete organization', () =>
      this.http.delete(`/organizations/${encodeURIComponent(organizationId)}`)
    );
  }

  async listOrganizationMembers(
    organizationId: string,
    params?: { page?: number; perPage?: number }
  ) {
    return await this.request('list organization members', () =>
      this.http.get(`/organizations/${encodeURIComponent(organizationId)}/members`, {
        params: { page: params?.page, per_page: params?.perPage }
      })
    );
  }

  async addOrganizationMembers(organizationId: string, memberIds: string[]) {
    await this.send('add organization members', () =>
      this.http.post(`/organizations/${encodeURIComponent(organizationId)}/members`, {
        members: memberIds
      })
    );
  }

  async removeOrganizationMembers(organizationId: string, memberIds: string[]) {
    await this.send('remove organization members', () =>
      this.http.delete(`/organizations/${encodeURIComponent(organizationId)}/members`, {
        data: { members: memberIds }
      })
    );
  }

  async getOrganizationMemberRoles(
    organizationId: string,
    userId: string,
    params?: { page?: number; perPage?: number }
  ) {
    return await this.request('get organization member roles', () =>
      this.http.get(
        `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}/roles`,
        {
          params: { page: params?.page, per_page: params?.perPage }
        }
      )
    );
  }

  async assignOrganizationMemberRoles(
    organizationId: string,
    userId: string,
    roleIds: string[]
  ) {
    await this.send('assign organization member roles', () =>
      this.http.post(
        `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}/roles`,
        {
          roles: roleIds
        }
      )
    );
  }

  async removeOrganizationMemberRoles(
    organizationId: string,
    userId: string,
    roleIds: string[]
  ) {
    await this.send('remove organization member roles', () =>
      this.http.delete(
        `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}/roles`,
        {
          data: { roles: roleIds }
        }
      )
    );
  }

  // ─── Logs ───

  async getLogs(params?: {
    q?: string;
    page?: number;
    perPage?: number;
    sort?: string;
    fields?: string;
    includeFields?: boolean;
    includeTotals?: boolean;
    from?: string;
    take?: number;
  }) {
    return await this.request('get logs', () =>
      this.http.get('/logs', {
        params: {
          q: params?.q,
          page: params?.page,
          per_page: params?.perPage,
          sort: params?.sort,
          fields: params?.fields,
          include_fields: params?.includeFields,
          include_totals: params?.includeTotals,
          from: params?.from,
          take: params?.take
        }
      })
    );
  }

  async getLogEvent(logEventId: string) {
    return await this.request('get log event', () =>
      this.http.get(`/logs/${encodeURIComponent(logEventId)}`)
    );
  }

  // ─── Resource Servers (APIs) ───

  async listResourceServers(params?: {
    page?: number;
    perPage?: number;
    includeTotals?: boolean;
  }) {
    return await this.request('list resource servers', () =>
      this.http.get('/resource-servers', {
        params: {
          page: params?.page,
          per_page: params?.perPage,
          include_totals: params?.includeTotals
        }
      })
    );
  }

  async getResourceServer(resourceServerId: string) {
    return await this.request('get resource server', () =>
      this.http.get(`/resource-servers/${encodeURIComponent(resourceServerId)}`)
    );
  }

  async createResourceServer(data: {
    name: string;
    identifier: string;
    scopes?: Array<{ value: string; description?: string }>;
    signingAlg?: string;
    tokenLifetime?: number;
    tokenDialect?: string;
    skipConsentForVerifiableFirstPartyClients?: boolean;
  }) {
    return await this.request('create resource server', () =>
      this.http.post('/resource-servers', {
        name: data.name,
        identifier: data.identifier,
        scopes: data.scopes,
        signing_alg: data.signingAlg,
        token_lifetime: data.tokenLifetime,
        token_dialect: data.tokenDialect,
        skip_consent_for_verifiable_first_party_clients:
          data.skipConsentForVerifiableFirstPartyClients
      })
    );
  }

  async updateResourceServer(
    resourceServerId: string,
    data: {
      name?: string;
      scopes?: Array<{ value: string; description?: string }>;
      signingAlg?: string;
      tokenLifetime?: number;
      tokenDialect?: string;
      skipConsentForVerifiableFirstPartyClients?: boolean;
    }
  ) {
    return await this.request('update resource server', () =>
      this.http.patch(`/resource-servers/${encodeURIComponent(resourceServerId)}`, {
        name: data.name,
        scopes: data.scopes,
        signing_alg: data.signingAlg,
        token_lifetime: data.tokenLifetime,
        token_dialect: data.tokenDialect,
        skip_consent_for_verifiable_first_party_clients:
          data.skipConsentForVerifiableFirstPartyClients
      })
    );
  }

  async deleteResourceServer(resourceServerId: string) {
    await this.send('delete resource server', () =>
      this.http.delete(`/resource-servers/${encodeURIComponent(resourceServerId)}`)
    );
  }

  // ─── Client Grants ───

  async listClientGrants(params?: {
    page?: number;
    perPage?: number;
    audience?: string;
    clientId?: string;
  }) {
    return await this.request('list client grants', () =>
      this.http.get('/client-grants', {
        params: {
          page: params?.page,
          per_page: params?.perPage,
          audience: params?.audience,
          client_id: params?.clientId
        }
      })
    );
  }

  async createClientGrant(data: { clientId: string; audience: string; scope: string[] }) {
    return await this.request('create client grant', () =>
      this.http.post('/client-grants', {
        client_id: data.clientId,
        audience: data.audience,
        scope: data.scope
      })
    );
  }

  async updateClientGrant(grantId: string, data: { scope: string[] }) {
    return await this.request('update client grant', () =>
      this.http.patch(`/client-grants/${encodeURIComponent(grantId)}`, {
        scope: data.scope
      })
    );
  }

  async deleteClientGrant(grantId: string) {
    await this.send('delete client grant', () =>
      this.http.delete(`/client-grants/${encodeURIComponent(grantId)}`)
    );
  }

  // ─── Log Streams ───

  async listLogStreams() {
    return await this.request('list log streams', () => this.http.get('/log-streams'));
  }

  async getLogStream(logStreamId: string) {
    return await this.request('get log stream', () =>
      this.http.get(`/log-streams/${encodeURIComponent(logStreamId)}`)
    );
  }

  async createLogStream(data: {
    name: string;
    type: string;
    sink: Record<string, unknown>;
    filters?: Array<{ type: string; name: string }>;
  }) {
    return await this.request('create log stream', () =>
      this.http.post('/log-streams', {
        name: data.name,
        type: data.type,
        sink: data.sink,
        filters: data.filters
      })
    );
  }

  async updateLogStream(
    logStreamId: string,
    data: {
      name?: string;
      status?: string;
      filters?: Array<{ type: string; name: string }>;
    }
  ) {
    return await this.request('update log stream', () =>
      this.http.patch(`/log-streams/${encodeURIComponent(logStreamId)}`, {
        name: data.name,
        status: data.status,
        filters: data.filters
      })
    );
  }

  async deleteLogStream(logStreamId: string) {
    await this.send('delete log stream', () =>
      this.http.delete(`/log-streams/${encodeURIComponent(logStreamId)}`)
    );
  }

  // ─── Actions ───

  async listActions(params?: { triggerId?: string; deployed?: boolean; installed?: boolean }) {
    return await this.request('list actions', () =>
      this.http.get('/actions/actions', {
        params: {
          triggerId: params?.triggerId,
          deployed: params?.deployed,
          installed: params?.installed
        }
      })
    );
  }

  async getAction(actionId: string) {
    return await this.request('get action', () =>
      this.http.get(`/actions/actions/${encodeURIComponent(actionId)}`)
    );
  }

  async createAction(data: {
    name: string;
    supportedTriggers: Array<{ id: string; version: string }>;
    code: string;
    dependencies?: Array<{ name: string; version: string }>;
    secrets?: Array<{ name: string; value: string }>;
  }) {
    return await this.request('create action', () =>
      this.http.post('/actions/actions', {
        name: data.name,
        supported_triggers: data.supportedTriggers,
        code: data.code,
        dependencies: data.dependencies,
        secrets: data.secrets
      })
    );
  }

  async updateAction(
    actionId: string,
    data: {
      name?: string;
      code?: string;
      dependencies?: Array<{ name: string; version: string }>;
      secrets?: Array<{ name: string; value: string }>;
    }
  ) {
    return await this.request('update action', () =>
      this.http.patch(`/actions/actions/${encodeURIComponent(actionId)}`, {
        name: data.name,
        code: data.code,
        dependencies: data.dependencies,
        secrets: data.secrets
      })
    );
  }

  async deleteAction(actionId: string) {
    await this.send('delete action', () =>
      this.http.delete(`/actions/actions/${encodeURIComponent(actionId)}`)
    );
  }

  async deployAction(actionId: string) {
    return await this.request('deploy action', () =>
      this.http.post(`/actions/actions/${encodeURIComponent(actionId)}/deploy`)
    );
  }
}
