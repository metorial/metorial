import { createAxios } from 'slates';
import type {
  Actor,
  Connection,
  Datatank,
  DatatankTable,
  Organization,
  OrgMember,
  PaginatedResponse,
  PaginationParams,
  Pipeline,
  Process,
  QueryResult,
  Snapshot,
  Workspace
} from './types';

let snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
};

let camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

let transformKeys = <T>(obj: unknown, transformer: (key: string) => string): T => {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map(item => transformKeys(item, transformer)) as T;
  if (typeof obj === 'object') {
    let result: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[transformer(key)] = transformKeys(value, transformer);
    }
    return result as T;
  }
  return obj as T;
};

let toCamel = <T>(obj: unknown): T => transformKeys<T>(obj, snakeToCamel);
let toSnake = <T>(obj: unknown): T => transformKeys<T>(obj, camelToSnake);

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Actor ----

  async getActor(): Promise<Actor> {
    let response = await this.axios.get('/actor');
    return toCamel<Actor>(response.data);
  }

  // ---- Workspaces ----

  async listUserWorkspaces(
    userHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Workspace>> {
    let response = await this.axios.get(`/user/${userHandle}/workspace`, {
      params: {
        limit: params?.limit,
        next_token: params?.nextToken
      }
    });
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Workspace>(item)),
      nextToken: data.next_token
    };
  }

  async getUserWorkspace(userHandle: string, workspaceHandle: string): Promise<Workspace> {
    let response = await this.axios.get(`/user/${userHandle}/workspace/${workspaceHandle}`);
    return toCamel<Workspace>(response.data);
  }

  async createUserWorkspace(
    userHandle: string,
    workspace: {
      handle: string;
      instanceType?: string;
      desiredState?: string;
    }
  ): Promise<Workspace> {
    let response = await this.axios.post(`/user/${userHandle}/workspace`, toSnake(workspace));
    return toCamel<Workspace>(response.data);
  }

  async updateUserWorkspace(
    userHandle: string,
    workspaceHandle: string,
    updates: {
      handle?: string;
      instanceType?: string;
      desiredState?: string;
      dbVolumeSizeBytes?: number;
    }
  ): Promise<Workspace> {
    let response = await this.axios.patch(
      `/user/${userHandle}/workspace/${workspaceHandle}`,
      toSnake(updates)
    );
    return toCamel<Workspace>(response.data);
  }

  async deleteUserWorkspace(userHandle: string, workspaceHandle: string): Promise<Workspace> {
    let response = await this.axios.delete(`/user/${userHandle}/workspace/${workspaceHandle}`);
    return toCamel<Workspace>(response.data);
  }

  async listOrgWorkspaces(
    orgHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Workspace>> {
    let response = await this.axios.get(`/org/${orgHandle}/workspace`, {
      params: {
        limit: params?.limit,
        next_token: params?.nextToken
      }
    });
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Workspace>(item)),
      nextToken: data.next_token
    };
  }

  async getOrgWorkspace(orgHandle: string, workspaceHandle: string): Promise<Workspace> {
    let response = await this.axios.get(`/org/${orgHandle}/workspace/${workspaceHandle}`);
    return toCamel<Workspace>(response.data);
  }

  async createOrgWorkspace(
    orgHandle: string,
    workspace: {
      handle: string;
      instanceType?: string;
      desiredState?: string;
    }
  ): Promise<Workspace> {
    let response = await this.axios.post(`/org/${orgHandle}/workspace`, toSnake(workspace));
    return toCamel<Workspace>(response.data);
  }

  async updateOrgWorkspace(
    orgHandle: string,
    workspaceHandle: string,
    updates: {
      handle?: string;
      instanceType?: string;
      desiredState?: string;
      dbVolumeSizeBytes?: number;
    }
  ): Promise<Workspace> {
    let response = await this.axios.patch(
      `/org/${orgHandle}/workspace/${workspaceHandle}`,
      toSnake(updates)
    );
    return toCamel<Workspace>(response.data);
  }

  async deleteOrgWorkspace(orgHandle: string, workspaceHandle: string): Promise<Workspace> {
    let response = await this.axios.delete(`/org/${orgHandle}/workspace/${workspaceHandle}`);
    return toCamel<Workspace>(response.data);
  }

  // ---- Query ----

  async executeQuery(
    userHandle: string,
    workspaceHandle: string,
    sql: string
  ): Promise<QueryResult> {
    let response = await this.axios.post(
      `/user/${userHandle}/workspace/${workspaceHandle}/query`,
      { sql }
    );
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Record<string, unknown>>(item)),
      columns: data.columns?.map((col: unknown) =>
        toCamel<{ name: string; dataType: string }>(col)
      )
    };
  }

  async executeOrgQuery(
    orgHandle: string,
    workspaceHandle: string,
    sql: string
  ): Promise<QueryResult> {
    let response = await this.axios.post(
      `/org/${orgHandle}/workspace/${workspaceHandle}/query`,
      { sql }
    );
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Record<string, unknown>>(item)),
      columns: data.columns?.map((col: unknown) =>
        toCamel<{ name: string; dataType: string }>(col)
      )
    };
  }

  // ---- Connections ----

  async listUserConnections(
    userHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Connection>> {
    let response = await this.axios.get(`/user/${userHandle}/connection`, {
      params: {
        limit: params?.limit,
        next_token: params?.nextToken
      }
    });
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Connection>(item)),
      nextToken: data.next_token
    };
  }

  async getUserConnection(userHandle: string, connectionHandle: string): Promise<Connection> {
    let response = await this.axios.get(`/user/${userHandle}/connection/${connectionHandle}`);
    return toCamel<Connection>(response.data);
  }

  async createUserConnection(
    userHandle: string,
    connection: {
      handle: string;
      plugin: string;
      config?: Record<string, unknown>;
    }
  ): Promise<Connection> {
    let response = await this.axios.post(
      `/user/${userHandle}/connection`,
      toSnake(connection)
    );
    return toCamel<Connection>(response.data);
  }

  async updateUserConnection(
    userHandle: string,
    connectionHandle: string,
    updates: {
      handle?: string;
      config?: Record<string, unknown>;
    }
  ): Promise<Connection> {
    let response = await this.axios.patch(
      `/user/${userHandle}/connection/${connectionHandle}`,
      toSnake(updates)
    );
    return toCamel<Connection>(response.data);
  }

  async deleteUserConnection(
    userHandle: string,
    connectionHandle: string
  ): Promise<Connection> {
    let response = await this.axios.delete(
      `/user/${userHandle}/connection/${connectionHandle}`
    );
    return toCamel<Connection>(response.data);
  }

  async testUserConnection(userHandle: string, connectionHandle: string): Promise<unknown> {
    let response = await this.axios.post(
      `/user/${userHandle}/connection/${connectionHandle}/test`
    );
    return response.data;
  }

  async listOrgConnections(
    orgHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Connection>> {
    let response = await this.axios.get(`/org/${orgHandle}/connection`, {
      params: {
        limit: params?.limit,
        next_token: params?.nextToken
      }
    });
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Connection>(item)),
      nextToken: data.next_token
    };
  }

  async getOrgConnection(orgHandle: string, connectionHandle: string): Promise<Connection> {
    let response = await this.axios.get(`/org/${orgHandle}/connection/${connectionHandle}`);
    return toCamel<Connection>(response.data);
  }

  async createOrgConnection(
    orgHandle: string,
    connection: {
      handle: string;
      plugin: string;
      config?: Record<string, unknown>;
    }
  ): Promise<Connection> {
    let response = await this.axios.post(`/org/${orgHandle}/connection`, toSnake(connection));
    return toCamel<Connection>(response.data);
  }

  async updateOrgConnection(
    orgHandle: string,
    connectionHandle: string,
    updates: {
      handle?: string;
      config?: Record<string, unknown>;
    }
  ): Promise<Connection> {
    let response = await this.axios.patch(
      `/org/${orgHandle}/connection/${connectionHandle}`,
      toSnake(updates)
    );
    return toCamel<Connection>(response.data);
  }

  async deleteOrgConnection(orgHandle: string, connectionHandle: string): Promise<Connection> {
    let response = await this.axios.delete(`/org/${orgHandle}/connection/${connectionHandle}`);
    return toCamel<Connection>(response.data);
  }

  // ---- Organizations ----

  async listOrgs(params?: PaginationParams): Promise<PaginatedResponse<Organization>> {
    let response = await this.axios.get('/org', {
      params: {
        limit: params?.limit,
        next_token: params?.nextToken
      }
    });
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Organization>(item)),
      nextToken: data.next_token
    };
  }

  async getOrg(orgHandle: string): Promise<Organization> {
    let response = await this.axios.get(`/org/${orgHandle}`);
    return toCamel<Organization>(response.data);
  }

  async createOrg(org: { handle: string; displayName?: string }): Promise<Organization> {
    let response = await this.axios.post('/org', toSnake(org));
    return toCamel<Organization>(response.data);
  }

  async updateOrg(
    orgHandle: string,
    updates: { handle?: string; displayName?: string }
  ): Promise<Organization> {
    let response = await this.axios.patch(`/org/${orgHandle}`, toSnake(updates));
    return toCamel<Organization>(response.data);
  }

  async deleteOrg(orgHandle: string): Promise<Organization> {
    let response = await this.axios.delete(`/org/${orgHandle}`);
    return toCamel<Organization>(response.data);
  }

  async listOrgMembers(
    orgHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<OrgMember>> {
    let response = await this.axios.get(`/org/${orgHandle}/member`, {
      params: {
        limit: params?.limit,
        next_token: params?.nextToken
      }
    });
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<OrgMember>(item)),
      nextToken: data.next_token
    };
  }

  async addOrgMember(
    orgHandle: string,
    member: { handle: string; role: string }
  ): Promise<OrgMember> {
    let response = await this.axios.post(`/org/${orgHandle}/member`, toSnake(member));
    return toCamel<OrgMember>(response.data);
  }

  async updateOrgMember(
    orgHandle: string,
    userHandle: string,
    updates: { role: string }
  ): Promise<OrgMember> {
    let response = await this.axios.patch(
      `/org/${orgHandle}/member/${userHandle}`,
      toSnake(updates)
    );
    return toCamel<OrgMember>(response.data);
  }

  async removeOrgMember(orgHandle: string, userHandle: string): Promise<OrgMember> {
    let response = await this.axios.delete(`/org/${orgHandle}/member/${userHandle}`);
    return toCamel<OrgMember>(response.data);
  }

  // ---- Pipelines ----

  async listUserPipelines(
    userHandle: string,
    workspaceHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Pipeline>> {
    let response = await this.axios.get(
      `/user/${userHandle}/workspace/${workspaceHandle}/pipeline`,
      {
        params: {
          limit: params?.limit,
          next_token: params?.nextToken
        }
      }
    );
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Pipeline>(item)),
      nextToken: data.next_token
    };
  }

  async getUserPipeline(
    userHandle: string,
    workspaceHandle: string,
    pipelineId: string
  ): Promise<Pipeline> {
    let response = await this.axios.get(
      `/user/${userHandle}/workspace/${workspaceHandle}/pipeline/${pipelineId}`
    );
    return toCamel<Pipeline>(response.data);
  }

  async runPipelineCommand(
    userHandle: string,
    workspaceHandle: string,
    pipelineId: string,
    command: { command: string; args?: Record<string, unknown> }
  ): Promise<unknown> {
    let response = await this.axios.post(
      `/user/${userHandle}/workspace/${workspaceHandle}/pipeline/${pipelineId}/command`,
      toSnake(command)
    );
    return response.data;
  }

  async listOrgPipelines(
    orgHandle: string,
    workspaceHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Pipeline>> {
    let response = await this.axios.get(
      `/org/${orgHandle}/workspace/${workspaceHandle}/pipeline`,
      {
        params: {
          limit: params?.limit,
          next_token: params?.nextToken
        }
      }
    );
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Pipeline>(item)),
      nextToken: data.next_token
    };
  }

  // ---- Processes ----

  async listUserProcesses(
    userHandle: string,
    workspaceHandle: string,
    params?: PaginationParams & { where?: string }
  ): Promise<PaginatedResponse<Process>> {
    let response = await this.axios.get(
      `/user/${userHandle}/workspace/${workspaceHandle}/process`,
      {
        params: {
          limit: params?.limit,
          next_token: params?.nextToken,
          where: params?.where
        }
      }
    );
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Process>(item)),
      nextToken: data.next_token
    };
  }

  async getUserProcess(
    userHandle: string,
    workspaceHandle: string,
    processId: string
  ): Promise<Process> {
    let response = await this.axios.get(
      `/user/${userHandle}/workspace/${workspaceHandle}/process/${processId}`
    );
    return toCamel<Process>(response.data);
  }

  async listOrgProcesses(
    orgHandle: string,
    workspaceHandle: string,
    params?: PaginationParams & { where?: string }
  ): Promise<PaginatedResponse<Process>> {
    let response = await this.axios.get(
      `/org/${orgHandle}/workspace/${workspaceHandle}/process`,
      {
        params: {
          limit: params?.limit,
          next_token: params?.nextToken,
          where: params?.where
        }
      }
    );
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Process>(item)),
      nextToken: data.next_token
    };
  }

  // ---- Snapshots ----

  async listSnapshots(
    userHandle: string,
    workspaceHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Snapshot>> {
    let response = await this.axios.get(
      `/user/${userHandle}/workspace/${workspaceHandle}/snapshot`,
      {
        params: {
          limit: params?.limit,
          next_token: params?.nextToken
        }
      }
    );
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Snapshot>(item)),
      nextToken: data.next_token
    };
  }

  async getSnapshot(
    userHandle: string,
    workspaceHandle: string,
    snapshotId: string
  ): Promise<Snapshot> {
    let response = await this.axios.get(
      `/user/${userHandle}/workspace/${workspaceHandle}/snapshot/${snapshotId}`
    );
    return toCamel<Snapshot>(response.data);
  }

  async listOrgSnapshots(
    orgHandle: string,
    workspaceHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Snapshot>> {
    let response = await this.axios.get(
      `/org/${orgHandle}/workspace/${workspaceHandle}/snapshot`,
      {
        params: {
          limit: params?.limit,
          next_token: params?.nextToken
        }
      }
    );
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Snapshot>(item)),
      nextToken: data.next_token
    };
  }

  // ---- Datatanks ----

  async listDatatanks(
    userHandle: string,
    workspaceHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Datatank>> {
    let response = await this.axios.get(
      `/user/${userHandle}/workspace/${workspaceHandle}/datatank`,
      {
        params: {
          limit: params?.limit,
          next_token: params?.nextToken
        }
      }
    );
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Datatank>(item)),
      nextToken: data.next_token
    };
  }

  async getDatatank(
    userHandle: string,
    workspaceHandle: string,
    datatankHandle: string
  ): Promise<Datatank> {
    let response = await this.axios.get(
      `/user/${userHandle}/workspace/${workspaceHandle}/datatank/${datatankHandle}`
    );
    return toCamel<Datatank>(response.data);
  }

  async listDatatankTables(
    userHandle: string,
    workspaceHandle: string,
    datatankHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<DatatankTable>> {
    let response = await this.axios.get(
      `/user/${userHandle}/workspace/${workspaceHandle}/datatank/${datatankHandle}/table`,
      {
        params: {
          limit: params?.limit,
          next_token: params?.nextToken
        }
      }
    );
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<DatatankTable>(item)),
      nextToken: data.next_token
    };
  }

  // ---- Actor workspaces (all accessible workspaces) ----

  async listActorWorkspaces(params?: PaginationParams): Promise<PaginatedResponse<Workspace>> {
    let response = await this.axios.get('/actor/workspace', {
      params: {
        limit: params?.limit,
        next_token: params?.nextToken
      }
    });
    let data = response.data;
    return {
      items: (data.items || []).map((item: unknown) => toCamel<Workspace>(item)),
      nextToken: data.next_token
    };
  }
}
