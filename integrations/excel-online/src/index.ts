import { Slate } from 'slates';
import { spec } from './spec';
import {
  findWorkbooks,
  invokeFunction,
  manageCharts,
  manageNamedItems,
  manageSessions,
  manageTableColumns,
  manageTableRows,
  manageTables,
  manageWorksheets,
  readRange,
  sortFilterTable,
  writeRange
} from './tools';
import { inboundWebhook, workbookChanged } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    findWorkbooks,
    manageWorksheets,
    readRange,
    writeRange,
    manageTables,
    manageTableRows,
    manageTableColumns,
    sortFilterTable,
    manageCharts,
    manageNamedItems,
    invokeFunction,
    manageSessions
  ],
  triggers: [inboundWebhook, workbookChanged]
});
