import { createAxios } from 'slates';

export class AsticaVisionClient {
  private http;

  constructor(private token: string) {
    this.http = createAxios({ baseURL: 'https://vision.astica.ai' });
  }

  async analyzeImage(params: {
    imageUrl: string;
    modelVersion?: string;
    visionParams?: string;
    gptPrompt?: string;
    promptLength?: number;
    customObjectKeywords?: string;
  }) {
    let response = await this.http.post('/describe', {
      tkn: this.token,
      modelVersion: params.modelVersion || '2.5_full',
      input: params.imageUrl,
      visionParams: params.visionParams || 'describe,tags,objects',
      gpt_prompt: params.gptPrompt || '',
      prompt_length: params.promptLength || 90,
      objects_custom_kw: params.customObjectKeywords || ''
    });
    return response.data;
  }
}

export class AsticaDesignClient {
  private http;

  constructor(private token: string) {
    this.http = createAxios({ baseURL: 'https://design.astica.ai' });
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
    let response = await this.http.post('/generate_image', {
      tkn: this.token,
      modelVersion: params.modelVersion || '2.0_full',
      prompt: params.prompt,
      prompt_negative: params.negativePrompt || '',
      generate_quality: params.quality || 'standard',
      generate_lossless: params.lossless ?? 0,
      seed: params.seed ?? 0,
      moderate: params.moderate ?? 1,
      low_priority: params.lowPriority ?? 0
    });
    return response.data;
  }
}

export class AsticaVoiceClient {
  private http;

  constructor(private token: string) {
    this.http = createAxios({ baseURL: 'https://voice.astica.ai' });
  }

  async textToSpeech(params: {
    text: string;
    voice?: string;
    timestamps?: boolean;
    prompt?: string;
    lowPriority?: boolean;
  }) {
    let response = await this.http.post('/api/tts', {
      tkn: this.token,
      text: params.text,
      voice: params.voice || 'expressive_ava',
      stream: false,
      timestamps: params.timestamps ?? false,
      prompt: params.prompt || '',
      low_priority: params.lowPriority ?? false
    });
    return response.data;
  }

  async listVoices() {
    let response = await this.http.post('/api/voice_list', {
      tkn: this.token
    });
    return response.data;
  }

  async listVoiceClones() {
    let response = await this.http.post('/api/voice_clone_list', {
      tkn: this.token
    });
    return response.data;
  }
}

export class AsticaListenClient {
  private http;

  constructor(private token: string) {
    this.http = createAxios({ baseURL: 'https://listen.astica.ai' });
  }

  async transcribe(params: {
    audioInput: string;
    modelVersion?: string;
    lowPriority?: number;
  }) {
    let response = await this.http.post('/transcribe', {
      tkn: this.token,
      modelVersion: params.modelVersion || '1.0_full',
      input: params.audioInput,
      doStream: 0,
      low_priority: params.lowPriority ?? 0
    });
    return response.data;
  }
}

export class AsticaNlpClient {
  private http;

  constructor(private token: string) {
    this.http = createAxios({ baseURL: 'https://nlp.astica.ai' });
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
    let response = await this.http.post('/generate', {
      tkn: this.token,
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
    });
    return response.data;
  }
}
