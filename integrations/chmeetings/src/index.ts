import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContribution,
  createFamily,
  createPerson,
  createProfileNote,
  deleteContribution,
  deleteFamily,
  deletePerson,
  deleteProfileNote,
  getFamily,
  getGroupMembers,
  getPerson,
  listCampaigns,
  listContributions,
  listFamilies,
  listGroups,
  listOrganizations,
  listPeople,
  listPledges,
  listProfileNotes,
  manageFamilyMembers,
  manageGroupMembership,
  updatePerson,
  updateProfileNote
} from './tools';
import { contributionEvents, peopleEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listOrganizations,
    listPeople,
    getPerson,
    createPerson,
    updatePerson,
    deletePerson,
    listProfileNotes,
    createProfileNote,
    updateProfileNote,
    deleteProfileNote,
    listFamilies,
    getFamily,
    createFamily,
    deleteFamily,
    manageFamilyMembers,
    listGroups,
    getGroupMembers,
    manageGroupMembership,
    listContributions,
    createContribution,
    deleteContribution,
    listCampaigns,
    listPledges
  ],
  triggers: [peopleEvents, contributionEvents]
});
