import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  requestAxios
} from 'slates';

class AsticaClient {
  private http;

  constructor(
    private token: string,
    baseURL: string
  ) {
    if (!token.trim()) {
      throw createApiServiceError('An Astica API key is required. Reconnect your account.');
    }
    this.http = createAxios({ baseURL });
  }

  protected async post(path: string, data: Record<string, unknown>, operation: string) {
    let response = await requestAxios(
      operation,
      () => this.http.post(path, { ...data, tkn: this.token }),
      (error, requestOperation) =>
        buildApiServiceError(error, {
          providerLabel: 'Astica',
          reason: 'astica_request_failed',
          operation: requestOperation
        })
    );
    let result = response.data;

    if (!result || typeof result !== 'object') {
      throw createApiServiceError(`Astica returned an invalid response for ${operation}.`);
    }

    if (
      isApiErrorRecord(result) &&
      (['error', 'failed', 'failure'].includes(String(result.status).toLowerCase()) ||
        (typeof result.error === 'string' && result.error.trim()) ||
        (isApiErrorRecord(result.error) && Object.keys(result.error).length > 0))
    ) {
      throw buildApiServiceError(
        { response: { status: response.status, data: result } },
        {
          providerLabel: 'Astica',
          reason: 'astica_request_failed',
          operation,
          fallbackMessage: 'The provider reported a failed request.',
          extractUpstreamCode: () =>
            typeof result.error === 'string' ? result.error : undefined
        }
      );
    }

    return result;
  }
}

export class AsticaVisionClient extends AsticaClient {
  constructor(token: string) {
    super(token, 'https://vision.astica.ai');
  }

  async analyzeImage(params: {
    imageUrl: string;
    modelVersion?: string;
    visionParams?: string;
    gptPrompt?: string;
    promptLength?: number;
    customObjectKeywords?: string;
  }) {
    return this.post(
      '/describe',
      {
        modelVersion: params.modelVersion || '2.5_full',
        input: params.imageUrl,
        visionParams: params.visionParams || 'describe,tags,objects',
        gpt_prompt: params.gptPrompt || '',
        prompt_length:
          params.promptLength ??
          (params.visionParams?.split(',').includes('gpt_detailed') ? 125 : 90),
        objects_custom_kw: params.customObjectKeywords || ''
      },
      'image analysis'
    );
  }
}

export class AsticaDesignClient extends AsticaClient {
  constructor(token: string) {
    super(token, 'https://design.astica.ai');
  }

  async generateImage(params: {
    prompt: string;
    negativePrompt?: string;
    modelVersion?: string;
    quality?: string;
    lossless?: number;
    seed?: number;
    moderate?: number;
    lowPriority?: number;
  }) {
    return this.post(
      '/generate_image',
      {
        modelVersion: params.modelVersion || '2.0_full',
        prompt: params.prompt,
        prompt_negative: params.negativePrompt || '',
        generate_quality: params.quality || 'standard',
        generate_lossless: params.lossless ?? 0,
        seed: params.seed ?? 0,
        moderate: params.moderate ?? 1,
        low_priority: params.lowPriority ?? 0
      },
      'image generation'
    );
  }
}

export class AsticaVoiceClient extends AsticaClient {
  constructor(token: string) {
    super(token, 'https://voice.astica.ai');
  }

  async textToSpeech(params: {
    text: string;
    voice?: string;
    timestamps?: boolean;
    prompt?: string;
    lowPriority?: boolean;
  }) {
    return this.post(
      '/api/tts',
      {
        text: params.text,
        voice: params.voice || 'expressive_ava',
        stream: false,
        timestamps: params.timestamps ?? false,
        prompt: params.prompt || '',
        low_priority: params.lowPriority ?? false
      },
      'speech synthesis'
    );
  }

  async listVoices() {
    return this.post('/api/voice_list', {}, 'voice listing');
  }

  async listVoiceClones() {
    return this.post('/api/voice_clone_list', {}, 'voice clone listing');
  }

  async getSpeechTask(taskId: string) {
    return this.post('/api/tts/task', { task_id: taskId }, 'speech task retrieval');
  }
}

export class AsticaListenClient extends AsticaClient {
  constructor(token: string) {
    super(token, 'https://listen.astica.ai');
  }

  async transcribe(params: {
    audioInput: string;
    modelVersion?: string;
    lowPriority?: number;
  }) {
    return this.post(
      '/transcribe',
      {
        modelVersion: params.modelVersion || '1.0_full',
        input: params.audioInput,
        doStream: 0,
        low_priority: params.lowPriority ?? 0
      },
      'audio transcription'
    );
  }
}

export class AsticaNlpClient extends AsticaClient {
  constructor(token: string) {
    super(token, 'https://nlp.astica.ai');
  }

  async generate(params: {
    input: string;
    instruction?: string;
    modelVersion?: string;
    temperature?: number;
    topP?: number;
    tokenLimit?: number;
    stopSequence?: string;
    thinkPass?: number;
    lowPriority?: number;
  }) {
    return this.post(
      '/generate',
      {
        modelVersion: params.modelVersion || 'GPT-S2',
        instruction: params.instruction || '',
        input: params.input,
        think_pass: params.thinkPass ?? 1,
        temperature: params.temperature ?? 0.7,
        top_p: params.topP ?? 0.35,
        token_limit: params.tokenLimit ?? 256,
        stop_sequence: params.stopSequence || '',
        stream_output: 0,
        low_priority: params.lowPriority ?? 0
      },
      'text generation'
    );
  }
}
