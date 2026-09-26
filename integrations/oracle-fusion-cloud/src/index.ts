import { Slate } from 'slates';
import { spec } from './spec';
import { financeTools, hcmTools, procurementTools, scmTools, whoAmITool } from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    whoAmITool,
    ...Object.values(procurementTools),
    ...Object.values(financeTools),
    ...Object.values(hcmTools),
    ...Object.values(scmTools)
  ],
  triggers: []
});
