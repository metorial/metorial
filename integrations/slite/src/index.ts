import { Slate } from 'slates';
import { spec } from './spec';
import {
  askQuestion,
  auditKnowledgeBase,
  createNote,
  deleteNote,
  downloadNote,
  findUserOrGroup,
  getAskThread,
  getCurrentUser,
  getNote,
  listNotes,
  manageCustomContent,
  manageNoteLifecycle,
  searchNotes,
  updateNote,
  updateTile
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    createNote,
    getNote,
    updateNote,
    deleteNote,
    searchNotes,
    askQuestion,
    manageNoteLifecycle,
    updateTile,
    listNotes,
    findUserOrGroup,
    manageCustomContent,
    auditKnowledgeBase,
    getCurrentUser,
    downloadNote,
    getAskThread
  ],
  triggers: []
});
