import { createRecord } from './tools/create-record';
import { deleteRecords } from './tools/delete-records';
import {
  getCustomViews,
  getModuleFields,
  getModuleLayouts,
  getModules,
  getRelatedLists
} from './tools/get-metadata';
import { getRecord } from './tools/get-record';
import { getRecords } from './tools/get-records';
import { getRelatedRecords } from './tools/get-related-records';
import { getUsers } from './tools/get-users';
import { createNote, deleteNote, listNotes } from './tools/manage-notes';
import {
  addTagsToRecords,
  createTag,
  listTags,
  removeTagsFromRecord
} from './tools/manage-tags';
import { searchRecords } from './tools/search-records';
import { updateRecord } from './tools/update-record';
import { upsertRecords } from './tools/upsert-records';

export let biginTools = [
  getRecords,
  searchRecords,
  getUsers,
  listTags,
  createTag,
  addTagsToRecords,
  removeTagsFromRecord,
  getRecord,
  upsertRecords,
  getModules,
  getModuleFields,
  getModuleLayouts,
  getCustomViews,
  getRelatedLists,
  createRecord,
  deleteRecords,
  listNotes,
  createNote,
  deleteNote,
  getRelatedRecords,
  updateRecord
];
