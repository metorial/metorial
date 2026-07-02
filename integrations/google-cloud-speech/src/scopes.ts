import { anyOf } from 'slates';

export let googleCloudSpeechScopes = {
  cloudPlatform: 'https://www.googleapis.com/auth/cloud-platform',
  userinfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userinfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

let speechAccess = anyOf(googleCloudSpeechScopes.cloudPlatform);

export let googleCloudSpeechActionScopes = {
  transcribeAudio: speechAccess,
  batchTranscribeAudio: speechAccess,
  getOperation: speechAccess,
  createRecognizer: speechAccess,
  getRecognizer: speechAccess,
  listRecognizers: speechAccess,
  updateRecognizer: speechAccess,
  deleteRecognizer: speechAccess,
  synthesizeSpeech: speechAccess,
  listVoices: speechAccess
} as const;
