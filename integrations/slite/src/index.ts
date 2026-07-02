import { Slate } from 'slates';
import { spec } from './spec';
import {
  askQuestion,
  auditKnowledgeBase,
  createNote,
  deleteNote,
  findUserOrGroup,
  getNote,
  listNotes,
  manageCustomContent,
  manageNoteLifecycle,
  searchNotes,
  updateNote,
  updateTile
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

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
    auditKnowledgeBase
  ],
  triggers: [inboundWebhook]
});
