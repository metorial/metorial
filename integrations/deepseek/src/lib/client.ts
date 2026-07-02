import { createAxios, pickDefined } from 'slates';
import { deepSeekApiError } from './errors';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  FimCompletionRequest,
  FimCompletionResponse,
  GetBalanceResponse,
  ListModelsResponse
} from './types';

export class DeepSeekClient {
  private axios;

  constructor(private params: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: params.baseUrl,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private createBetaAxios() {
    return createAxios({
      baseURL: 'https://api.deepseek.com/beta',
      headers: {
        Authorization: `Bearer ${this.params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createChatCompletion(
    request: ChatCompletionRequest,
    options?: { beta?: boolean }
  ): Promise<ChatCompletionResponse> {
    let body: Record<string, unknown> = pickDefined({
      model: request.model,
      messages: request.messages,
      stream: false,
      temperature: request.temperature,
      top_p: request.top_p,
      max_tokens: request.max_tokens,
      stop: request.stop,
      response_format: request.response_format,
      tools: request.tools,
      tool_choice: request.tool_choice,
      thinking: request.thinking,
      reasoning_effort: request.reasoning_effort,
      logprobs: request.logprobs,
      top_logprobs: request.top_logprobs,
      user_id: request.user_id
    });

    try {
      let axios = options?.beta ? this.createBetaAxios() : this.axios;
      let response = await axios.post('/chat/completions', body);
      return response.data as ChatCompletionResponse;
    } catch (error) {
      throw deepSeekApiError(error, 'create chat completion');
    }
  }

  async createFimCompletion(request: FimCompletionRequest): Promise<FimCompletionResponse> {
    let body: Record<string, unknown> = pickDefined({
      model: request.model,
      prompt: request.prompt,
      stream: false,
      suffix: request.suffix,
      echo: request.echo,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      stop: request.stop,
      logprobs: request.logprobs
    });

    try {
      let response = await this.createBetaAxios().post('/completions', body);
      return response.data as FimCompletionResponse;
    } catch (error) {
      throw deepSeekApiError(error, 'create FIM completion');
    }
  }

  async listModels(): Promise<ListModelsResponse> {
    try {
      let response = await this.axios.get('/models');
      return response.data as ListModelsResponse;
    } catch (error) {
      throw deepSeekApiError(error, 'list models');
    }
  }

  async getBalance(): Promise<GetBalanceResponse> {
    try {
      let response = await this.axios.get('/user/balance');
      return response.data as GetBalanceResponse;
    } catch (error) {
      throw deepSeekApiError(error, 'get user balance');
    }
  }
}
