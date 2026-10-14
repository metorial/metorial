import { Slate } from 'slates';
import { spec } from './spec';
import {
  createQuery,
  evaluateContent,
  exportContent,
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
    exportContent,
    importContent,
    evaluateContent
  ],
  triggers: []
});
