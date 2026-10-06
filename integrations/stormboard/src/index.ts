import { Slate } from 'slates';
import { spec } from './spec';
import {
  createIdea,
  createStorm,
  getIdea,
  getStorm,
  getStormTemplate,
  getUserProfile,
  listIdeas,
  listStorms,
  manageChat,
  manageConnectors,
  manageParticipants,
  manageStormStatus,
  manageTags,
  updateStormSection
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listStorms,
    createStorm,
    getStorm,
    manageStormStatus,
    listIdeas,
    createIdea,
    getIdea,
    getStormTemplate,
    updateStormSection,
    manageConnectors,
    manageTags,
    manageChat,
    manageParticipants,
    getUserProfile
  ],
  triggers: []
});
