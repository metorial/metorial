import { Slate } from 'slates';
import { spec } from './spec';
import {
  animatedEmoji,
  getGifs,
  randomGif,
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
    searchSuggestions,
    uploadGif,
    searchChannels
  ],
  triggers: []
});
