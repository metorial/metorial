import { Slate } from 'slates';
import { spec } from './spec';
import {
  createGroup,
  createSavedSearch,
  createSystem,
  deleteGroup,
  deleteSavedSearch,
  deleteSystem,
  getAccountUsage,
  getGroup,
  inviteUser,
  listArchives,
  listDestinations,
  listGroups,
  listSavedSearches,
  listSystems,
  listUsers,
  manageGroupMembership,
  removeUser,
  searchEvents,
  updateGroup,
  updateSavedSearch,
  updateSystem
} from './tools';
import { savedSearchAlert } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchEvents,
    listSystems,
    createSystem,
    updateSystem,
    deleteSystem,
    listGroups,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    manageGroupMembership,
    listSavedSearches,
    createSavedSearch,
    updateSavedSearch,
    deleteSavedSearch,
    listUsers,
    inviteUser,
    removeUser,
    listArchives,
    getAccountUsage,
    listDestinations
  ],
  triggers: [savedSearchAlert]
});
