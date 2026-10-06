import { Slate } from 'slates';
import { spec } from './spec';
import { commandRunHistory, listCommands, listComputers, triggerCommand } from './tools';

export let provider = Slate.create({
  spec,
  tools: [triggerCommand, listComputers, listCommands, commandRunHistory],
  triggers: []
});
