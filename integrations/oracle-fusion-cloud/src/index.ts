import { Slate } from 'slates';
import { spec } from './spec';
import {
  financeTools,
  hcmTools,
  procurementTools,
  receivablesTools,
  scmTools,
  whoAmITool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    whoAmITool,
    ...Object.values(procurementTools),
    ...Object.values(financeTools),
    ...Object.values(receivablesTools),
    ...Object.values(hcmTools),
    ...Object.values(scmTools)
  ],
  triggers: []
});
