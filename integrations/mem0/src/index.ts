import { Slate } from 'slates';
import { spec } from './spec';
import {
  addMemory,
  deleteEntity,
  deleteMemory,
  getMemory,
  listEntities,
  listMemories,
  searchMemories,
  updateMemory
} from './tools';
import { memoryEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    addMemory,
    searchMemories,
    getMemory,
    listMemories,
    updateMemory,
    deleteMemory,
    listEntities,
    deleteEntity
  ],
  triggers: [memoryEvents]
});
