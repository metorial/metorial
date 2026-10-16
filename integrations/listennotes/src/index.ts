import { Slate } from 'slates';
import { spec } from './spec';
import {
  addPlaylistItem,
  batchFetch,
  bestPodcasts,
  createPlaylist,
  curatedLists,
  deletePlaylist,
  deletePodcast,
  getEpisode,
  getGenresAndRegions,
  getPlaylists,
  getPodcast,
  getPodcastsByDomain,
  getRecommendations,
  randomEpisode,
  removePlaylistItem,
  searchEpisodeTitles,
  searchPodcasts,
  submitPodcast,
  typeaheadSearch,
  updatePlaylist,
  updatePlaylistItem
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addPlaylistItem,
    updatePlaylistItem,
    removePlaylistItem,
    searchEpisodeTitles,
    getPodcastsByDomain,
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
  triggers: []
});
