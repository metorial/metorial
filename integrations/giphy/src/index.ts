import { Slate } from 'slates';
import { spec } from './spec';
import {
  animatedEmoji,
  createRandomId,
  getGifs,
  randomGif,
  registerAction,
  searchChannels,
  searchGifs,
  searchSuggestions,
  translateToGif,
  trendingContent,
  uploadGif
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    searchGifs,
    trendingContent,
    translateToGif,
    randomGif,
    getGifs,
    animatedEmoji,
    createRandomId,
    registerAction,
    searchSuggestions,
    uploadGif,
    searchChannels
  ],
  triggers: []
});
