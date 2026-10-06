import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined,
  requestAxiosData
} from 'slates';
import { z } from 'zod';
import { modelDetailSchema, modelSchema } from './schemas';

export interface TextCortexOutput {
  text: string;
  index: number;
}

export interface TextCortexResponse {
  data: {
    outputs: TextCortexOutput[];
    remaining_credits?: number;
  };
  balanceWarning?: string;
  completionId: string;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

interface GenerationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  n?: number;
  sourceLang?: string;
  targetLang?: string;
}
export interface GenerateTextParams extends GenerationOptions {
  prompt: string;
}
export interface GenerateBlogParams extends GenerationOptions {
  title: string;
  keywords?: string[];
  blogCategories?: string[];
}
export interface GenerateProductDescriptionParams extends GenerationOptions {
  productName: string;
  productCategory?: string;
  brand?: string;
  productFeatures?: string[];
}
export interface GenerateAdParams extends GenerationOptions {
  productName: string;
  targetAudience?: string;
}
export interface GenerateEmailParams extends GenerationOptions {
  subject: string;
  targetAudience?: string;
}
export interface GenerateSocialMediaPostParams extends GenerationOptions {
  context: string;
  keywords?: string[];
  platform?: string;
  targetAudience?: string;
}
export interface RewriteTextParams extends GenerationOptions {
  text: string;
  mode?: string;
}
export interface SummarizeTextParams extends GenerationOptions {
  text?: string;
  fileId?: string;
  mode?: string;
}
export interface TranslateTextParams extends GenerationOptions {
  text: string;
  targetLang: string;
}
export interface GenerateCodeParams extends GenerationOptions {
  prompt: string;
  programmingLanguage?: string;
}

const apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    parent: {},
    providerLabel: 'TextCortex',
    operation,
    reason: 'textcortex_api_error',
    nestedKeys: ['error', 'errors']
  });

const balanceSchema = z.object({
  object: z.literal('balance'),
  remaining_credits: z.number(),
  currency: z.string()
});
const modelsSchema = z.object({ object: z.literal('list'), data: z.array(modelSchema) });
const completionSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z
    .array(
      z.object({
        index: z.number().int().optional(),
        message: z.object({
          content: z.union([
            z.string(),
            z.array(z.object({ type: z.string(), text: z.string().optional() })),
            z.null()
          ])
        })
      })
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional()
    })
    .optional()
});

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError(
        'A TextCortex API key is required. Reconnect with a valid key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.textcortex.com/v1',
      authHeader: { value: `Bearer ${config.token.trim()}` },
      timeout: 180_000
    });
  }

  private parse<T>(schema: z.ZodType<T>, data: unknown, operation: string): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw createApiServiceError(`TextCortex returned an invalid ${operation} response.`, {
        reason: 'textcortex_invalid_response'
      });
    }
    return result.data;
  }

  async listModels() {
    const data = await requestAxiosData(
      'list models',
      () => this.axios.get<unknown>('/models'),
      apiError
    );
    return this.parse(modelsSchema, data, 'model catalog').data;
  }

  async getModel(model: string) {
    const data = await requestAxiosData(
      'retrieve model',
      () => this.axios.get<unknown>(`/models/${encodeURIComponent(model)}`),
      apiError
    );
    return this.parse(modelDetailSchema, data, 'model');
  }

  async getBalance(timeoutMs?: number) {
    const data = await requestAxiosData(
      'retrieve balance',
      () => this.axios.get<unknown>('/balance', pickDefined({ timeout: timeoutMs })),
      apiError
    );
    return this.parse(balanceSchema, data, 'balance');
  }

  private async complete(
    instruction: string,
    content: Record<string, unknown>,
    params: GenerationOptions,
    defaultMaxTokens = 512
  ): Promise<TextCortexResponse> {
    let model = params.model;
    if (!model) {
      const models = await this.listModels();
      // Prefer a modest general-purpose model when available; never invent a catalog ID.
      model = models.find(item => item.id === 'gpt-4o-mini')?.id ?? models[0]?.id;
      if (!model) {
        throw createApiServiceError('TextCortex did not return any available models.');
      }
    }
    const languages = [
      params.sourceLang && params.sourceLang !== 'auto'
        ? `The input language is ${params.sourceLang}.`
        : '',
      params.targetLang && params.targetLang !== 'auto'
        ? `Write the output in language ${params.targetLang}.`
        : 'Use the language of the input unless the task requests another language.'
    ].filter(Boolean);
    const data = await requestAxiosData(
      'generate text',
      () =>
        this.axios.post<unknown>('/chat/completions', {
          model,
          messages: [
            { role: 'system', content: [instruction, ...languages].join(' ') },
            { role: 'user', content: JSON.stringify(pickDefined(content)) }
          ],
          max_tokens: params.maxTokens ?? defaultMaxTokens,
          n: params.n ?? 1,
          ...pickDefined({ temperature: params.temperature }),
          stream: false
        }),
      apiError
    );
    const result = this.parse(completionSchema, data, 'chat completion');
    const outputs = result.choices.map((choice, index) => {
      const content = choice.message.content;
      const text =
        typeof content === 'string'
          ? content
          : (content ?? [])
              .filter(part => part.type === 'text')
              .map(part => part.text ?? '')
              .join('');
      if (!text.trim()) {
        throw createApiServiceError(
          'TextCortex completed the request without returning text.',
          {
            reason: 'textcortex_empty_completion'
          }
        );
      }
      return { text, index: choice.index ?? index };
    });
    let remainingCredits: number | undefined;
    let balanceWarning: string | undefined;
    try {
      // Keep optional metadata from delaying delivery of an already billed completion.
      remainingCredits = (await this.getBalance(10_000)).remaining_credits;
    } catch {
      // A failed metadata read must not discard an already billed completion.
      balanceWarning =
        'Text was generated, but the credit balance could not be retrieved. Call get_balance to check remaining credits.';
    }
    return {
      data: { outputs, remaining_credits: remainingCredits },
      balanceWarning,
      completionId: result.id,
      model: result.model,
      usage: result.usage
        ? pickDefined({
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens
          })
        : undefined
    };
  }

  generateText(params: GenerateTextParams) {
    return this.complete(
      'Generate text following the supplied prompt.',
      { prompt: params.prompt },
      params
    );
  }

  generateBlog(params: GenerateBlogParams) {
    return this.complete(
      'Write a blog article using the supplied title, keywords, and categories.',
      { title: params.title, keywords: params.keywords, categories: params.blogCategories },
      params,
      2048
    );
  }

  generateProductDescription(params: GenerateProductDescriptionParams) {
    return this.complete(
      'Write a product description using only the provided product facts.',
      {
        product: params.productName,
        category: params.productCategory,
        brand: params.brand,
        features: params.productFeatures
      },
      params
    );
  }

  generateAd(params: GenerateAdParams) {
    return this.complete(
      'Write advertising copy for the supplied product and target audience.',
      { product: params.productName, audience: params.targetAudience },
      params
    );
  }

  generateEmail(params: GenerateEmailParams) {
    return this.complete(
      'Write an email body for the supplied subject and target audience.',
      { subject: params.subject, audience: params.targetAudience },
      params,
      1024
    );
  }

  generateSocialMediaPost(params: GenerateSocialMediaPostParams) {
    return this.complete(
      'Write a social media post suitable for the supplied platform, topic, keywords, and audience.',
      {
        topic: params.context,
        keywords: params.keywords,
        platform: params.platform ?? 'twitter',
        audience: params.targetAudience
      },
      params
    );
  }

  rewriteText(params: RewriteTextParams) {
    return this.complete(
      'Rewrite the supplied text while preserving its meaning. Follow the requested rewriting mode.',
      { text: params.text, mode: params.mode ?? 'default' },
      params
    );
  }

  summarizeText(params: SummarizeTextParams) {
    if (params.text && params.fileId) {
      throw createApiServiceError('Provide text only; do not combine text and fileId.');
    }
    if (params.fileId) {
      throw createApiServiceError(
        'The current TextCortex API cannot retrieve files by ID. Provide the file contents in text instead.'
      );
    }
    if (!params.text?.trim()) {
      throw createApiServiceError('Provide nonempty text to summarize.');
    }
    if (params.mode === 'embeddings') {
      throw createApiServiceError(
        'The current TextCortex API does not support embeddings summarization. Use mode "default".'
      );
    }
    return this.complete(
      'Summarize the supplied text concisely.',
      { text: params.text },
      params
    );
  }

  translateText(params: TranslateTextParams) {
    return this.complete(
      'Translate the supplied text into the requested target language. Return only the translation.',
      { text: params.text },
      params
    );
  }

  generateCode(params: GenerateCodeParams) {
    return this.complete(
      'Generate code following the supplied instructions and programming language. Do not execute the code.',
      { prompt: params.prompt, programmingLanguage: params.programmingLanguage },
      params,
      1024
    );
  }
}
