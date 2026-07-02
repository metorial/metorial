import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeSentiment,
  deleteJob,
  extractTopics,
  getAccount,
  getCaptions,
  getTranscript,
  getTranscriptionJob,
  identifyLanguage,
  listTranscriptionJobs,
  manageCustomVocabulary,
  submitTranscriptionJob
} from './tools';
import { jobCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    submitTranscriptionJob,
    getTranscriptionJob,
    getTranscript,
    listTranscriptionJobs,
    deleteJob,
    analyzeSentiment,
    extractTopics,
    identifyLanguage,
    manageCustomVocabulary,
    getCaptions,
    getAccount
  ],
  triggers: [jobCompleted]
});
