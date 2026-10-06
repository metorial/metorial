import { Slate } from 'slates';
import { spec } from './spec';
import {
  createGroup,
  deleteCredential,
  deleteGroup,
  getCredential,
  getGroup,
  issueCredential,
  listDesigns,
  listGroups,
  searchCredentials,
  updateCredential,
  updateGroup
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    issueCredential,
    getCredential,
    updateCredential,
    deleteCredential,
    searchCredentials,
    createGroup,
    getGroup,
    updateGroup,
    deleteGroup,
    listGroups,
    listDesigns
  ],
  triggers: []
});
