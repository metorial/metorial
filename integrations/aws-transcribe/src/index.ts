import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteTranscriptionJob,
  getCallAnalyticsJob,
  getTranscriptionJob,
  listLanguageModels,
  listTranscriptionJobs,
  manageVocabulary,
  manageVocabularyFilter,
  startCallAnalyticsJob,
  startMedicalTranscriptionJob,
  startTranscriptionJob
} from './tools';
import { inboundWebhook, transcriptionJobStateChange } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    startTranscriptionJob.build(),
    getTranscriptionJob.build(),
    listTranscriptionJobs.build(),
    deleteTranscriptionJob.build(),
    startCallAnalyticsJob.build(),
    getCallAnalyticsJob.build(),
    startMedicalTranscriptionJob.build(),
    manageVocabulary.build(),
    manageVocabularyFilter.build(),
    listLanguageModels.build()
  ],
  triggers: [inboundWebhook, transcriptionJobStateChange.build()]
});
