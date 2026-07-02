import { createAxios } from 'slates';
import { type AwsCredentials, signRequest } from './aws-signer';
import { transcribeApiError } from './errors';

export interface TranscribeClientConfig {
  credentials: AwsCredentials;
  region: string;
}

let mapLanguageIdSettings = (settings: Record<string, LanguageIdSetting>) =>
  Object.fromEntries(
    Object.entries(settings).map(([languageCode, setting]) => [
      languageCode,
      {
        ...(setting.languageModelName ? { LanguageModelName: setting.languageModelName } : {}),
        ...(setting.vocabularyName ? { VocabularyName: setting.vocabularyName } : {}),
        ...(setting.vocabularyFilterName
          ? { VocabularyFilterName: setting.vocabularyFilterName }
          : {})
      }
    ])
  );

let mapTimeRange = (range: TimeRange | undefined) => {
  if (!range) {
    return undefined;
  }

  return {
    ...(range.first !== undefined ? { First: range.first } : {}),
    ...(range.last !== undefined ? { Last: range.last } : {})
  };
};

let mapCallAnalyticsRule = (rule: CallAnalyticsCategoryRule): Record<string, any> => {
  let base = {
    ...(rule.absoluteTimeRange
      ? { AbsoluteTimeRange: mapTimeRange(rule.absoluteTimeRange) }
      : {}),
    ...(rule.relativeTimeRange
      ? { RelativeTimeRange: mapTimeRange(rule.relativeTimeRange) }
      : {}),
    ...(rule.negate !== undefined ? { Negate: rule.negate } : {}),
    ...(rule.participantRole ? { ParticipantRole: rule.participantRole } : {})
  };

  if (rule.ruleType === 'transcript') {
    return {
      TranscriptFilter: {
        ...base,
        Targets: rule.targets,
        TranscriptFilterType: rule.transcriptFilterType || 'EXACT'
      }
    };
  }

  if (rule.ruleType === 'sentiment') {
    return {
      SentimentFilter: {
        ...base,
        Sentiments: rule.sentiments
      }
    };
  }

  if (rule.ruleType === 'interruption') {
    return {
      InterruptionFilter: {
        ...base,
        ...(rule.threshold !== undefined ? { Threshold: rule.threshold } : {})
      }
    };
  }

  return {
    NonTalkTimeFilter: {
      ...(rule.absoluteTimeRange
        ? { AbsoluteTimeRange: mapTimeRange(rule.absoluteTimeRange) }
        : {}),
      ...(rule.relativeTimeRange
        ? { RelativeTimeRange: mapTimeRange(rule.relativeTimeRange) }
        : {}),
      ...(rule.negate !== undefined ? { Negate: rule.negate } : {}),
      ...(rule.threshold !== undefined ? { Threshold: rule.threshold } : {})
    }
  };
};

export class TranscribeClient {
  private credentials: AwsCredentials;
  private region: string;
  private baseUrl: string;

  constructor(config: TranscribeClientConfig) {
    this.credentials = config.credentials;
    this.region = config.region;
    this.baseUrl = `https://transcribe.${config.region}.amazonaws.com`;
  }

  private async request(target: string, payload: Record<string, any>): Promise<any> {
    let ax = createAxios();
    let body = JSON.stringify(payload);
    let url = this.baseUrl;

    let headers: Record<string, string> = {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `Transcribe.${target}`
    };

    let sigHeaders = signRequest({
      method: 'POST',
      url,
      headers,
      body,
      credentials: this.credentials,
      region: this.region,
      service: 'transcribe'
    });

    try {
      let response = await ax.post(url, body, {
        headers: {
          ...headers,
          ...sigHeaders
        }
      });

      return response.data;
    } catch (error) {
      throw transcribeApiError(error, target);
    }
  }

  // ---- Transcription Jobs ----

  async startTranscriptionJob(params: StartTranscriptionJobParams): Promise<any> {
    let media: Record<string, any> = { MediaFileUri: params.mediaFileUri };
    if (params.redactedMediaFileUri) {
      media.RedactedMediaFileUri = params.redactedMediaFileUri;
    }

    let payload: Record<string, any> = {
      TranscriptionJobName: params.jobName,
      Media: media
    };

    if (params.languageCode) payload.LanguageCode = params.languageCode;
    if (params.identifyLanguage) payload.IdentifyLanguage = params.identifyLanguage;
    if (params.identifyMultipleLanguages)
      payload.IdentifyMultipleLanguages = params.identifyMultipleLanguages;
    if (params.languageOptions) payload.LanguageOptions = params.languageOptions;
    if (params.mediaFormat) payload.MediaFormat = params.mediaFormat;
    if (params.mediaSampleRateHertz)
      payload.MediaSampleRateHertz = params.mediaSampleRateHertz;
    if (params.outputBucketName) payload.OutputBucketName = params.outputBucketName;
    if (params.outputKey) payload.OutputKey = params.outputKey;
    if (params.outputEncryptionKmsKeyId)
      payload.OutputEncryptionKMSKeyId = params.outputEncryptionKmsKeyId;
    if (params.kmsEncryptionContext)
      payload.KMSEncryptionContext = params.kmsEncryptionContext;
    if (params.languageIdSettings)
      payload.LanguageIdSettings = mapLanguageIdSettings(params.languageIdSettings);

    if (params.settings) {
      let settings: Record<string, any> = {};
      if (params.settings.vocabularyName)
        settings.VocabularyName = params.settings.vocabularyName;
      if (params.settings.showSpeakerLabels !== undefined)
        settings.ShowSpeakerLabels = params.settings.showSpeakerLabels;
      if (params.settings.maxSpeakerLabels)
        settings.MaxSpeakerLabels = params.settings.maxSpeakerLabels;
      if (params.settings.channelIdentification !== undefined)
        settings.ChannelIdentification = params.settings.channelIdentification;
      if (params.settings.showAlternatives !== undefined)
        settings.ShowAlternatives = params.settings.showAlternatives;
      if (params.settings.maxAlternatives)
        settings.MaxAlternatives = params.settings.maxAlternatives;
      if (params.settings.vocabularyFilterName)
        settings.VocabularyFilterName = params.settings.vocabularyFilterName;
      if (params.settings.vocabularyFilterMethod)
        settings.VocabularyFilterMethod = params.settings.vocabularyFilterMethod;
      payload.Settings = settings;
    }

    if (params.modelSettings?.languageModelName) {
      payload.ModelSettings = { LanguageModelName: params.modelSettings.languageModelName };
    }

    if (params.contentRedaction) {
      let redaction: Record<string, any> = {
        RedactionType: params.contentRedaction.redactionType,
        RedactionOutput: params.contentRedaction.redactionOutput
      };
      if (params.contentRedaction.piiEntityTypes) {
        redaction.PiiEntityTypes = params.contentRedaction.piiEntityTypes;
      }
      payload.ContentRedaction = redaction;
    }

    if (params.subtitles) {
      let subs: Record<string, any> = {};
      if (params.subtitles.formats) subs.Formats = params.subtitles.formats;
      if (params.subtitles.outputStartIndex !== undefined)
        subs.OutputStartIndex = params.subtitles.outputStartIndex;
      payload.Subtitles = subs;
    }

    if (params.toxicityDetection) {
      payload.ToxicityDetection = [{ ToxicityCategories: params.toxicityDetection }];
    }

    if (params.jobExecutionSettings) {
      payload.JobExecutionSettings = {
        AllowDeferredExecution: params.jobExecutionSettings.allowDeferredExecution,
        DataAccessRoleArn: params.jobExecutionSettings.dataAccessRoleArn
      };
    }

    if (params.tags) {
      payload.Tags = params.tags.map(t => ({ Key: t.key, Value: t.value }));
    }

    return this.request('StartTranscriptionJob', payload);
  }

  async getTranscriptionJob(jobName: string): Promise<any> {
    return this.request('GetTranscriptionJob', {
      TranscriptionJobName: jobName
    });
  }

  async listTranscriptionJobs(params?: ListTranscriptionJobsParams): Promise<any> {
    let payload: Record<string, any> = {};
    if (params?.status) payload.Status = params.status;
    if (params?.jobNameContains) payload.JobNameContains = params.jobNameContains;
    if (params?.maxResults) payload.MaxResults = params.maxResults;
    if (params?.nextToken) payload.NextToken = params.nextToken;
    return this.request('ListTranscriptionJobs', payload);
  }

  async deleteTranscriptionJob(jobName: string): Promise<any> {
    return this.request('DeleteTranscriptionJob', {
      TranscriptionJobName: jobName
    });
  }

  // ---- Call Analytics Jobs ----

  async startCallAnalyticsJob(params: StartCallAnalyticsJobParams): Promise<any> {
    let media: Record<string, any> = { MediaFileUri: params.mediaFileUri };
    if (params.redactedMediaFileUri) {
      media.RedactedMediaFileUri = params.redactedMediaFileUri;
    }

    let payload: Record<string, any> = {
      CallAnalyticsJobName: params.jobName,
      Media: media
    };

    if (params.dataAccessRoleArn) payload.DataAccessRoleArn = params.dataAccessRoleArn;
    if (params.outputLocation) payload.OutputLocation = params.outputLocation;
    if (params.outputEncryptionKmsKeyId)
      payload.OutputEncryptionKMSKeyId = params.outputEncryptionKmsKeyId;

    if (params.channelDefinitions) {
      payload.ChannelDefinitions = params.channelDefinitions.map(ch => ({
        ChannelId: ch.channelId,
        ParticipantRole: ch.participantRole
      }));
    }

    if (params.settings) {
      let settings: Record<string, any> = {};
      if (params.settings.vocabularyName)
        settings.VocabularyName = params.settings.vocabularyName;
      if (params.settings.vocabularyFilterName)
        settings.VocabularyFilterName = params.settings.vocabularyFilterName;
      if (params.settings.vocabularyFilterMethod)
        settings.VocabularyFilterMethod = params.settings.vocabularyFilterMethod;
      if (params.settings.languageModelName)
        settings.LanguageModelName = params.settings.languageModelName;
      if (params.settings.languageOptions)
        settings.LanguageOptions = params.settings.languageOptions;
      if (params.settings.languageIdSettings)
        settings.LanguageIdSettings = mapLanguageIdSettings(
          params.settings.languageIdSettings
        );
      if (params.settings.summarization !== undefined) {
        settings.Summarization = { GenerateAbstractiveSummary: params.settings.summarization };
      }
      if (params.settings.contentRedaction) {
        settings.ContentRedaction = {
          RedactionType: params.settings.contentRedaction.redactionType,
          RedactionOutput: params.settings.contentRedaction.redactionOutput
        };
        if (params.settings.contentRedaction.piiEntityTypes) {
          settings.ContentRedaction.PiiEntityTypes =
            params.settings.contentRedaction.piiEntityTypes;
        }
      }
      payload.Settings = settings;
    }

    if (params.tags) {
      payload.Tags = params.tags.map(t => ({ Key: t.key, Value: t.value }));
    }

    return this.request('StartCallAnalyticsJob', payload);
  }

  async getCallAnalyticsJob(jobName: string): Promise<any> {
    return this.request('GetCallAnalyticsJob', {
      CallAnalyticsJobName: jobName
    });
  }

  async listCallAnalyticsJobs(params?: ListCallAnalyticsJobsParams): Promise<any> {
    let payload: Record<string, any> = {};
    if (params?.status) payload.Status = params.status;
    if (params?.jobNameContains) payload.JobNameContains = params.jobNameContains;
    if (params?.maxResults) payload.MaxResults = params.maxResults;
    if (params?.nextToken) payload.NextToken = params.nextToken;
    return this.request('ListCallAnalyticsJobs', payload);
  }

  async deleteCallAnalyticsJob(jobName: string): Promise<any> {
    return this.request('DeleteCallAnalyticsJob', {
      CallAnalyticsJobName: jobName
    });
  }

  // ---- Call Analytics Categories ----

  async createCallAnalyticsCategory(params: CreateCallAnalyticsCategoryParams): Promise<any> {
    let payload: Record<string, any> = {
      CategoryName: params.categoryName,
      Rules: params.rules.map(mapCallAnalyticsRule)
    };
    if (params.inputType) payload.InputType = params.inputType;
    if (params.tags) {
      payload.Tags = params.tags.map(t => ({ Key: t.key, Value: t.value }));
    }
    return this.request('CreateCallAnalyticsCategory', payload);
  }

  async updateCallAnalyticsCategory(params: UpdateCallAnalyticsCategoryParams): Promise<any> {
    let payload: Record<string, any> = {
      CategoryName: params.categoryName,
      Rules: params.rules.map(mapCallAnalyticsRule)
    };
    if (params.inputType) payload.InputType = params.inputType;
    return this.request('UpdateCallAnalyticsCategory', payload);
  }

  async getCallAnalyticsCategory(categoryName: string): Promise<any> {
    return this.request('GetCallAnalyticsCategory', {
      CategoryName: categoryName
    });
  }

  async deleteCallAnalyticsCategory(categoryName: string): Promise<any> {
    return this.request('DeleteCallAnalyticsCategory', {
      CategoryName: categoryName
    });
  }

  async listCallAnalyticsCategories(params?: ListCallAnalyticsCategoriesParams): Promise<any> {
    let payload: Record<string, any> = {};
    if (params?.maxResults) payload.MaxResults = params.maxResults;
    if (params?.nextToken) payload.NextToken = params.nextToken;
    return this.request('ListCallAnalyticsCategories', payload);
  }

  // ---- Medical Transcription Jobs ----

  async startMedicalTranscriptionJob(
    params: StartMedicalTranscriptionJobParams
  ): Promise<any> {
    let payload: Record<string, any> = {
      MedicalTranscriptionJobName: params.jobName,
      Media: { MediaFileUri: params.mediaFileUri },
      LanguageCode: params.languageCode,
      Specialty: params.specialty,
      Type: params.type,
      OutputBucketName: params.outputBucketName
    };

    if (params.outputKey) payload.OutputKey = params.outputKey;
    if (params.outputEncryptionKmsKeyId)
      payload.OutputEncryptionKMSKeyId = params.outputEncryptionKmsKeyId;
    if (params.kmsEncryptionContext)
      payload.KMSEncryptionContext = params.kmsEncryptionContext;
    if (params.mediaFormat) payload.MediaFormat = params.mediaFormat;
    if (params.mediaSampleRateHertz)
      payload.MediaSampleRateHertz = params.mediaSampleRateHertz;

    if (params.settings) {
      let settings: Record<string, any> = {};
      if (params.settings.showSpeakerLabels !== undefined)
        settings.ShowSpeakerLabels = params.settings.showSpeakerLabels;
      if (params.settings.maxSpeakerLabels)
        settings.MaxSpeakerLabels = params.settings.maxSpeakerLabels;
      if (params.settings.channelIdentification !== undefined)
        settings.ChannelIdentification = params.settings.channelIdentification;
      if (params.settings.showAlternatives !== undefined)
        settings.ShowAlternatives = params.settings.showAlternatives;
      if (params.settings.maxAlternatives)
        settings.MaxAlternatives = params.settings.maxAlternatives;
      if (params.settings.vocabularyName)
        settings.VocabularyName = params.settings.vocabularyName;
      payload.Settings = settings;
    }

    if (params.contentIdentificationType) {
      payload.ContentIdentificationType = params.contentIdentificationType;
    }

    if (params.tags) {
      payload.Tags = params.tags.map(t => ({ Key: t.key, Value: t.value }));
    }

    return this.request('StartMedicalTranscriptionJob', payload);
  }

  async getMedicalTranscriptionJob(jobName: string): Promise<any> {
    return this.request('GetMedicalTranscriptionJob', {
      MedicalTranscriptionJobName: jobName
    });
  }

  async listMedicalTranscriptionJobs(
    params?: ListMedicalTranscriptionJobsParams
  ): Promise<any> {
    let payload: Record<string, any> = {};
    if (params?.status) payload.Status = params.status;
    if (params?.jobNameContains) payload.JobNameContains = params.jobNameContains;
    if (params?.maxResults) payload.MaxResults = params.maxResults;
    if (params?.nextToken) payload.NextToken = params.nextToken;
    return this.request('ListMedicalTranscriptionJobs', payload);
  }

  async deleteMedicalTranscriptionJob(jobName: string): Promise<any> {
    return this.request('DeleteMedicalTranscriptionJob', {
      MedicalTranscriptionJobName: jobName
    });
  }

  // ---- Custom Vocabularies ----

  async createVocabulary(params: CreateVocabularyParams): Promise<any> {
    let payload: Record<string, any> = {
      VocabularyName: params.vocabularyName,
      LanguageCode: params.languageCode
    };
    if (params.phrases) payload.Phrases = params.phrases;
    if (params.vocabularyFileUri) payload.VocabularyFileUri = params.vocabularyFileUri;
    if (params.tags) {
      payload.Tags = params.tags.map(t => ({ Key: t.key, Value: t.value }));
    }
    return this.request('CreateVocabulary', payload);
  }

  async getVocabulary(vocabularyName: string): Promise<any> {
    return this.request('GetVocabulary', {
      VocabularyName: vocabularyName
    });
  }

  async updateVocabulary(params: UpdateVocabularyParams): Promise<any> {
    let payload: Record<string, any> = {
      VocabularyName: params.vocabularyName,
      LanguageCode: params.languageCode
    };
    if (params.phrases) payload.Phrases = params.phrases;
    if (params.vocabularyFileUri) payload.VocabularyFileUri = params.vocabularyFileUri;
    return this.request('UpdateVocabulary', payload);
  }

  async deleteVocabulary(vocabularyName: string): Promise<any> {
    return this.request('DeleteVocabulary', {
      VocabularyName: vocabularyName
    });
  }

  async listVocabularies(params?: ListVocabulariesParams): Promise<any> {
    let payload: Record<string, any> = {};
    if (params?.stateEquals) payload.StateEquals = params.stateEquals;
    if (params?.nameContains) payload.NameContains = params.nameContains;
    if (params?.maxResults) payload.MaxResults = params.maxResults;
    if (params?.nextToken) payload.NextToken = params.nextToken;
    return this.request('ListVocabularies', payload);
  }

  // ---- Medical Vocabularies ----

  async createMedicalVocabulary(params: CreateMedicalVocabularyParams): Promise<any> {
    let payload: Record<string, any> = {
      VocabularyName: params.vocabularyName,
      LanguageCode: params.languageCode,
      VocabularyFileUri: params.vocabularyFileUri
    };
    if (params.tags) {
      payload.Tags = params.tags.map(t => ({ Key: t.key, Value: t.value }));
    }
    return this.request('CreateMedicalVocabulary', payload);
  }

  async getMedicalVocabulary(vocabularyName: string): Promise<any> {
    return this.request('GetMedicalVocabulary', {
      VocabularyName: vocabularyName
    });
  }

  async updateMedicalVocabulary(params: UpdateMedicalVocabularyParams): Promise<any> {
    return this.request('UpdateMedicalVocabulary', {
      VocabularyName: params.vocabularyName,
      LanguageCode: params.languageCode,
      VocabularyFileUri: params.vocabularyFileUri
    });
  }

  async deleteMedicalVocabulary(vocabularyName: string): Promise<any> {
    return this.request('DeleteMedicalVocabulary', {
      VocabularyName: vocabularyName
    });
  }

  async listMedicalVocabularies(params?: ListMedicalVocabulariesParams): Promise<any> {
    let payload: Record<string, any> = {};
    if (params?.stateEquals) payload.StateEquals = params.stateEquals;
    if (params?.nameContains) payload.NameContains = params.nameContains;
    if (params?.maxResults) payload.MaxResults = params.maxResults;
    if (params?.nextToken) payload.NextToken = params.nextToken;
    return this.request('ListMedicalVocabularies', payload);
  }

  // ---- Vocabulary Filters ----

  async createVocabularyFilter(params: CreateVocabularyFilterParams): Promise<any> {
    let payload: Record<string, any> = {
      VocabularyFilterName: params.vocabularyFilterName,
      LanguageCode: params.languageCode
    };
    if (params.words) payload.Words = params.words;
    if (params.vocabularyFilterFileUri)
      payload.VocabularyFilterFileUri = params.vocabularyFilterFileUri;
    if (params.tags) {
      payload.Tags = params.tags.map(t => ({ Key: t.key, Value: t.value }));
    }
    return this.request('CreateVocabularyFilter', payload);
  }

  async getVocabularyFilter(vocabularyFilterName: string): Promise<any> {
    return this.request('GetVocabularyFilter', {
      VocabularyFilterName: vocabularyFilterName
    });
  }

  async updateVocabularyFilter(params: UpdateVocabularyFilterParams): Promise<any> {
    let payload: Record<string, any> = {
      VocabularyFilterName: params.vocabularyFilterName
    };
    if (params.words) payload.Words = params.words;
    if (params.vocabularyFilterFileUri)
      payload.VocabularyFilterFileUri = params.vocabularyFilterFileUri;
    return this.request('UpdateVocabularyFilter', payload);
  }

  async deleteVocabularyFilter(vocabularyFilterName: string): Promise<any> {
    return this.request('DeleteVocabularyFilter', {
      VocabularyFilterName: vocabularyFilterName
    });
  }

  async listVocabularyFilters(params?: ListVocabularyFiltersParams): Promise<any> {
    let payload: Record<string, any> = {};
    if (params?.nameContains) payload.NameContains = params.nameContains;
    if (params?.maxResults) payload.MaxResults = params.maxResults;
    if (params?.nextToken) payload.NextToken = params.nextToken;
    return this.request('ListVocabularyFilters', payload);
  }

  // ---- Language Models ----

  async listLanguageModels(params?: ListLanguageModelsParams): Promise<any> {
    let payload: Record<string, any> = {};
    if (params?.statusEquals) payload.StatusEquals = params.statusEquals;
    if (params?.nameContains) payload.NameContains = params.nameContains;
    if (params?.maxResults) payload.MaxResults = params.maxResults;
    if (params?.nextToken) payload.NextToken = params.nextToken;
    return this.request('ListLanguageModels', payload);
  }

  async describeLanguageModel(modelName: string): Promise<any> {
    return this.request('DescribeLanguageModel', {
      ModelName: modelName
    });
  }

  // ---- Tags ----

  async listTagsForResource(resourceArn: string): Promise<any> {
    return this.request('ListTagsForResource', {
      ResourceArn: resourceArn
    });
  }
}

// ---- Types ----

export interface StartTranscriptionJobParams {
  jobName: string;
  mediaFileUri: string;
  redactedMediaFileUri?: string;
  languageCode?: string;
  identifyLanguage?: boolean;
  identifyMultipleLanguages?: boolean;
  languageIdSettings?: Record<string, LanguageIdSetting>;
  languageOptions?: string[];
  mediaFormat?: string;
  mediaSampleRateHertz?: number;
  outputBucketName?: string;
  outputKey?: string;
  outputEncryptionKmsKeyId?: string;
  kmsEncryptionContext?: Record<string, string>;
  settings?: {
    vocabularyName?: string;
    showSpeakerLabels?: boolean;
    maxSpeakerLabels?: number;
    channelIdentification?: boolean;
    showAlternatives?: boolean;
    maxAlternatives?: number;
    vocabularyFilterName?: string;
    vocabularyFilterMethod?: string;
  };
  modelSettings?: {
    languageModelName?: string;
  };
  contentRedaction?: {
    redactionType: string;
    redactionOutput: string;
    piiEntityTypes?: string[];
  };
  subtitles?: {
    formats?: string[];
    outputStartIndex?: number;
  };
  toxicityDetection?: string[];
  jobExecutionSettings?: {
    allowDeferredExecution: boolean;
    dataAccessRoleArn: string;
  };
  tags?: Array<{ key: string; value: string }>;
}

export interface ListTranscriptionJobsParams {
  status?: string;
  jobNameContains?: string;
  maxResults?: number;
  nextToken?: string;
}

export interface StartCallAnalyticsJobParams {
  jobName: string;
  mediaFileUri: string;
  redactedMediaFileUri?: string;
  dataAccessRoleArn?: string;
  outputLocation?: string;
  outputEncryptionKmsKeyId?: string;
  channelDefinitions?: Array<{
    channelId: number;
    participantRole: string;
  }>;
  settings?: {
    vocabularyName?: string;
    vocabularyFilterName?: string;
    vocabularyFilterMethod?: string;
    languageModelName?: string;
    languageOptions?: string[];
    languageIdSettings?: Record<string, LanguageIdSetting>;
    summarization?: boolean;
    contentRedaction?: {
      redactionType: string;
      redactionOutput: string;
      piiEntityTypes?: string[];
    };
  };
  tags?: Array<{ key: string; value: string }>;
}

export interface ListCallAnalyticsJobsParams {
  status?: string;
  jobNameContains?: string;
  maxResults?: number;
  nextToken?: string;
}

export interface TimeRange {
  first?: number;
  last?: number;
}

export interface LanguageIdSetting {
  languageModelName?: string;
  vocabularyName?: string;
  vocabularyFilterName?: string;
}

export type CallAnalyticsRuleType =
  | 'transcript'
  | 'sentiment'
  | 'interruption'
  | 'non_talk_time';

export interface CallAnalyticsCategoryRule {
  ruleType: CallAnalyticsRuleType;
  targets?: string[];
  transcriptFilterType?: 'EXACT';
  sentiments?: Array<'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED'>;
  participantRole?: 'AGENT' | 'CUSTOMER';
  negate?: boolean;
  threshold?: number;
  absoluteTimeRange?: TimeRange;
  relativeTimeRange?: TimeRange;
}

export interface CreateCallAnalyticsCategoryParams {
  categoryName: string;
  inputType?: string;
  rules: CallAnalyticsCategoryRule[];
  tags?: Array<{ key: string; value: string }>;
}

export interface UpdateCallAnalyticsCategoryParams {
  categoryName: string;
  inputType?: string;
  rules: CallAnalyticsCategoryRule[];
}

export interface ListCallAnalyticsCategoriesParams {
  maxResults?: number;
  nextToken?: string;
}

export interface StartMedicalTranscriptionJobParams {
  jobName: string;
  mediaFileUri: string;
  languageCode: string;
  specialty: string;
  type: string;
  outputBucketName: string;
  outputKey?: string;
  outputEncryptionKmsKeyId?: string;
  kmsEncryptionContext?: Record<string, string>;
  mediaFormat?: string;
  mediaSampleRateHertz?: number;
  settings?: {
    showSpeakerLabels?: boolean;
    maxSpeakerLabels?: number;
    channelIdentification?: boolean;
    showAlternatives?: boolean;
    maxAlternatives?: number;
    vocabularyName?: string;
  };
  contentIdentificationType?: string;
  tags?: Array<{ key: string; value: string }>;
}

export interface ListMedicalTranscriptionJobsParams {
  status?: string;
  jobNameContains?: string;
  maxResults?: number;
  nextToken?: string;
}

export interface CreateVocabularyParams {
  vocabularyName: string;
  languageCode: string;
  phrases?: string[];
  vocabularyFileUri?: string;
  tags?: Array<{ key: string; value: string }>;
}

export interface UpdateVocabularyParams {
  vocabularyName: string;
  languageCode: string;
  phrases?: string[];
  vocabularyFileUri?: string;
}

export interface ListVocabulariesParams {
  stateEquals?: string;
  nameContains?: string;
  maxResults?: number;
  nextToken?: string;
}

export interface CreateMedicalVocabularyParams {
  vocabularyName: string;
  languageCode: string;
  vocabularyFileUri: string;
  tags?: Array<{ key: string; value: string }>;
}

export interface UpdateMedicalVocabularyParams {
  vocabularyName: string;
  languageCode: string;
  vocabularyFileUri: string;
}

export interface ListMedicalVocabulariesParams {
  stateEquals?: string;
  nameContains?: string;
  maxResults?: number;
  nextToken?: string;
}

export interface CreateVocabularyFilterParams {
  vocabularyFilterName: string;
  languageCode: string;
  words?: string[];
  vocabularyFilterFileUri?: string;
  tags?: Array<{ key: string; value: string }>;
}

export interface UpdateVocabularyFilterParams {
  vocabularyFilterName: string;
  words?: string[];
  vocabularyFilterFileUri?: string;
}

export interface ListVocabularyFiltersParams {
  nameContains?: string;
  maxResults?: number;
  nextToken?: string;
}

export interface ListLanguageModelsParams {
  statusEquals?: string;
  nameContains?: string;
  maxResults?: number;
  nextToken?: string;
}
