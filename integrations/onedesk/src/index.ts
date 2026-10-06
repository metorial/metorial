import { Slate } from 'slates';
import { spec } from './spec';
import {
  createItem,
  createMessage,
  createProject,
  createUser,
  getItem,
  getOrganization,
  searchItems,
  searchProjects,
  updateItem
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createItem,
    updateItem,
    getItem,
    searchItems,
    createProject,
    searchProjects,
    createMessage,
    createUser,
    getOrganization
  ],
  triggers: []
});
