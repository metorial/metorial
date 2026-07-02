import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchFetch,
  bestPodcasts,
  curatedLists,
  deletePodcast,
  getEpisode,
  getGenresAndRegions,
  getPlaylists,
  getPodcast,
  getRecommendations,
  randomEpisode,
  searchPodcasts,
  submitPodcast,
  typeaheadSearch
} from './tools';
import { podcastSubmission } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchPodcasts,
    getPodcast,
    getEpisode,
    batchFetch,
    bestPodcasts,
    getRecommendations,
    curatedLists,
    typeaheadSearch,
    getPlaylists,
    submitPodcast,
    deletePodcast,
    getGenresAndRegions,
    randomEpisode
  ],
  triggers: [podcastSubmission]
});
