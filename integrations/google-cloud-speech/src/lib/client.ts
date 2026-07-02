import { createAxios } from 'slates';

export interface SpeechClientConfig {
  token: string;
  projectId: string;
  region: string;
}

export class SpeechToTextClient {
  private http: ReturnType<typeof createAxios>;
  private projectId: string;
  private region: string;

  constructor(config: SpeechClientConfig) {
    this.projectId = config.projectId;
    this.region = config.region;
    this.http = createAxios({
      baseURL: 'https://speech.googleapis.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private recognizerBase(region: string) {
    return `/v2/projects/${this.projectId}/locations/${region}`;
  }

  private shouldRetryInGlobal(error: unknown) {
    let message = error instanceof Error ? error.message : String(error);
    return (
      this.region !== 'global' && message.includes('Expected resource location to be global')
    );
  }

  private async withLocationFallback<T>(request: (region: string) => Promise<T>): Promise<T> {
    try {
      return await request(this.region);
    } catch (error) {
      if (!this.shouldRetryInGlobal(error)) {
        throw error;
      }

      return await request('global');
    }
  }

  async recognize(params: {
    recognizerId?: string;
    model?: string;
    languageCodes?: string[];
    audioContent?: string;
    audioUri?: string;
    enableAutomaticPunctuation?: boolean;
    enableWordTimeOffsets?: boolean;
    enableWordConfidence?: boolean;
    enableSpokenPunctuation?: boolean;
    minSpeakerCount?: number;
    maxSpeakerCount?: number;
    speechContextPhrases?: string[];
    phraseBoost?: number;
    sampleRateHertz?: number;
    audioChannelCount?: number;
    encoding?: string;
  }): Promise<RecognizeResponse> {
    let recognizerId = params.recognizerId || '_';
    return await this.withLocationFallback(async region => {
      let url = `${this.recognizerBase(region)}/recognizers/${recognizerId}:recognize`;

      let features: Record<string, unknown> = {};
      if (params.enableAutomaticPunctuation !== undefined) {
        features.enableAutomaticPunctuation = params.enableAutomaticPunctuation;
      }
      if (params.enableWordTimeOffsets !== undefined) {
        features.enableWordTimeOffsets = params.enableWordTimeOffsets;
      }
      if (params.enableWordConfidence !== undefined) {
        features.enableWordConfidence = params.enableWordConfidence;
      }
      if (params.enableSpokenPunctuation !== undefined) {
        features.enableSpokenPunctuation = params.enableSpokenPunctuation;
      }
      if (params.minSpeakerCount !== undefined || params.maxSpeakerCount !== undefined) {
        features.diarizationConfig = {
          minSpeakerCount: params.minSpeakerCount,
          maxSpeakerCount: params.maxSpeakerCount
        };
      }

      let adaptation: Record<string, unknown> | undefined;
      if (params.speechContextPhrases && params.speechContextPhrases.length > 0) {
        adaptation = {
          phraseSets: [
            {
              inlinePhraseSet: {
                phrases: params.speechContextPhrases.map(phrase => ({
                  value: phrase,
                  boost: params.phraseBoost ?? 10
                }))
              }
            }
          ]
        };
      }

      let configObj: Record<string, unknown> = {};
      if (params.model) configObj.model = params.model;
      if (params.languageCodes && params.languageCodes.length > 0) {
        configObj.languageCodes = params.languageCodes;
      }
      if (Object.keys(features).length > 0) configObj.features = features;
      if (adaptation) configObj.adaptation = adaptation;

      if (params.encoding && params.sampleRateHertz) {
        configObj.explicitDecodingConfig = {
          encoding: params.encoding,
          sampleRateHertz: params.sampleRateHertz,
          audioChannelCount: params.audioChannelCount ?? 1
        };
      } else {
        configObj.autoDecodingConfig = {};
      }

      let body: Record<string, unknown> = {};
      if (Object.keys(configObj).length > 0) body.config = configObj;
      if (params.audioContent) body.content = params.audioContent;
      if (params.audioUri) body.uri = params.audioUri;

      let response = await this.http.post(url, body);
      return response.data as RecognizeResponse;
    });
  }

  async batchRecognize(params: {
    recognizerId?: string;
    model?: string;
    languageCodes?: string[];
    fileUris: string[];
    outputUri?: string;
    enableAutomaticPunctuation?: boolean;
    enableWordTimeOffsets?: boolean;
    enableWordConfidence?: boolean;
    minSpeakerCount?: number;
    maxSpeakerCount?: number;
  }): Promise<OperationResponse> {
    let recognizerId = params.recognizerId || '_';
    return await this.withLocationFallback(async region => {
      let url = `${this.recognizerBase(region)}/recognizers/${recognizerId}:batchRecognize`;

      let features: Record<string, unknown> = {};
      if (params.enableAutomaticPunctuation !== undefined) {
        features.enableAutomaticPunctuation = params.enableAutomaticPunctuation;
      }
      if (params.enableWordTimeOffsets !== undefined) {
        features.enableWordTimeOffsets = params.enableWordTimeOffsets;
      }
      if (params.enableWordConfidence !== undefined) {
        features.enableWordConfidence = params.enableWordConfidence;
      }
      if (params.minSpeakerCount !== undefined || params.maxSpeakerCount !== undefined) {
        features.diarizationConfig = {
          minSpeakerCount: params.minSpeakerCount,
          maxSpeakerCount: params.maxSpeakerCount
        };
      }

      let configObj: Record<string, unknown> = {
        autoDecodingConfig: {}
      };
      if (params.model) configObj.model = params.model;
      if (params.languageCodes && params.languageCodes.length > 0) {
        configObj.languageCodes = params.languageCodes;
      }
      if (Object.keys(features).length > 0) configObj.features = features;

      let files = params.fileUris.map(uri => ({ uri }));

      let recognitionOutputConfig: Record<string, unknown> = {};
      if (params.outputUri) {
        recognitionOutputConfig.gcsOutputConfig = { uri: params.outputUri };
      } else {
        recognitionOutputConfig.inlineResponseConfig = {};
      }

      let body: Record<string, unknown> = {
        config: configObj,
        files,
        recognitionOutputConfig
      };

      let response = await this.http.post(url, body);
      return response.data as OperationResponse;
    });
  }

  async getOperation(operationName: string): Promise<OperationResponse> {
    let response = await this.http.get(`/v2/${operationName}`);
    return response.data as OperationResponse;
  }

  async listOperations(params?: {
    pageSize?: number;
    pageToken?: string;
    filter?: string;
  }): Promise<ListOperationsResponse> {
    return await this.withLocationFallback(async region => {
      let queryParams: Record<string, string> = {};
      if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
      if (params?.pageToken) queryParams.pageToken = params.pageToken;
      if (params?.filter) queryParams.filter = params.filter;

      let response = await this.http.get(`${this.recognizerBase(region)}/operations`, {
        params: queryParams
      });
      return response.data as ListOperationsResponse;
    });
  }

  async createRecognizer(params: {
    recognizerId: string;
    displayName?: string;
    model: string;
    languageCodes: string[];
    enableAutomaticPunctuation?: boolean;
    enableWordTimeOffsets?: boolean;
    enableWordConfidence?: boolean;
  }): Promise<OperationResponse> {
    return await this.withLocationFallback(async region => {
      let url = `${this.recognizerBase(region)}/recognizers`;

      let features: Record<string, unknown> = {};
      if (params.enableAutomaticPunctuation !== undefined) {
        features.enableAutomaticPunctuation = params.enableAutomaticPunctuation;
      }
      if (params.enableWordTimeOffsets !== undefined) {
        features.enableWordTimeOffsets = params.enableWordTimeOffsets;
      }
      if (params.enableWordConfidence !== undefined) {
        features.enableWordConfidence = params.enableWordConfidence;
      }

      let defaultRecognitionConfig: Record<string, unknown> = {
        autoDecodingConfig: {}
      };
      if (params.model) defaultRecognitionConfig.model = params.model;
      if (params.languageCodes.length > 0) {
        defaultRecognitionConfig.languageCodes = params.languageCodes;
      }
      if (Object.keys(features).length > 0) {
        defaultRecognitionConfig.features = features;
      }

      let body: Record<string, unknown> = {
        displayName: params.displayName || params.recognizerId,
        model: params.model,
        languageCodes: params.languageCodes,
        defaultRecognitionConfig
      };

      let response = await this.http.post(url, body, {
        params: { recognizerId: params.recognizerId }
      });
      return response.data as OperationResponse;
    });
  }

  async getRecognizer(recognizerId: string): Promise<RecognizerResource> {
    return await this.withLocationFallback(async region => {
      let url = `${this.recognizerBase(region)}/recognizers/${recognizerId}`;
      let response = await this.http.get(url);
      return response.data as RecognizerResource;
    });
  }

  async listRecognizers(params?: {
    pageSize?: number;
    pageToken?: string;
  }): Promise<ListRecognizersResponse> {
    return await this.withLocationFallback(async region => {
      let queryParams: Record<string, string> = {};
      if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
      if (params?.pageToken) queryParams.pageToken = params.pageToken;

      let response = await this.http.get(`${this.recognizerBase(region)}/recognizers`, {
        params: queryParams
      });
      return response.data as ListRecognizersResponse;
    });
  }

  async updateRecognizer(params: {
    recognizerId: string;
    displayName?: string;
    model?: string;
    languageCodes?: string[];
  }): Promise<OperationResponse> {
    return await this.withLocationFallback(async region => {
      let base = this.recognizerBase(region);
      let url = `${base}/recognizers/${params.recognizerId}`;

      let body: Record<string, unknown> = {
        name: `${base}/recognizers/${params.recognizerId}`
      };
      let updateMaskFields: string[] = [];

      if (params.displayName !== undefined) {
        body.displayName = params.displayName;
        updateMaskFields.push('displayName');
      }
      if (params.model !== undefined) {
        body.model = params.model;
        updateMaskFields.push('model');
      }
      if (params.languageCodes !== undefined) {
        body.languageCodes = params.languageCodes;
        updateMaskFields.push('languageCodes');
      }

      let response = await this.http.patch(url, body, {
        params: { updateMask: updateMaskFields.join(',') }
      });
      return response.data as OperationResponse;
    });
  }

  async deleteRecognizer(recognizerId: string): Promise<OperationResponse> {
    return await this.withLocationFallback(async region => {
      let url = `${this.recognizerBase(region)}/recognizers/${recognizerId}`;
      let response = await this.http.delete(url);
      return response.data as OperationResponse;
    });
  }
}

export class TextToSpeechClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://texttospeech.googleapis.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async synthesize(params: {
    text?: string;
    ssml?: string;
    languageCode: string;
    voiceName?: string;
    ssmlGender?: string;
    audioEncoding: string;
    speakingRate?: number;
    pitch?: number;
    volumeGainDb?: number;
    sampleRateHertz?: number;
    effectsProfileId?: string[];
  }): Promise<SynthesizeResponse> {
    let input: Record<string, unknown> = {};
    if (params.ssml) {
      input.ssml = params.ssml;
    } else {
      input.text = params.text || '';
    }

    let voice: Record<string, unknown> = {
      languageCode: params.languageCode
    };
    if (params.voiceName) voice.name = params.voiceName;
    if (params.ssmlGender) voice.ssmlGender = params.ssmlGender;

    let audioConfig: Record<string, unknown> = {
      audioEncoding: params.audioEncoding
    };
    if (params.speakingRate !== undefined) audioConfig.speakingRate = params.speakingRate;
    if (params.pitch !== undefined) audioConfig.pitch = params.pitch;
    if (params.volumeGainDb !== undefined) audioConfig.volumeGainDb = params.volumeGainDb;
    if (params.sampleRateHertz !== undefined)
      audioConfig.sampleRateHertz = params.sampleRateHertz;
    if (params.effectsProfileId && params.effectsProfileId.length > 0) {
      audioConfig.effectsProfileId = params.effectsProfileId;
    }

    let body = { input, voice, audioConfig };

    let response = await this.http.post('/v1/text:synthesize', body);
    return response.data as SynthesizeResponse;
  }

  async listVoices(languageCode?: string): Promise<ListVoicesResponse> {
    let params: Record<string, string> = {};
    if (languageCode) params.languageCode = languageCode;

    let response = await this.http.get('/v1/voices', { params });
    return response.data as ListVoicesResponse;
  }
}

// --- Response Types ---

export interface RecognizeResponse {
  results?: RecognitionResult[];
  metadata?: {
    requestId?: string;
    totalBilledDuration?: string;
  };
}

export interface RecognitionResult {
  alternatives?: SpeechRecognitionAlternative[];
  channelTag?: number;
  resultEndOffset?: string;
  languageCode?: string;
}

export interface SpeechRecognitionAlternative {
  transcript?: string;
  confidence?: number;
  words?: WordInfo[];
}

export interface WordInfo {
  startOffset?: string;
  endOffset?: string;
  word?: string;
  confidence?: number;
  speakerLabel?: string;
}

export interface OperationResponse {
  name?: string;
  metadata?: Record<string, unknown>;
  done?: boolean;
  error?: {
    code?: number;
    message?: string;
    details?: unknown[];
  };
  response?: Record<string, unknown>;
}

export interface ListOperationsResponse {
  operations?: OperationResponse[];
  nextPageToken?: string;
}

export interface RecognizerResource {
  name?: string;
  uid?: string;
  displayName?: string;
  model?: string;
  languageCodes?: string[];
  defaultRecognitionConfig?: Record<string, unknown>;
  annotations?: Record<string, string>;
  state?: string;
  createTime?: string;
  updateTime?: string;
  deleteTime?: string;
  expireTime?: string;
  etag?: string;
  reconciling?: boolean;
}

export interface ListRecognizersResponse {
  recognizers?: RecognizerResource[];
  nextPageToken?: string;
}

export interface SynthesizeResponse {
  audioContent?: string;
}

export interface VoiceInfo {
  languageCodes?: string[];
  name?: string;
  ssmlGender?: string;
  naturalSampleRateHertz?: number;
}

export interface ListVoicesResponse {
  voices?: VoiceInfo[];
}
