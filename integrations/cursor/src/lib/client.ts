import { createAxios } from 'slates';

let BASE_URL = 'https://api.cursor.com';

export class CloudAgentsClient {
  private authHeader: string;

  constructor(config: { token: string }) {
    this.authHeader = `Basic ${Buffer.from(`${config.token}:`).toString('base64')}`;
  }

  private get axios() {
    return createAxios({ baseURL: BASE_URL });
  }

  private get headers() {
    return { Authorization: this.authHeader };
  }

  async getApiKeyInfo(): Promise<{
    apiKeyName: string;
    createdAt: string;
    userEmail: string;
  }> {
    let response = await this.axios.get('/v0/me', { headers: this.headers });
    return response.data;
  }

  async listAgents(params?: { limit?: number; cursor?: string; prUrl?: string }): Promise<{
    agents: Agent[];
    nextCursor?: string;
  }> {
    let response = await this.axios.get('/v0/agents', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getAgent(agentId: string): Promise<Agent> {
    let response = await this.axios.get(`/v0/agents/${agentId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async launchAgent(body: LaunchAgentInput): Promise<Agent> {
    let response = await this.axios.post('/v0/agents', body, {
      headers: this.headers
    });
    return response.data;
  }

  async addFollowUp(agentId: string, prompt: PromptInput): Promise<{ id: string }> {
    let response = await this.axios.post(
      `/v0/agents/${agentId}/followup`,
      { prompt },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async stopAgent(agentId: string): Promise<{ id: string }> {
    let response = await this.axios.post(
      `/v0/agents/${agentId}/stop`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteAgent(agentId: string): Promise<{ id: string }> {
    let response = await this.axios.delete(`/v0/agents/${agentId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getConversation(agentId: string): Promise<{
    id: string;
    messages: ConversationMessage[];
  }> {
    let response = await this.axios.get(`/v0/agents/${agentId}/conversation`, {
      headers: this.headers
    });
    return response.data;
  }

  async listArtifacts(agentId: string): Promise<{
    artifacts: Artifact[];
  }> {
    let response = await this.axios.get(`/v0/agents/${agentId}/artifacts`, {
      headers: this.headers
    });
    return response.data;
  }

  async downloadArtifact(
    agentId: string,
    path: string
  ): Promise<{
    url: string;
    expiresAt: string;
  }> {
    let response = await this.axios.get(`/v0/agents/${agentId}/artifacts/download`, {
      headers: this.headers,
      params: { path }
    });
    return response.data;
  }

  async listModels(): Promise<{ models: string[] }> {
    let response = await this.axios.get('/v0/models', {
      headers: this.headers
    });
    return response.data;
  }

  async listRepositories(): Promise<{
    repositories: Repository[];
  }> {
    let response = await this.axios.get('/v0/repositories', {
      headers: this.headers
    });
    return response.data;
  }
}

export interface PromptInput {
  text: string;
  images?: {
    data: string;
    dimension: {
      width: number;
      height: number;
    };
  }[];
}

export interface LaunchAgentInput {
  prompt: PromptInput;
  model?: string;
  source: {
    repository?: string;
    ref?: string;
    prUrl?: string;
  };
  target?: {
    autoCreatePr?: boolean;
    openAsCursorGithubApp?: boolean;
    skipReviewerRequest?: boolean;
    branchName?: string;
    autoBranch?: boolean;
  };
  webhook?: {
    url: string;
    secret?: string;
  };
}

export interface Agent {
  id: string;
  name: string;
  status: string;
  source: {
    repository: string;
    ref?: string;
  };
  target?: {
    branchName?: string;
    url?: string;
    prUrl?: string;
    autoCreatePr?: boolean;
    openAsCursorGithubApp?: boolean;
    skipReviewerRequest?: boolean;
  };
  summary?: string;
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  type: string;
  text: string;
}

export interface Artifact {
  absolutePath: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface Repository {
  owner: string;
  name: string;
  repository: string;
}
