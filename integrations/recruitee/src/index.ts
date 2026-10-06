import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCandidate,
  createOffer,
  deleteCandidate,
  deleteOffer,
  downloadCandidateFile,
  getCandidate,
  getCurrentIdentity,
  getOffer,
  listDepartmentsLocations,
  listDisqualifyReasons,
  listOffers,
  manageCandidateNotes,
  manageCandidateTags,
  managePipeline,
  searchCandidates,
  setCandidateCustomFields,
  updateCandidate,
  updateOffer
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentIdentity,
    deleteOffer,
    downloadCandidateFile,
    createCandidate,
    getCandidate,
    updateCandidate,
    deleteCandidate,
    searchCandidates,
    manageCandidateNotes,
    manageCandidateTags,
    setCandidateCustomFields,
    createOffer,
    getOffer,
    updateOffer,
    listOffers,
    managePipeline,
    listDepartmentsLocations,
    listDisqualifyReasons
  ],
  triggers: []
});
