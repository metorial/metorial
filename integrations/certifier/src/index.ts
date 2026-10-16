import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCredential,
  createCredentialInteraction,
  createGroup,
  deleteCredential,
  deleteGroup,
  getCredential,
  getCredentialDesigns,
  getDesign,
  getGroup,
  issueCredential,
  listCredentialInteractions,
  listDesigns,
  listGroups,
  searchCredentials,
  sendCredential,
  updateCredential,
  updateGroup
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createCredential,
    getCredential,
    getCredentialDesigns,
    updateCredential,
    deleteCredential,
    issueCredential,
    searchCredentials,
    sendCredential,
    createGroup,
    getGroup,
    updateGroup,
    deleteGroup,
    listGroups,
    listDesigns,
    getDesign,
    listCredentialInteractions,
    createCredentialInteraction
  ],
  triggers: []
});
