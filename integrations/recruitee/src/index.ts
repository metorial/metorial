import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCandidate,
  createOffer,
  deleteCandidate,
  getCandidate,
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
import { candidateEvents, jobEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [candidateEvents, jobEvents]
});
