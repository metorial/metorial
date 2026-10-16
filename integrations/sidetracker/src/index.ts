import { Slate } from 'slates';
import { spec } from './spec';
import {
  addRevenue,
  addSessionNote,
  createList,
  deleteList,
  executeTrigger,
  getConversions,
  getCurrentUser,
  getList,
  getListRow,
  getListRows,
  getLists,
  getSession,
  getSessions,
  manageListRow,
  updateSalesStatus,
  updateSessionMetadata
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    getConversions,
    getLists,
    getList,
    createList,
    deleteList,
    getListRow,
    getListRows,
    manageListRow,
    getSession,
    getSessions,
    updateSessionMetadata,
    addRevenue,
    updateSalesStatus,
    executeTrigger,
    addSessionNote
  ],
  triggers: []
});
