import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteCallAnalyticsJob,
  deleteMedicalTranscriptionJob,
  deleteTranscriptionJob,
  getCallAnalyticsJob,
  getMedicalTranscriptionJob,
  getTranscriptionJob,
  listCallAnalyticsJobs,
  listLanguageModels,
  listMedicalTranscriptionJobs,
  listTranscriptionJobs,
  manageCallAnalyticsCategory,
  manageMedicalVocabulary,
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
    listCallAnalyticsJobs.build(),
    deleteCallAnalyticsJob.build(),
    startMedicalTranscriptionJob.build(),
    getMedicalTranscriptionJob.build(),
    listMedicalTranscriptionJobs.build(),
    deleteMedicalTranscriptionJob.build(),
    manageCallAnalyticsCategory.build(),
    manageVocabulary.build(),
    manageVocabularyFilter.build(),
    manageMedicalVocabulary.build(),
    listLanguageModels.build()
  ],
  triggers: [inboundWebhook, transcriptionJobStateChange.build()]
});
