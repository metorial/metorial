import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeSentiment,
  deleteJob,
  downloadCaptions,
  extractTopics,
  getAccount,
  getCaptions,
  getTranscript,
  getTranscriptionJob,
  identifyLanguage,
  listJobs,
  listTranscriptionJobs,
  manageCustomVocabulary,
  submitTranscriptionJob
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    submitTranscriptionJob,
    getTranscriptionJob,
    getTranscript,
    listTranscriptionJobs,
    listJobs,
    deleteJob,
    downloadCaptions,
    analyzeSentiment,
    extractTopics,
    identifyLanguage,
    manageCustomVocabulary,
    getCaptions,
    getAccount
  ],
  triggers: []
});
