import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelAudiofile,
  downloadTranscript,
  getAudiofileStatus,
  getInvoice,
  getPrepayBalance,
  getWebhook,
  orderTranscription,
  retrieveTranscript,
  upgradeAudiofile
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    orderTranscription,
    getAudiofileStatus,
    retrieveTranscript,
    downloadTranscript,
    upgradeAudiofile,
    cancelAudiofile,
    getInvoice,
    getPrepayBalance,
    getWebhook
  ],
  triggers: []
});
