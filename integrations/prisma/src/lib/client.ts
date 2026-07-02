import { createAxios } from 'slates';

export interface Workspace {
  id: string;
  displayName?: string;
  name?: string;
  createdAt?: string;
  slug?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt?: string;
  databases?: Database[];
}

export interface DatabaseEndpoints {
  direct?: { host?: string; port?: number };
  pooled?: { host?: string; port?: number };
  accelerate?: { host?: string; port?: number };
}

export interface DatabaseConnection {
  id: string;
  connectionString?: string;
  endpoints?: DatabaseEndpoints;
  directConnection?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
  };
}

export interface DatabaseApiKey {
  id: string;
  apiKey?: string;
  connectionString?: string;
  ppgDirectConnection?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
  };
}

export interface Database {
  id: string;
  name: string;
  region?: string;
  status?: string;
  createdAt?: string;
  isDefault?: boolean;
  connectionString?: string;
  defaultConnectionId?: string;
  connections?: DatabaseConnection[];
  apiKeys?: DatabaseApiKey[];
  project?: { id: string; name?: string };
}

export interface DatabaseBackup {
  id: string;
  createdAt?: string;
  status?: string;
  size?: number;
  databaseId?: string;
}

export interface DatabaseUsage {
  databaseId?: string;
  period?: string;
  queries?: number;
  storage?: number;
  egress?: number;
  [key: string]: unknown;
}

export interface CreateProjectParams {
  name: string;
  region?: string;
}

export interface CreateDatabaseParams {
  name: string;
  region: string;
  isDefault?: boolean;
}

export interface CreateConnectionParams {
  databaseId: string;
}

export interface TransferProjectParams {
  projectId: string;
  recipientAccessToken: string;
}

export class PrismaClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.prisma.io/v1',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Workspaces ──

  async listWorkspaces(): Promise<Workspace[]> {
    let response = await this.http.get('/workspaces');
    return response.data ?? [];
  }

  // ── Projects ──

  async createProject(params: CreateProjectParams): Promise<Project> {
    let response = await this.http.post('/projects', {
      name: params.name,
      region: params.region
    });
    return response.data;
  }

  async createProjectInWorkspace(
    workspaceId: string,
    params: CreateProjectParams
  ): Promise<Project> {
    let response = await this.http.post(`/workspaces/${workspaceId}/projects`, {
      name: params.name
    });
    return response.data;
  }

  async getProject(projectId: string): Promise<Project> {
    let response = await this.http.get(`/projects/${projectId}`);
    return response.data;
  }

  async transferProject(params: TransferProjectParams): Promise<unknown> {
    let response = await this.http.post(`/projects/${params.projectId}/transfer`, {
      recipientAccessToken: params.recipientAccessToken
    });
    return response.data;
  }

  // ── Databases ──

  async listDatabases(): Promise<Database[]> {
    let response = await this.http.get('/databases');
    return response.data ?? [];
  }

  async getDatabase(databaseId: string): Promise<Database> {
    let response = await this.http.get(`/databases/${databaseId}`);
    return response.data;
  }

  async createDatabase(projectId: string, params: CreateDatabaseParams): Promise<Database> {
    let response = await this.http.post(`/projects/${projectId}/databases`, {
      name: params.name,
      region: params.region,
      isDefault: params.isDefault
    });
    return response.data;
  }

  async deleteDatabase(databaseId: string): Promise<void> {
    await this.http.delete(`/databases/${databaseId}`);
  }

  // ── Connections ──

  async listConnections(databaseId: string): Promise<DatabaseConnection[]> {
    let response = await this.http.get(`/databases/${databaseId}/connections`);
    return response.data ?? [];
  }

  async createConnection(databaseId: string): Promise<DatabaseConnection> {
    let response = await this.http.post(`/databases/${databaseId}/connections`);
    return response.data;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.http.delete(`/connections/${connectionId}`);
  }

  // ── Backups ──

  async listBackups(databaseId: string): Promise<DatabaseBackup[]> {
    let response = await this.http.get(`/databases/${databaseId}/backups`);
    return response.data ?? [];
  }

  // ── Usage ──

  async getDatabaseUsage(databaseId: string): Promise<DatabaseUsage> {
    let response = await this.http.get(`/databases/${databaseId}/usage`);
    return response.data;
  }
}
