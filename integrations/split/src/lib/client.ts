import { createAxios } from 'slates';

let apiV2 = createAxios({
  baseURL: 'https://api.split.io/internal/api/v2'
});

let apiV3 = createAxios({
  baseURL: 'https://api.split.io/internal/api/v3'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ─── Workspaces ────────────────────────────────────────────

  async listWorkspaces(params?: { offset?: number; limit?: number; name?: string }) {
    let res = await apiV2.get('/workspaces', {
      headers: this.headers(),
      params: {
        offset: params?.offset ?? 0,
        limit: params?.limit ?? 50,
        ...(params?.name ? { name: params.name } : {})
      }
    });
    return res.data as {
      objects: Array<{
        id: string;
        name: string;
        type: string;
        requiresTitleAndComments: boolean;
      }>;
      offset: number;
      limit: number;
      totalCount: number;
    };
  }

  // ─── Environments ──────────────────────────────────────────

  async listEnvironments(workspaceId: string) {
    let res = await apiV2.get(`/environments/ws/${workspaceId}`, {
      headers: this.headers()
    });
    return res.data as Array<{
      id: string;
      name: string;
      type: string;
      production: boolean;
      creationTime: number;
    }>;
  }

  async createEnvironment(workspaceId: string, body: { name: string; production?: boolean }) {
    let res = await apiV2.post(`/environments/ws/${workspaceId}`, body, {
      headers: this.headers()
    });
    return res.data as {
      id: string;
      name: string;
      type: string;
      production: boolean;
      creationTime: number;
    };
  }

  async deleteEnvironment(workspaceId: string, environmentIdOrName: string) {
    await apiV2.delete(`/environments/ws/${workspaceId}/${environmentIdOrName}`, {
      headers: this.headers()
    });
  }

  // ─── Traffic Types ─────────────────────────────────────────

  async listTrafficTypes(workspaceId: string) {
    let res = await apiV2.get(`/trafficTypes/ws/${workspaceId}`, {
      headers: this.headers()
    });
    return res.data as Array<{
      id: string;
      name: string;
      displayAttributeId: string | null;
    }>;
  }

  // ─── Feature Flags (Splits) ────────────────────────────────

  async createFeatureFlag(
    workspaceId: string,
    trafficTypeIdOrName: string,
    body: { name: string; description?: string }
  ) {
    let res = await apiV2.post(
      `/splits/ws/${workspaceId}/trafficTypes/${trafficTypeIdOrName}`,
      body,
      {
        headers: this.headers()
      }
    );
    return res.data as FeatureFlag;
  }

  async getFeatureFlag(workspaceId: string, flagName: string) {
    let res = await apiV2.get(`/splits/ws/${workspaceId}/${flagName}`, {
      headers: this.headers()
    });
    return res.data as FeatureFlag;
  }

  async listFeatureFlags(
    workspaceId: string,
    params?: { offset?: number; limit?: number; tag?: string; name?: string }
  ) {
    let res = await apiV2.get(`/splits/ws/${workspaceId}`, {
      headers: this.headers(),
      params: {
        offset: params?.offset ?? 0,
        limit: params?.limit ?? 50,
        ...(params?.tag ? { tag: params.tag } : {}),
        ...(params?.name ? { name: params.name } : {})
      }
    });
    return res.data as {
      objects: FeatureFlag[];
      offset: number;
      limit: number;
      totalCount: number;
    };
  }

  async updateFeatureFlagMetadata(
    workspaceId: string,
    flagName: string,
    operations: JsonPatchOp[]
  ) {
    let res = await apiV2.patch(`/splits/ws/${workspaceId}/${flagName}`, operations, {
      headers: this.headers()
    });
    return res.data as FeatureFlag;
  }

  async deleteFeatureFlag(workspaceId: string, flagName: string) {
    await apiV2.delete(`/splits/ws/${workspaceId}/${flagName}`, {
      headers: this.headers()
    });
  }

  // ─── Feature Flag Definitions (Environment-level) ──────────

  async createFlagDefinition(
    workspaceId: string,
    flagName: string,
    environmentId: string,
    body: FlagDefinitionBody
  ) {
    let res = await apiV2.post(
      `/splits/ws/${workspaceId}/${flagName}/environments/${environmentId}`,
      body,
      {
        headers: this.headers()
      }
    );
    return res.data as FlagDefinition;
  }

  async getFlagDefinition(workspaceId: string, flagName: string, environmentIdOrName: string) {
    let res = await apiV2.get(
      `/splits/ws/${workspaceId}/${flagName}/environments/${environmentIdOrName}`,
      {
        headers: this.headers()
      }
    );
    return res.data as FlagDefinition;
  }

  async listFlagDefinitions(
    workspaceId: string,
    environmentIdOrName: string,
    params?: { offset?: number; limit?: number }
  ) {
    let res = await apiV2.get(
      `/splits/ws/${workspaceId}/environments/${environmentIdOrName}`,
      {
        headers: this.headers(),
        params: {
          offset: params?.offset ?? 0,
          limit: params?.limit ?? 50
        }
      }
    );
    return res.data as {
      objects: FlagDefinition[];
      offset: number;
      limit: number;
      totalCount: number;
    };
  }

  async updateFlagDefinition(
    workspaceId: string,
    flagName: string,
    environmentId: string,
    operations: JsonPatchOp[]
  ) {
    let res = await apiV2.patch(
      `/splits/ws/${workspaceId}/${flagName}/environments/${environmentId}`,
      operations,
      {
        headers: this.headers()
      }
    );
    return res.data as FlagDefinition;
  }

  async fullUpdateFlagDefinition(
    workspaceId: string,
    flagName: string,
    environmentId: string,
    body: FlagDefinitionBody
  ) {
    let res = await apiV2.put(
      `/splits/ws/${workspaceId}/${flagName}/environments/${environmentId}`,
      body,
      {
        headers: this.headers()
      }
    );
    return res.data as FlagDefinition;
  }

  async killFlag(workspaceId: string, flagName: string, environmentId: string) {
    let res = await apiV2.put(
      `/splits/ws/${workspaceId}/${flagName}/environments/${environmentId}/kill`,
      {},
      {
        headers: this.headers()
      }
    );
    return res.data as FlagDefinition;
  }

  async restoreFlag(workspaceId: string, flagName: string, environmentId: string) {
    let res = await apiV2.put(
      `/splits/ws/${workspaceId}/${flagName}/environments/${environmentId}/restore`,
      {},
      {
        headers: this.headers()
      }
    );
    return res.data as FlagDefinition;
  }

  async removeFlagDefinition(workspaceId: string, flagName: string, environmentId: string) {
    await apiV2.delete(`/splits/ws/${workspaceId}/${flagName}/environments/${environmentId}`, {
      headers: this.headers()
    });
  }

  // ─── Segments ──────────────────────────────────────────────

  async createSegment(
    workspaceId: string,
    trafficTypeId: string,
    body: { name: string; description?: string }
  ) {
    let res = await apiV2.post(
      `/segments/ws/${workspaceId}/trafficTypes/${trafficTypeId}`,
      body,
      {
        headers: this.headers()
      }
    );
    return res.data as Segment;
  }

  async listSegments(workspaceId: string) {
    let res = await apiV2.get(`/segments/ws/${workspaceId}`, {
      headers: this.headers()
    });
    return res.data as {
      objects: Segment[];
      offset: number;
      limit: number;
      totalCount: number;
    };
  }

  async deleteSegment(workspaceId: string, segmentName: string) {
    await apiV2.delete(`/segments/ws/${workspaceId}/${segmentName}`, {
      headers: this.headers()
    });
  }

  async activateSegmentInEnv(environmentId: string, segmentName: string) {
    let res = await apiV2.post(
      `/segments/${environmentId}/${segmentName}`,
      {},
      {
        headers: this.headers()
      }
    );
    return res.data;
  }

  async deactivateSegmentInEnv(environmentId: string, segmentName: string) {
    await apiV2.delete(`/segments/${environmentId}/${segmentName}`, {
      headers: this.headers()
    });
  }

  async getSegmentKeys(environmentId: string, segmentName: string) {
    let res = await apiV2.get(`/segments/${environmentId}/${segmentName}/keys`, {
      headers: this.headers()
    });
    return res.data as {
      keys: Array<{ key: string }>;
      count: number;
      offset: number;
      limit: number;
    };
  }

  async uploadSegmentKeys(environmentId: string, segmentName: string, keys: string[]) {
    let res = await apiV2.put(`/segments/${environmentId}/${segmentName}/upload`, keys, {
      headers: this.headers()
    });
    return res.data;
  }

  async removeSegmentKeys(
    environmentId: string,
    segmentName: string,
    keys: string[],
    comment?: string
  ) {
    let res = await apiV2.put(
      `/segments/${environmentId}/${segmentName}/removeKeys`,
      {
        keys,
        comment: comment ?? ''
      },
      {
        headers: this.headers()
      }
    );
    return res.data;
  }

  // ─── Flag Sets (v3) ───────────────────────────────────────

  async createFlagSet(body: {
    name: string;
    description?: string;
    workspace: { id: string; type: string };
  }) {
    let res = await apiV3.post('/flag-sets', body, {
      headers: this.headers()
    });
    return res.data as FlagSet;
  }

  async listFlagSets(workspaceId: string, params?: { limit?: number; after?: string }) {
    let res = await apiV3.get('/flag-sets', {
      headers: this.headers(),
      params: {
        workspace_id: workspaceId,
        limit: params?.limit ?? 50,
        ...(params?.after ? { after: params.after } : {})
      }
    });
    return res.data as {
      data: FlagSet[];
      nextMarker?: string;
      previousMarker?: string;
      limit: number;
      count: number;
    };
  }

  async getFlagSet(flagSetId: string) {
    let res = await apiV3.get(`/flag-sets/${flagSetId}`, {
      headers: this.headers()
    });
    return res.data as FlagSet;
  }

  async deleteFlagSet(flagSetId: string) {
    await apiV3.delete(`/flag-sets/${flagSetId}`, {
      headers: this.headers()
    });
  }

  // ─── Users ─────────────────────────────────────────────────

  async inviteUser(email: string, groups?: Array<{ id: string; type: string }>) {
    let res = await apiV2.post(
      '/users',
      { email, groups: groups ?? [] },
      {
        headers: this.headers()
      }
    );
    return res.data as SplitUser;
  }

  async listUsers(params?: { limit?: number; after?: string; status?: string }) {
    let res = await apiV2.get('/users', {
      headers: this.headers(),
      params: {
        limit: params?.limit ?? 50,
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.status ? { status: params.status } : {})
      }
    });
    return res.data as {
      data: SplitUser[];
      nextMarker?: string;
      previousMarker?: string;
      limit: number;
      count: number;
    };
  }

  async getUser(userId: string) {
    let res = await apiV2.get(`/users/${userId}`, {
      headers: this.headers()
    });
    return res.data as SplitUser;
  }

  async updateUser(
    userId: string,
    body: { email: string; name: string; status: string; '2fa': boolean; type: string }
  ) {
    let res = await apiV2.put(`/users/${userId}`, body, {
      headers: this.headers()
    });
    return res.data as SplitUser;
  }

  async deleteUser(userId: string) {
    await apiV2.delete(`/users/${userId}`, {
      headers: this.headers()
    });
  }

  // ─── Groups ────────────────────────────────────────────────

  async createGroup(body: { name: string; description?: string }) {
    let res = await apiV2.post('/groups', body, {
      headers: this.headers()
    });
    return res.data as SplitGroup;
  }

  async listGroups(params?: { offset?: number; limit?: number }) {
    let res = await apiV2.get('/groups', {
      headers: this.headers(),
      params: {
        offset: params?.offset ?? 0,
        limit: params?.limit ?? 50
      }
    });
    return res.data as {
      objects: SplitGroup[];
      offset: number;
      limit: number;
      totalCount: number;
    };
  }

  async updateGroup(groupId: string, body: { name: string; description?: string }) {
    let res = await apiV2.put(`/groups/${groupId}`, body, {
      headers: this.headers()
    });
    return res.data as SplitGroup;
  }

  async deleteGroup(groupId: string) {
    await apiV2.delete(`/groups/${groupId}`, {
      headers: this.headers()
    });
  }

  // ─── Rollout Statuses ─────────────────────────────────────

  async listRolloutStatuses(workspaceId: string) {
    let res = await apiV2.get('/rolloutStatuses', {
      headers: this.headers(),
      params: { wsId: workspaceId }
    });
    return res.data as Array<{
      id: string;
      name: string;
      description: string;
    }>;
  }

  // ─── Attributes ────────────────────────────────────────────

  async listAttributes(workspaceId: string, trafficTypeId: string) {
    let res = await apiV2.get(`/schema/ws/${workspaceId}/trafficTypes/${trafficTypeId}`, {
      headers: this.headers()
    });
    return res.data as Array<{
      id: string;
      displayName: string;
      description: string;
      dataType: string;
      suggestedValues: string[];
      organizationId: string;
      trafficTypeId: string;
      isSearchable: boolean;
    }>;
  }

  async createAttribute(
    workspaceId: string,
    trafficTypeId: string,
    body: {
      id: string;
      displayName?: string;
      description?: string;
      dataType: string;
      suggestedValues?: string[];
    }
  ) {
    let res = await apiV2.post(
      `/schema/ws/${workspaceId}/trafficTypes/${trafficTypeId}`,
      body,
      {
        headers: this.headers()
      }
    );
    return res.data;
  }

  // ─── Identities ────────────────────────────────────────────

  async saveIdentities(
    trafficTypeId: string,
    environmentId: string,
    identities: Array<{ key: string; values: Record<string, unknown> }>
  ) {
    let res = await apiV2.post(
      `/trafficTypes/${trafficTypeId}/environments/${environmentId}/identities`,
      identities,
      {
        headers: this.headers()
      }
    );
    return res.data;
  }

  // ─── Change Requests ──────────────────────────────────────

  async listChangeRequests(params?: { limit?: number; after?: string }) {
    let res = await apiV2.get('/changeRequests', {
      headers: this.headers(),
      params: {
        limit: params?.limit ?? 50,
        ...(params?.after ? { after: params.after } : {})
      }
    });
    return res.data;
  }
}

// ─── Types ─────────────────────────────────────────────────

export type JsonPatchOp = {
  op: 'replace' | 'add' | 'remove';
  path: string;
  value?: unknown;
};

export type FeatureFlag = {
  id: string;
  name: string;
  description: string | null;
  trafficType: { id: string; name: string };
  creationTime: number;
  rolloutStatus?: { id: string; name: string } | null;
  tags: Array<{ name: string }>;
};

export type FlagDefinition = {
  id: string;
  name: string;
  environment: { id: string; name: string };
  trafficType: { id: string; name: string };
  killed: boolean;
  treatments: Treatment[];
  defaultTreatment: string;
  baselineTreatment?: string;
  trafficAllocation: number;
  rules: Rule[];
  defaultRule: Bucket[];
  creationTime: number;
  lastUpdateTime: number;
  changeNumber?: number;
  openChangeRequestId?: string | null;
  impressionsDisabled?: boolean;
};

export type Treatment = {
  name: string;
  description?: string;
  configurations?: string;
  keys?: string[];
  segments?: string[];
};

export type Bucket = {
  treatment: string;
  size: number;
};

export type Matcher = {
  negate?: boolean;
  type: string;
  attribute?: string;
  string?: string;
  bool?: boolean;
  strings?: string[];
  number?: number;
  date?: number;
  between?: { from: number; to: number };
  depends?: { splitName: string; treatment: string };
};

export type Condition = {
  combiner: string;
  matchers: Matcher[];
};

export type Rule = {
  buckets: Bucket[];
  condition: Condition;
};

export type FlagDefinitionBody = {
  treatments: Treatment[];
  defaultTreatment: string;
  baselineTreatment?: string;
  rules?: Rule[];
  defaultRule: Bucket[];
  trafficAllocation?: number;
  comment?: string;
};

export type Segment = {
  name: string;
  description?: string | null;
  trafficType?: { id: string; name: string };
  creationTime?: number;
  tags?: Array<{ name: string }>;
};

export type FlagSet = {
  id: string;
  type: string;
  name: string;
  description?: string;
  workspace: { id: string; type: string };
  createdAt: string;
};

export type SplitUser = {
  id: string;
  email: string;
  name: string;
  status: string;
  '2fa': boolean;
  type: string;
  groups: Array<{ id: string; type: string }>;
};

export type SplitGroup = {
  id: string;
  name: string;
  description?: string;
  type: string;
};
