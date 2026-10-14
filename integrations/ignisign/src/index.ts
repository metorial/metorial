import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSignatureRequest,
  createSignatureRequestInOneCall,
  createSigner,
  downloadDocument,
  getApplicationContext,
  getSignatureProof,
  getSignatureRequest,
  getSignatureRequestsStatus,
  getSigner,
  listSignatureProfiles,
  listSignatureRequests,
  listSignerProfiles,
  listSigners,
  manageDocument,
  manageSignatureRequest,
  sealDocument,
  updateSigner,
  uploadDocumentContent
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createSignatureRequest,
    createSignatureRequestInOneCall,
    downloadDocument,
    getSignatureRequestsStatus,
    getSignatureRequest,
    listSignatureRequests,
    manageSignatureRequest,
    createSigner,
    getSigner,
    listSigners,
    updateSigner,
    manageDocument,
    uploadDocumentContent,
    getSignatureProof,
    listSignatureProfiles,
    listSignerProfiles,
    sealDocument,
    getApplicationContext
  ],
  triggers: []
});
