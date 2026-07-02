import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  region: string;
}

export class SpeechToTextClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  private get sttBaseUrl() {
    return `https://${this.config.region}.stt.speech.microsoft.com`;
  }

  private get cognitiveBaseUrl() {
    return `https://${this.config.region}.api.cognitive.microsoft.com`;
  }

  private get headers() {
    return {
      'Ocp-Apim-Subscription-Key': this.config.token
    };
  }

  async recognizeShortAudio(params: {
    audioData: string;
    language: string;
    format?: 'simple' | 'detailed';
    profanity?: 'masked' | 'removed' | 'raw';
    contentType?: string;
    pronunciationAssessment?: {
      referenceText?: string;
      gradingSystem?: 'FivePoint' | 'HundredMark';
      granularity?: 'Phoneme' | 'Word' | 'FullText';
      dimension?: 'Basic' | 'Comprehensive';
      enableMiscue?: boolean;
      enableProsodyAssessment?: boolean;
    };
  }) {
    let axios = createAxios({
      baseURL: this.sttBaseUrl
    });

    let queryParams: Record<string, string> = {
      language: params.language
    };
    if (params.format) queryParams.format = params.format;
    if (params.profanity) queryParams.profanity = params.profanity;

    let reqHeaders: Record<string, string> = {
      ...this.headers,
      'Content-Type': params.contentType || 'audio/wav; codecs=audio/pcm; samplerate=16000',
      Accept: 'application/json'
    };

    if (params.pronunciationAssessment) {
      let pronJson = JSON.stringify({
        ReferenceText: params.pronunciationAssessment.referenceText,
        GradingSystem: params.pronunciationAssessment.gradingSystem || 'HundredMark',
        Granularity: params.pronunciationAssessment.granularity || 'Phoneme',
        Dimension: params.pronunciationAssessment.dimension || 'Comprehensive',
        EnableMiscue: params.pronunciationAssessment.enableMiscue ? 'True' : 'False',
        EnableProsodyAssessment: params.pronunciationAssessment.enableProsodyAssessment
          ? 'True'
          : 'False'
      });
      reqHeaders['Pronunciation-Assessment'] = btoa(pronJson);
    }

    let response = await axios.post(
      '/speech/recognition/conversation/cognitiveservices/v1',
      params.audioData,
      {
        params: queryParams,
        headers: reqHeaders
      }
    );

    return response.data;
  }

  async createBatchTranscription(params: {
    displayName: string;
    locale: string;
    contentUrls?: string[];
    contentContainerUrl?: string;
    timeToLiveHours?: number;
    wordLevelTimestampsEnabled?: boolean;
    diarizationEnabled?: boolean;
    diarization?: {
      minCount?: number;
      maxCount?: number;
    };
    punctuationMode?: string;
    profanityFilterMode?: string;
    model?: string;
    languageIdentification?: {
      candidateLocales: string[];
      mode?: string;
    };
  }) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let properties: Record<string, any> = {
      timeToLiveHours: params.timeToLiveHours ?? 48
    };

    if (params.wordLevelTimestampsEnabled !== undefined) {
      properties.wordLevelTimestampsEnabled = params.wordLevelTimestampsEnabled;
    }
    if (params.diarizationEnabled !== undefined) {
      properties.diarizationEnabled = params.diarizationEnabled;
    }
    if (params.diarization) {
      properties.diarization = {
        speakers: {
          minCount: params.diarization.minCount ?? 2,
          maxCount: params.diarization.maxCount ?? 10
        }
      };
    }
    if (params.punctuationMode) {
      properties.punctuationMode = params.punctuationMode;
    }
    if (params.profanityFilterMode) {
      properties.profanityFilterMode = params.profanityFilterMode;
    }
    if (params.languageIdentification) {
      properties.languageIdentification = params.languageIdentification;
    }

    let body: Record<string, any> = {
      displayName: params.displayName,
      locale: params.locale,
      properties
    };

    if (params.contentUrls) body.contentUrls = params.contentUrls;
    if (params.contentContainerUrl) body.contentContainerUrl = params.contentContainerUrl;
    if (params.model) {
      body.model = { self: params.model };
    }

    let response = await axios.post('/speechtotext/transcriptions:submit', body, {
      params: { 'api-version': '2024-11-15' },
      headers: {
        ...this.headers,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  async getTranscription(transcriptionId: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let response = await axios.get(`/speechtotext/transcriptions/${transcriptionId}`, {
      params: { 'api-version': '2024-11-15' },
      headers: this.headers
    });

    return response.data;
  }

  async listTranscriptions(params?: { skip?: number; top?: number }) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let response = await axios.get('/speechtotext/transcriptions', {
      params: {
        'api-version': '2024-11-15',
        ...(params?.skip !== undefined ? { skip: params.skip } : {}),
        ...(params?.top !== undefined ? { top: params.top } : {})
      },
      headers: this.headers
    });

    return response.data;
  }

  async getTranscriptionFiles(transcriptionId: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let response = await axios.get(`/speechtotext/transcriptions/${transcriptionId}/files`, {
      params: { 'api-version': '2024-11-15' },
      headers: this.headers
    });

    return response.data;
  }

  async deleteTranscription(transcriptionId: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    await axios.delete(`/speechtotext/transcriptions/${transcriptionId}`, {
      params: { 'api-version': '2024-11-15' },
      headers: this.headers
    });
  }

  async listBaseModels(params?: { skip?: number; top?: number }) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let response = await axios.get('/speechtotext/models/base', {
      params: {
        'api-version': '2024-11-15',
        ...(params?.skip !== undefined ? { skip: params.skip } : {}),
        ...(params?.top !== undefined ? { top: params.top } : {})
      },
      headers: this.headers
    });

    return response.data;
  }
}

export class TextToSpeechClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  private get ttsBaseUrl() {
    return `https://${this.config.region}.tts.speech.microsoft.com`;
  }

  private get headers() {
    return {
      'Ocp-Apim-Subscription-Key': this.config.token
    };
  }

  async listVoices() {
    let axios = createAxios({
      baseURL: this.ttsBaseUrl
    });

    let response = await axios.get('/cognitiveservices/voices/list', {
      headers: this.headers
    });

    return response.data;
  }

  async synthesizeSpeech(params: { ssml: string; outputFormat: string }) {
    let axios = createAxios({
      baseURL: this.ttsBaseUrl
    });

    let response = await axios.post('/cognitiveservices/v1', params.ssml, {
      headers: {
        ...this.headers,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': params.outputFormat,
        'User-Agent': 'SlatesAzureSpeech/1.0'
      },
      responseType: 'arraybuffer'
    });

    let audioBytes = new Uint8Array(response.data);
    let binaryString = '';
    for (let i = 0; i < audioBytes.length; i++) {
      binaryString += String.fromCharCode(audioBytes[i]!);
    }
    let audioBase64 = btoa(binaryString);

    return {
      audioBase64,
      contentType: String(response.headers?.['content-type'] ?? 'audio/wav')
    };
  }
}

export class SpeakerRecognitionClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  private get cognitiveBaseUrl() {
    return `https://${this.config.region}.api.cognitive.microsoft.com`;
  }

  private get headers() {
    return {
      'Ocp-Apim-Subscription-Key': this.config.token
    };
  }

  async createVerificationProfile(locale: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let response = await axios.post(
      '/speaker-recognition/verification/text-independent/profiles',
      { locale },
      {
        params: { 'api-version': '2021-09-05' },
        headers: {
          ...this.headers,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  async createIdentificationProfile(locale: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let response = await axios.post(
      '/speaker-recognition/identification/text-independent/profiles',
      { locale },
      {
        params: { 'api-version': '2021-09-05' },
        headers: {
          ...this.headers,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  async deleteProfile(profileType: 'verification' | 'identification', profileId: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    await axios.delete(
      `/speaker-recognition/${profileType}/text-independent/profiles/${profileId}`,
      {
        params: { 'api-version': '2021-09-05' },
        headers: this.headers
      }
    );
  }

  async getProfile(profileType: 'verification' | 'identification', profileId: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let response = await axios.get(
      `/speaker-recognition/${profileType}/text-independent/profiles/${profileId}`,
      {
        params: { 'api-version': '2021-09-05' },
        headers: this.headers
      }
    );

    return response.data;
  }

  async listProfiles(profileType: 'verification' | 'identification') {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let response = await axios.get(
      `/speaker-recognition/${profileType}/text-independent/profiles`,
      {
        params: { 'api-version': '2021-09-05' },
        headers: this.headers
      }
    );

    return response.data;
  }

  async enrollProfile(
    profileType: 'verification' | 'identification',
    profileId: string,
    audioData: string
  ) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let response = await axios.post(
      `/speaker-recognition/${profileType}/text-independent/profiles/${profileId}/enrollments`,
      audioData,
      {
        params: { 'api-version': '2021-09-05' },
        headers: {
          ...this.headers,
          'Content-Type': 'audio/wav'
        }
      }
    );

    return response.data;
  }

  async verifySpeaker(profileId: string, audioData: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let response = await axios.post(
      `/speaker-recognition/verification/text-independent/profiles/${profileId}:verify`,
      audioData,
      {
        params: { 'api-version': '2021-09-05' },
        headers: {
          ...this.headers,
          'Content-Type': 'audio/wav'
        }
      }
    );

    return response.data;
  }

  async identifySpeaker(profileIds: string[], audioData: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let response = await axios.post(
      '/speaker-recognition/identification/text-independent/profiles:identifySingleSpeaker',
      audioData,
      {
        params: {
          'api-version': '2021-09-05',
          profileIds: profileIds.join(',')
        },
        headers: {
          ...this.headers,
          'Content-Type': 'audio/wav'
        }
      }
    );

    return response.data;
  }
}
