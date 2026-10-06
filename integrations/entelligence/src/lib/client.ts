import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';

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
}

export interface ChatQueryResponse {
  answer: string;
  references: string[];
}

export class Client {
  private token: string;
  private vectorDBUrl: string;
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; repoName: string; organization: string }) {
    if (!config.token.trim()) throw createApiServiceError('Provide an Entelligence API key.');
    if (
      !config.organization.trim() ||
      !config.repoName.trim() ||
      config.organization.includes('&') ||
      config.repoName.includes('&')
    )
      throw createApiServiceError(
        'Provide the repository and organization names used by your Entelligence chat widget, without an ampersand.'
      );
    this.token = config.token;
    // The provider-published chat widget identifies repositories as organization&repository.
    this.vectorDBUrl = `${config.organization.trim()}&${config.repoName.trim()}`;
    this.http = createAxios({
      baseURL: 'https://entelligence.ddbrief.com',
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    });
  }

  private async post(
    url: string,
    data: Record<string, unknown>,
    text = false,
    bearer = false
  ): Promise<unknown> {
    try {
      return (
        await this.http.post(url, data, {
          ...(bearer ? { headers: { Authorization: `Bearer ${this.token}` } } : {}),
          ...(text
            ? { responseType: 'text', transformResponse: [(value: unknown) => value] }
            : {})
        })
      ).data;
    } catch (error) {
      throw buildApiServiceError(error, {
        parent: {},
        providerLabel: 'Entelligence',
        reason: 'entelligence_api_request_failed',
        operation: `POST ${url}`
      });
    }
  }

  async chatQuery(params: ChatQueryParams): Promise<ChatQueryResponse> {
    const response = await this.post(
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
      true,
      true
    );
    if (typeof response !== 'string' || !response.trim())
      throw createApiServiceError('Entelligence returned an empty or invalid chat response.');

    const markers = [/(^|\n)references\s*:/i, /(^|\n)sources\s*:/i, /<code-reference\b/i];
    const cutoffs = markers.map(marker => response.search(marker)).filter(index => index >= 0);
    const cutoff = cutoffs.length ? Math.min(...cutoffs) : response.length;
    const answer = response.slice(0, cutoff).trim();
    if (!answer)
      throw createApiServiceError(
        'Entelligence returned source references without an answer.'
      );
    const references = [
      ...new Set(
        (response.slice(cutoff).match(/https?:\/\/[^\s"'<>()[\]]+/g) ?? []).map(url =>
          url.replace(/[.,;:]+$/, '')
        )
      )
    ];
    return { answer, references };
  }

  async checkQueryPermission(): Promise<{ allowed: boolean }> {
    const response = await this.post('/bot/allow-query', {
      ApiKey: this.token,
      VectorDBURL: this.vectorDBUrl
    });
    const parsed = z.object({ allowed: z.boolean() }).safeParse(response);
    if (!parsed.success)
      throw createApiServiceError(
        'Entelligence returned an invalid query-permission response.'
      );
    return parsed.data;
  }

  async sendSlackQuery(params: {
    question: string;
    history?: ChatMessage[];
    userEmail?: string;
  }): Promise<ChatQueryResponse & { submitted: boolean }> {
    const history: { question: string; answer: string }[] = [];
    for (const message of params.history ?? []) {
      if (message.role === 'user') {
        history.push({ question: message.content, answer: '' });
      } else {
        const pair = history.at(-1);
        if (pair) pair.answer += `${pair.answer ? '\n' : ''}${message.content}`;
        else history.push({ question: '', answer: message.content });
      }
    }
    const response = await this.post(
      '/bot/send-query',
      {
        ApiKey: this.token,
        VectorDBURL: this.vectorDBUrl,
        ChatHist: JSON.stringify(history),
        Question: params.question,
        UserEmail: params.userEmail ?? ''
      },
      true
    );
    if (typeof response !== 'string')
      throw createApiServiceError('Entelligence returned an invalid submission response.');
    // The widget treats HTTP success as acceptance; it does not receive an AI answer.
    return { answer: response, references: [], submitted: true };
  }
}
