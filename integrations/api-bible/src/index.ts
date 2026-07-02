import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAudioChapter,
  getBible,
  getBooks,
  getChapter,
  getPassage,
  getSections,
  getVerse,
  listAudioBibles,
  listBibles,
  searchBible
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listBibles,
    getBible,
    getBooks,
    getChapter,
    getVerse,
    getPassage,
    searchBible,
    getSections,
    listAudioBibles,
    getAudioChapter
  ],
  triggers: [inboundWebhook]
});
