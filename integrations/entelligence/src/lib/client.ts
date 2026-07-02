import { createAxios } from 'slates';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatQueryParams {
  question: string;
  history?: ChatMessage[];
  enableArtifacts?: boolean;
  advancedAgent?: boolean;
  enableDocs?: boolean;
  limitSources?: number;
  agentMode?: 'code' | 'agent' | 'multistep';
}

export interface ChatQueryResponse {
  answer: string;
  references: string[];
}

export interface AllowQueryResponse {
  allowed: boolean;
}

export class Client {
  private token: string;
  private repoName: string;
  private organization: string;
  private vectorDBUrl: string;
  private http;

  constructor(config: { token: string; repoName: string; organization: string }) {
    this.token = config.token;
    this.repoName = config.repoName;
    this.organization = config.organization;
    this.vectorDBUrl = `https://entelligence.ai/${config.organization}/${config.repoName}`;
    this.http = createAxios({
      baseURL: 'https://entelligence.ddbrief.com',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async chatQuery(params: ChatQueryParams): Promise<ChatQueryResponse> {
    let response = await this.http.post(
      '/repositoryAgent/',
      {
        question: params.question,
        history: params.history ?? [],
        vectorDBUrl: this.vectorDBUrl,
        enableArtifacts: params.enableArtifacts ?? false,
        advancedAgent: params.advancedAgent ?? false,
        enableDocs: params.enableDocs ?? true,
        limitSources: params.limitSources ?? 5
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      }
    );

    let rawText =
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

    let answer = rawText;
    let references: string[] = [];

    let refIndex = rawText.toLowerCase().indexOf('references:');
    if (refIndex === -1) {
      refIndex = rawText.toLowerCase().indexOf('sources:');
    }

    if (refIndex !== -1) {
      answer = rawText.substring(0, refIndex).trim();
      let refsText = rawText.substring(refIndex);
      let refMatches = refsText.match(/https?:\/\/[^\s)>\]]+/g);
      if (refMatches) {
        references = refMatches;
      }
    }

    return {
      answer,
      references
    };
  }

  async checkQueryPermission(): Promise<AllowQueryResponse> {
    let response = await this.http.post('/bot/allow-query', {
      ApiKey: this.token,
      VectorDBURL: this.vectorDBUrl
    });

    return {
      allowed: response.data?.allowed ?? false
    };
  }

  async sendSlackQuery(params: {
    question: string;
    history?: ChatMessage[];
    userEmail?: string;
  }): Promise<ChatQueryResponse> {
    let response = await this.http.post('/bot/send-query', {
      ApiKey: this.token,
      VectorDBURL: this.vectorDBUrl,
      ChatHist: params.history ?? [],
      Question: params.question,
      UserEmail: params.userEmail ?? ''
    });

    let rawText =
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

    return {
      answer: rawText,
      references: []
    };
  }
}
