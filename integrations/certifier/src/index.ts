import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCredential,
  createCredentialInteraction,
  createGroup,
  deleteCredential,
  deleteGroup,
  getCredential,
  getDesign,
  getGroup,
  issueCredential,
  listCredentialInteractions,
  listDesigns,
  listGroups,
  searchCredentials,
  updateCredential,
  updateGroup
} from './tools';
import { credentialEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createCredential,
    getCredential,
    updateCredential,
    deleteCredential,
    issueCredential,
    searchCredentials,
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
  triggers: [credentialEvent]
});
