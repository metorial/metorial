import { Slate } from 'slates';
import { spec } from './spec';
import {
  addRevenue,
  addSessionNote,
  executeTrigger,
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
    getLists,
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
