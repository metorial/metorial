import { Slate } from 'slates';
import { spec } from './spec';
import {
  getDocuments,
  getFileUrl,
  lookupCodes,
  searchAgencies,
  searchAwardees,
  searchContractAwards,
  searchContractVehicles,
  searchGrantAwards,
  searchNsn,
  searchOpportunities,
  searchPeople,
  searchPursuits,
  searchStateLocalContracts
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchNsn,
    searchPursuits,
    getFileUrl,
    searchOpportunities,
    searchContractAwards,
    searchGrantAwards,
    searchAwardees,
    searchPeople,
    getDocuments,
    searchAgencies,
    searchContractVehicles,
    lookupCodes,
    searchStateLocalContracts
  ],
  triggers: []
});
