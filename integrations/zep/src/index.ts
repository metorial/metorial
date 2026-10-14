import { Slate } from 'slates';
import { spec } from './spec';
import {
  addFact,
  addGraphData,
  addMessages,
  cloneGraph,
  deleteEpisode,
  exploreGraph,
  getContext,
  getProject,
  getUserThreads,
  listUsers,
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
    getUserThreads,
    addGraphData,
    listUsers,
    getProject
  ],
  triggers: []
});
