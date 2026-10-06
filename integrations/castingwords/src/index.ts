import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelAudiofile,
  getAudiofileStatus,
  getInvoice,
  getPrepayBalance,
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
    upgradeAudiofile,
    cancelAudiofile,
    getInvoice,
    getPrepayBalance
  ],
  triggers: []
});
