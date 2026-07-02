import { createAxios } from 'slates';
import { decodeBase64Content, encodeBase64Content } from './audio';
import { azureSpeechApiError } from './errors';

const SPEECH_TO_TEXT_API_VERSION = '2025-10-15';
const SPEAKER_RECOGNITION_API_VERSION = '2021-09-05';

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
      reqHeaders['Pronunciation-Assessment'] = Buffer.from(pronJson, 'utf8').toString(
        'base64'
      );
    }

    try {
      let response = await axios.post(
        '/speech/recognition/conversation/cognitiveservices/v1',
        decodeBase64Content(params.audioData, 'audioBase64'),
        {
          params: queryParams,
          headers: reqHeaders
        }
      );

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'recognize speech');
    }
  }

  async createBatchTranscription(params: {
    displayName: string;
    locale: string;
    contentUrls?: string[];
    contentContainerUrl?: string;
    destinationContainerUrl?: string;
    timeToLiveHours?: number;
    wordLevelTimestampsEnabled?: boolean;
    displayFormWordLevelTimestampsEnabled?: boolean;
    channels?: number[];
    diarization?: {
      enabled?: boolean;
      maxSpeakers?: number;
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
    if (params.displayFormWordLevelTimestampsEnabled !== undefined) {
      properties.displayFormWordLevelTimestampsEnabled =
        params.displayFormWordLevelTimestampsEnabled;
    }
    if (params.channels) {
      properties.channels = params.channels;
    }
    if (params.diarization) {
      properties.diarization = {
        enabled: params.diarization.enabled ?? true,
        ...(params.diarization.maxSpeakers !== undefined
          ? { maxSpeakers: params.diarization.maxSpeakers }
          : {})
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
    if (params.destinationContainerUrl) {
      properties.destinationContainerUrl = params.destinationContainerUrl;
    }
    if (params.model) {
      body.model = { self: params.model };
    }

    try {
      let response = await axios.post('/speechtotext/transcriptions:submit', body, {
        params: { 'api-version': SPEECH_TO_TEXT_API_VERSION },
        headers: {
          ...this.headers,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'create batch transcription');
    }
  }

  async getTranscription(transcriptionId: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    try {
      let response = await axios.get(`/speechtotext/transcriptions/${transcriptionId}`, {
        params: { 'api-version': SPEECH_TO_TEXT_API_VERSION },
        headers: this.headers
      });

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'get batch transcription');
    }
  }

  async listTranscriptions(params?: { skip?: number; top?: number }) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    try {
      let response = await axios.get('/speechtotext/transcriptions', {
        params: {
          'api-version': SPEECH_TO_TEXT_API_VERSION,
          ...(params?.skip !== undefined ? { skip: params.skip } : {}),
          ...(params?.top !== undefined ? { top: params.top } : {})
        },
        headers: this.headers
      });

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'list batch transcriptions');
    }
  }

  async getTranscriptionFiles(transcriptionId: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    try {
      let response = await axios.get(`/speechtotext/transcriptions/${transcriptionId}/files`, {
        params: { 'api-version': SPEECH_TO_TEXT_API_VERSION },
        headers: this.headers
      });

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'list batch transcription files');
    }
  }

  async deleteTranscription(transcriptionId: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    try {
      await axios.delete(`/speechtotext/transcriptions/${transcriptionId}`, {
        params: { 'api-version': SPEECH_TO_TEXT_API_VERSION },
        headers: this.headers
      });
    } catch (error) {
      throw azureSpeechApiError(error, 'delete batch transcription');
    }
  }

  async listBaseModels(params?: { skip?: number; top?: number }) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    try {
      let response = await axios.get('/speechtotext/models/base', {
        params: {
          'api-version': SPEECH_TO_TEXT_API_VERSION,
          ...(params?.skip !== undefined ? { skip: params.skip } : {}),
          ...(params?.top !== undefined ? { top: params.top } : {})
        },
        headers: this.headers
      });

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'list speech models');
    }
  }

  async fastTranscribeAudio(params: {
    audioBase64: string;
    fileName?: string;
    contentType?: string;
    locales?: string[];
    channels?: number[];
    diarization?: {
      enabled?: boolean;
      maxSpeakers?: number;
    };
    profanityFilterMode?: 'None' | 'Masked' | 'Removed' | 'Tags';
  }) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    let definition: Record<string, unknown> = {};
    if (params.locales !== undefined) {
      definition.locales = params.locales;
    }
    if (params.channels) {
      definition.channels = params.channels;
    }
    if (params.diarization) {
      definition.diarization = {
        enabled: params.diarization.enabled ?? true,
        ...(params.diarization.maxSpeakers !== undefined
          ? { maxSpeakers: params.diarization.maxSpeakers }
          : {})
      };
    }
    if (params.profanityFilterMode) {
      definition.profanityFilterMode = params.profanityFilterMode;
    }

    let audioBytes = decodeBase64Content(params.audioBase64, 'audioBase64');
    let formData = new FormData();
    formData.append(
      'audio',
      new Blob([new Uint8Array(audioBytes)], {
        type: params.contentType ?? 'audio/wav'
      }),
      params.fileName ?? 'audio.wav'
    );
    formData.append('definition', JSON.stringify(definition));

    try {
      let response = await axios.post('/speechtotext/transcriptions:transcribe', formData, {
        params: { 'api-version': SPEECH_TO_TEXT_API_VERSION },
        headers: this.headers
      });

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'fast transcribe audio');
    }
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

    try {
      let response = await axios.get('/cognitiveservices/voices/list', {
        headers: this.headers
      });

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'list voices');
    }
  }

  async synthesizeSpeech(params: { ssml: string; outputFormat: string }) {
    let axios = createAxios({
      baseURL: this.ttsBaseUrl
    });

    try {
      let response = await axios.post('/cognitiveservices/v1', params.ssml, {
        headers: {
          ...this.headers,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': params.outputFormat,
          'User-Agent': 'SlatesAzureSpeech/1.0'
        },
        responseType: 'arraybuffer'
      });

      let audioBytes = Buffer.from(response.data);

      return {
        contentBase64: encodeBase64Content(audioBytes),
        contentType: String(response.headers?.['content-type'] ?? 'audio/wav'),
        byteLength: audioBytes.byteLength
      };
    } catch (error) {
      throw azureSpeechApiError(error, 'synthesize speech');
    }
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

    try {
      let response = await axios.post(
        '/speaker-recognition/verification/text-independent/profiles',
        { locale },
        {
          params: { 'api-version': SPEAKER_RECOGNITION_API_VERSION },
          headers: {
            ...this.headers,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'create verification speaker profile');
    }
  }

  async createIdentificationProfile(locale: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    try {
      let response = await axios.post(
        '/speaker-recognition/identification/text-independent/profiles',
        { locale },
        {
          params: { 'api-version': SPEAKER_RECOGNITION_API_VERSION },
          headers: {
            ...this.headers,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'create identification speaker profile');
    }
  }

  async deleteProfile(profileType: 'verification' | 'identification', profileId: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    try {
      await axios.delete(
        `/speaker-recognition/${profileType}/text-independent/profiles/${profileId}`,
        {
          params: { 'api-version': SPEAKER_RECOGNITION_API_VERSION },
          headers: this.headers
        }
      );
    } catch (error) {
      throw azureSpeechApiError(error, 'delete speaker profile');
    }
  }

  async getProfile(profileType: 'verification' | 'identification', profileId: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    try {
      let response = await axios.get(
        `/speaker-recognition/${profileType}/text-independent/profiles/${profileId}`,
        {
          params: { 'api-version': SPEAKER_RECOGNITION_API_VERSION },
          headers: this.headers
        }
      );

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'get speaker profile');
    }
  }

  async listProfiles(profileType: 'verification' | 'identification') {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    try {
      let response = await axios.get(
        `/speaker-recognition/${profileType}/text-independent/profiles`,
        {
          params: { 'api-version': SPEAKER_RECOGNITION_API_VERSION },
          headers: this.headers
        }
      );

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'list speaker profiles');
    }
  }

  async enrollProfile(
    profileType: 'verification' | 'identification',
    profileId: string,
    audioData: string
  ) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    try {
      let response = await axios.post(
        `/speaker-recognition/${profileType}/text-independent/profiles/${profileId}/enrollments`,
        decodeBase64Content(audioData, 'audioBase64'),
        {
          params: { 'api-version': SPEAKER_RECOGNITION_API_VERSION },
          headers: {
            ...this.headers,
            'Content-Type': 'audio/wav'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'enroll speaker profile');
    }
  }

  async verifySpeaker(profileId: string, audioData: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    try {
      let response = await axios.post(
        `/speaker-recognition/verification/text-independent/profiles/${profileId}:verify`,
        decodeBase64Content(audioData, 'audioBase64'),
        {
          params: { 'api-version': SPEAKER_RECOGNITION_API_VERSION },
          headers: {
            ...this.headers,
            'Content-Type': 'audio/wav'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'verify speaker');
    }
  }

  async identifySpeaker(profileIds: string[], audioData: string) {
    let axios = createAxios({
      baseURL: this.cognitiveBaseUrl
    });

    try {
      let response = await axios.post(
        '/speaker-recognition/identification/text-independent/profiles:identifySingleSpeaker',
        decodeBase64Content(audioData, 'audioBase64'),
        {
          params: {
            'api-version': SPEAKER_RECOGNITION_API_VERSION,
            profileIds: profileIds.join(',')
          },
          headers: {
            ...this.headers,
            'Content-Type': 'audio/wav'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw azureSpeechApiError(error, 'identify speaker');
    }
  }
}
