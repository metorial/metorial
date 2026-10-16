import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAudioBible,
  getAudioChapter,
  getBible,
  getBooks,
  getChapter,
  getFileUrl,
  getPassage,
  getSections,
  getVerse,
  listAudioBibles,
  listBibles,
  searchBible
} from './tools';

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
    getAudioChapter,
    getAudioBible,
    getFileUrl
  ],
  triggers: []
});
