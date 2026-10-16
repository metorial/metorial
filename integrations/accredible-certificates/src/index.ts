import { Slate } from 'slates';
import { spec } from './spec';
import {
  createGroup,
  deleteCredential,
  deleteGroup,
  generateCredentialPdf,
  getCredential,
  getGroup,
  getIssuer,
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
    listDesigns,
    getIssuer,
    generateCredentialPdf
  ],
  triggers: []
});
