import { Slate } from 'slates';
import { spec } from './spec';
import {
  createQuery,
  evaluateContent,
  getContent,
  getRecommendations,
  importContent,
  listProjects,
  listQueries
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    createQuery,
    listQueries,
    getRecommendations,
    getContent,
    importContent,
    evaluateContent
  ],
  triggers: []
});
