import { Slate } from 'slates';
import { spec } from './spec';
import {
  addFact,
  addMessages,
  cloneGraph,
  deleteEpisode,
  exploreGraph,
  getContext,
  getUserThreads,
  manageOntology,
  manageThread,
  manageUser,
  searchGraph,
  setUserSummaryInstructions
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    manageUser,
    manageThread,
    addMessages,
    getContext,
    searchGraph,
    addFact,
    exploreGraph,
    manageOntology,
    deleteEpisode,
    cloneGraph,
    setUserSummaryInstructions,
    getUserThreads
  ],
  triggers: []
});
