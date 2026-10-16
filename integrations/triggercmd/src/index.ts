import { Slate } from 'slates';
import { spec } from './spec';
import {
  commandRunHistory,
  listCommands,
  listComputers,
  listPanelButtons,
  triggerCommand,
  triggerPanelButton
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    triggerCommand,
    listComputers,
    listCommands,
    commandRunHistory,
    listPanelButtons,
    triggerPanelButton
  ],
  triggers: []
});
