import { Slate } from 'slates';
import { spec } from './spec';
import {
  addMemory,
  deleteEntity,
  deleteMemory,
  getCurrentUser,
  getEvent,
  getMemory,
  listEntities,
  listMemories,
  searchMemories,
  updateMemory
} from './tools';

export let provider = Slate.create({
  spec,
  triggers: [],
  tools: [
    addMemory,
    searchMemories,
    getMemory,
    listMemories,
    updateMemory,
    deleteMemory,
    listEntities,
    deleteEntity,
    getCurrentUser,
    getEvent
  ]
});
