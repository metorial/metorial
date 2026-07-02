import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSignatureRequest,
  createSigner,
  getApplicationContext,
  getSignatureProof,
  getSignatureRequest,
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
import {
  signatureEvents,
  signatureProofEvents,
  signatureRequestEvents,
  signerEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createSignatureRequest,
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
  triggers: [signatureRequestEvents, signatureEvents, signerEvents, signatureProofEvents]
});
