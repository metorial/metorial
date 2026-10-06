import { createCursorAxios } from './http';

export class CloudAgentsClient {
  private axios: ReturnType<typeof createCursorAxios>;

  constructor(config: { token: string }) {
    this.axios = createCursorAxios(config.token);
  }

  async getApiKeyInfo(): Promise<{
    apiKeyName: string;
    createdAt: string;
    userEmail: string;
  }> {
    let response = await this.axios.get('/v0/me');
    return response.data;
  }

  async listAgents(params?: { limit?: number; cursor?: string; prUrl?: string }): Promise<{
    agents: Agent[];
    nextCursor?: string;
  }> {
    let response = await this.axios.get('/v0/agents', {
      params
    });
    return response.data;
  }

  async getAgent(agentId: string): Promise<Agent> {
    let response = await this.axios.get(`/v0/agents/${encodeURIComponent(agentId)}`);
    return response.data;
  }

  async launchAgent(body: LaunchAgentInput): Promise<Agent> {
    let response = await this.axios.post('/v0/agents', body);
    return response.data;
  }

  async addFollowUp(agentId: string, prompt: PromptInput): Promise<{ id: string }> {
    let response = await this.axios.post(
      `/v0/agents/${encodeURIComponent(agentId)}/followup`,
      { prompt }
    );
    return response.data;
  }

  async stopAgent(agentId: string): Promise<{ id: string }> {
    let response = await this.axios.post(`/v0/agents/${encodeURIComponent(agentId)}/stop`, {});
    return response.data;
  }

  async deleteAgent(agentId: string): Promise<{ id: string }> {
    let response = await this.axios.delete(`/v0/agents/${encodeURIComponent(agentId)}`);
    return response.data;
  }

  async getConversation(agentId: string): Promise<{
    id: string;
    messages: ConversationMessage[];
  }> {
    let response = await this.axios.get(
      `/v0/agents/${encodeURIComponent(agentId)}/conversation`
    );
    return response.data;
  }

  async listArtifacts(agentId: string): Promise<{
    artifacts: Artifact[];
  }> {
    let response = await this.axios.get(`/v0/agents/${encodeURIComponent(agentId)}/artifacts`);
    return response.data;
  }

  async downloadArtifact(
    agentId: string,
    path: string
  ): Promise<{
    url: string;
    expiresAt: string;
  }> {
    let response = await this.axios.get(
      `/v0/agents/${encodeURIComponent(agentId)}/artifacts/download`,
      {
        params: { path }
      }
    );
    return response.data;
  }

  async listModels(): Promise<{ models: string[] }> {
    let response = await this.axios.get('/v0/models');
    return response.data;
  }

  async listRepositories(): Promise<{
    repositories: Repository[];
  }> {
    let response = await this.axios.get('/v0/repositories');
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
