import { createAxios } from 'slates';

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
    let response = await this.http.get('/users', {
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
    });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}`);
    return response.data;
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
    let response = await this.http.post('/users', {
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
    });
    return response.data;
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
    let response = await this.http.patch(`/users/${encodeURIComponent(userId)}`, {
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
    });
    return response.data;
  }

  async deleteUser(userId: string) {
    await this.http.delete(`/users/${encodeURIComponent(userId)}`);
  }

  async getUserRoles(userId: string, params?: { page?: number; perPage?: number }) {
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}/roles`, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async assignUserRoles(userId: string, roleIds: string[]) {
    await this.http.post(`/users/${encodeURIComponent(userId)}/roles`, {
      roles: roleIds
    });
  }

  async removeUserRoles(userId: string, roleIds: string[]) {
    await this.http.delete(`/users/${encodeURIComponent(userId)}/roles`, {
      data: { roles: roleIds }
    });
  }

  async getUserPermissions(userId: string, params?: { page?: number; perPage?: number }) {
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}/permissions`, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async assignUserPermissions(
    userId: string,
    permissions: Array<{ resourceServerIdentifier: string; permissionName: string }>
  ) {
    await this.http.post(`/users/${encodeURIComponent(userId)}/permissions`, {
      permissions: permissions.map(p => ({
        resource_server_identifier: p.resourceServerIdentifier,
        permission_name: p.permissionName
      }))
    });
  }

  async removeUserPermissions(
    userId: string,
    permissions: Array<{ resourceServerIdentifier: string; permissionName: string }>
  ) {
    await this.http.delete(`/users/${encodeURIComponent(userId)}/permissions`, {
      data: {
        permissions: permissions.map(p => ({
          resource_server_identifier: p.resourceServerIdentifier,
          permission_name: p.permissionName
        }))
      }
    });
  }

  // ─── Roles ───

  async listRoles(params?: {
    page?: number;
    perPage?: number;
    includeTotals?: boolean;
    nameFilter?: string;
  }) {
    let response = await this.http.get('/roles', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        include_totals: params?.includeTotals,
        name_filter: params?.nameFilter
      }
    });
    return response.data;
  }

  async getRole(roleId: string) {
    let response = await this.http.get(`/roles/${encodeURIComponent(roleId)}`);
    return response.data;
  }

  async createRole(data: { name: string; description?: string }) {
    let response = await this.http.post('/roles', data);
    return response.data;
  }

  async updateRole(roleId: string, data: { name?: string; description?: string }) {
    let response = await this.http.patch(`/roles/${encodeURIComponent(roleId)}`, data);
    return response.data;
  }

  async deleteRole(roleId: string) {
    await this.http.delete(`/roles/${encodeURIComponent(roleId)}`);
  }

  async getRolePermissions(roleId: string, params?: { page?: number; perPage?: number }) {
    let response = await this.http.get(`/roles/${encodeURIComponent(roleId)}/permissions`, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async addRolePermissions(
    roleId: string,
    permissions: Array<{ resourceServerIdentifier: string; permissionName: string }>
  ) {
    await this.http.post(`/roles/${encodeURIComponent(roleId)}/permissions`, {
      permissions: permissions.map(p => ({
        resource_server_identifier: p.resourceServerIdentifier,
        permission_name: p.permissionName
      }))
    });
  }

  async removeRolePermissions(
    roleId: string,
    permissions: Array<{ resourceServerIdentifier: string; permissionName: string }>
  ) {
    await this.http.delete(`/roles/${encodeURIComponent(roleId)}/permissions`, {
      data: {
        permissions: permissions.map(p => ({
          resource_server_identifier: p.resourceServerIdentifier,
          permission_name: p.permissionName
        }))
      }
    });
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
    let response = await this.http.get('/connections', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        include_totals: params?.includeTotals,
        strategy: params?.strategy,
        name: params?.name,
        fields: params?.fields
      }
    });
    return response.data;
  }

  async getConnection(connectionId: string) {
    let response = await this.http.get(`/connections/${encodeURIComponent(connectionId)}`);
    return response.data;
  }

  async createConnection(data: {
    name: string;
    strategy: string;
    options?: Record<string, unknown>;
    enabledClients?: string[];
    metadata?: Record<string, string>;
  }) {
    let response = await this.http.post('/connections', {
      name: data.name,
      strategy: data.strategy,
      options: data.options,
      enabled_clients: data.enabledClients,
      metadata: data.metadata
    });
    return response.data;
  }

  async updateConnection(
    connectionId: string,
    data: {
      options?: Record<string, unknown>;
      enabledClients?: string[];
      metadata?: Record<string, string>;
    }
  ) {
    let response = await this.http.patch(`/connections/${encodeURIComponent(connectionId)}`, {
      options: data.options,
      enabled_clients: data.enabledClients,
      metadata: data.metadata
    });
    return response.data;
  }

  async deleteConnection(connectionId: string) {
    await this.http.delete(`/connections/${encodeURIComponent(connectionId)}`);
  }

  // ─── Applications (Clients) ───

  async listClients(params?: {
    page?: number;
    perPage?: number;
    includeTotals?: boolean;
    fields?: string;
    appType?: string;
  }) {
    let response = await this.http.get('/clients', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        include_totals: params?.includeTotals,
        fields: params?.fields,
        app_type: params?.appType
      }
    });
    return response.data;
  }

  async getClient(clientId: string) {
    let response = await this.http.get(`/clients/${encodeURIComponent(clientId)}`);
    return response.data;
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
    let response = await this.http.post('/clients', {
      name: data.name,
      app_type: data.appType,
      description: data.description,
      callbacks: data.callbacks,
      allowed_origins: data.allowedOrigins,
      web_origins: data.webOrigins,
      allowed_logout_urls: data.allowedLogoutUrls,
      logo_uri: data.logoUri
    });
    return response.data;
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
    let response = await this.http.patch(`/clients/${encodeURIComponent(clientId)}`, {
      name: data.name,
      app_type: data.appType,
      description: data.description,
      callbacks: data.callbacks,
      allowed_origins: data.allowedOrigins,
      web_origins: data.webOrigins,
      allowed_logout_urls: data.allowedLogoutUrls,
      logo_uri: data.logoUri
    });
    return response.data;
  }

  async deleteClient(clientId: string) {
    await this.http.delete(`/clients/${encodeURIComponent(clientId)}`);
  }

  // ─── Organizations ───

  async listOrganizations(params?: {
    page?: number;
    perPage?: number;
    includeTotals?: boolean;
  }) {
    let response = await this.http.get('/organizations', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        include_totals: params?.includeTotals
      }
    });
    return response.data;
  }

  async getOrganization(organizationId: string) {
    let response = await this.http.get(`/organizations/${encodeURIComponent(organizationId)}`);
    return response.data;
  }

  async getOrganizationByName(name: string) {
    let response = await this.http.get(`/organizations/name/${encodeURIComponent(name)}`);
    return response.data;
  }

  async createOrganization(data: {
    name: string;
    displayName?: string;
    branding?: { logoUrl?: string; colors?: Record<string, string> };
    metadata?: Record<string, string>;
  }) {
    let response = await this.http.post('/organizations', {
      name: data.name,
      display_name: data.displayName,
      branding: data.branding
        ? {
            logo_url: data.branding.logoUrl,
            colors: data.branding.colors
          }
        : undefined,
      metadata: data.metadata
    });
    return response.data;
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
    let response = await this.http.patch(
      `/organizations/${encodeURIComponent(organizationId)}`,
      {
        name: data.name,
        display_name: data.displayName,
        branding: data.branding
          ? {
              logo_url: data.branding.logoUrl,
              colors: data.branding.colors
            }
          : undefined,
        metadata: data.metadata
      }
    );
    return response.data;
  }

  async deleteOrganization(organizationId: string) {
    await this.http.delete(`/organizations/${encodeURIComponent(organizationId)}`);
  }

  async listOrganizationMembers(
    organizationId: string,
    params?: { page?: number; perPage?: number }
  ) {
    let response = await this.http.get(
      `/organizations/${encodeURIComponent(organizationId)}/members`,
      {
        params: { page: params?.page, per_page: params?.perPage }
      }
    );
    return response.data;
  }

  async addOrganizationMembers(organizationId: string, memberIds: string[]) {
    await this.http.post(`/organizations/${encodeURIComponent(organizationId)}/members`, {
      members: memberIds
    });
  }

  async removeOrganizationMembers(organizationId: string, memberIds: string[]) {
    await this.http.delete(`/organizations/${encodeURIComponent(organizationId)}/members`, {
      data: { members: memberIds }
    });
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
    let response = await this.http.get('/logs', {
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
    });
    return response.data;
  }

  async getLogEvent(logEventId: string) {
    let response = await this.http.get(`/logs/${encodeURIComponent(logEventId)}`);
    return response.data;
  }

  // ─── Resource Servers (APIs) ───

  async listResourceServers(params?: {
    page?: number;
    perPage?: number;
    includeTotals?: boolean;
  }) {
    let response = await this.http.get('/resource-servers', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        include_totals: params?.includeTotals
      }
    });
    return response.data;
  }

  async getResourceServer(resourceServerId: string) {
    let response = await this.http.get(
      `/resource-servers/${encodeURIComponent(resourceServerId)}`
    );
    return response.data;
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
    let response = await this.http.post('/resource-servers', {
      name: data.name,
      identifier: data.identifier,
      scopes: data.scopes,
      signing_alg: data.signingAlg,
      token_lifetime: data.tokenLifetime,
      token_dialect: data.tokenDialect,
      skip_consent_for_verifiable_first_party_clients:
        data.skipConsentForVerifiableFirstPartyClients
    });
    return response.data;
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
    let response = await this.http.patch(
      `/resource-servers/${encodeURIComponent(resourceServerId)}`,
      {
        name: data.name,
        scopes: data.scopes,
        signing_alg: data.signingAlg,
        token_lifetime: data.tokenLifetime,
        token_dialect: data.tokenDialect,
        skip_consent_for_verifiable_first_party_clients:
          data.skipConsentForVerifiableFirstPartyClients
      }
    );
    return response.data;
  }

  async deleteResourceServer(resourceServerId: string) {
    await this.http.delete(`/resource-servers/${encodeURIComponent(resourceServerId)}`);
  }

  // ─── Client Grants ───

  async listClientGrants(params?: {
    page?: number;
    perPage?: number;
    audience?: string;
    clientId?: string;
  }) {
    let response = await this.http.get('/client-grants', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        audience: params?.audience,
        client_id: params?.clientId
      }
    });
    return response.data;
  }

  async createClientGrant(data: { clientId: string; audience: string; scope: string[] }) {
    let response = await this.http.post('/client-grants', {
      client_id: data.clientId,
      audience: data.audience,
      scope: data.scope
    });
    return response.data;
  }

  async updateClientGrant(grantId: string, data: { scope: string[] }) {
    let response = await this.http.patch(`/client-grants/${encodeURIComponent(grantId)}`, {
      scope: data.scope
    });
    return response.data;
  }

  async deleteClientGrant(grantId: string) {
    await this.http.delete(`/client-grants/${encodeURIComponent(grantId)}`);
  }

  // ─── Log Streams ───

  async listLogStreams() {
    let response = await this.http.get('/log-streams');
    return response.data;
  }

  async getLogStream(logStreamId: string) {
    let response = await this.http.get(`/log-streams/${encodeURIComponent(logStreamId)}`);
    return response.data;
  }

  async createLogStream(data: {
    name: string;
    type: string;
    sink: Record<string, unknown>;
    filters?: Array<{ type: string; name: string }>;
  }) {
    let response = await this.http.post('/log-streams', {
      name: data.name,
      type: data.type,
      sink: data.sink,
      filters: data.filters
    });
    return response.data;
  }

  async deleteLogStream(logStreamId: string) {
    await this.http.delete(`/log-streams/${encodeURIComponent(logStreamId)}`);
  }

  // ─── Actions ───

  async listActions(params?: { triggerId?: string; deployed?: boolean; installed?: boolean }) {
    let response = await this.http.get('/actions/actions', {
      params: {
        triggerId: params?.triggerId,
        deployed: params?.deployed,
        installed: params?.installed
      }
    });
    return response.data;
  }

  async getAction(actionId: string) {
    let response = await this.http.get(`/actions/actions/${encodeURIComponent(actionId)}`);
    return response.data;
  }

  async createAction(data: {
    name: string;
    supportedTriggers: Array<{ id: string; version: string }>;
    code: string;
    dependencies?: Array<{ name: string; version: string }>;
    secrets?: Array<{ name: string; value: string }>;
  }) {
    let response = await this.http.post('/actions/actions', {
      name: data.name,
      supported_triggers: data.supportedTriggers,
      code: data.code,
      dependencies: data.dependencies,
      secrets: data.secrets
    });
    return response.data;
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
    let response = await this.http.patch(`/actions/actions/${encodeURIComponent(actionId)}`, {
      name: data.name,
      code: data.code,
      dependencies: data.dependencies,
      secrets: data.secrets
    });
    return response.data;
  }

  async deleteAction(actionId: string) {
    await this.http.delete(`/actions/actions/${encodeURIComponent(actionId)}`);
  }

  async deployAction(actionId: string) {
    let response = await this.http.post(
      `/actions/actions/${encodeURIComponent(actionId)}/deploy`
    );
    return response.data;
  }
}
