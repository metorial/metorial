import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDid,
  createProofRequest,
  createProofTemplate,
  createRegistry,
  createSchema,
  deleteDid,
  getCredential,
  getDid,
  getJob,
  getProofRequest,
  issueCredential,
  listCredentials,
  listDids,
  listProfiles,
  listProofTemplates,
  listRegistries,
  listSchemas,
  manageProfile,
  revokeCredential,
  verifyCredential
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createDid,
    listDids,
    getDid,
    deleteDid,
    issueCredential,
    listCredentials,
    getCredential,
    revokeCredential,
    createSchema,
    listSchemas,
    createRegistry,
    listRegistries,
    createProofTemplate,
    listProofTemplates,
    createProofRequest,
    getProofRequest,
    verifyCredential,
    manageProfile,
    listProfiles,
    getJob
  ],
  triggers: []
});
