import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCustomerTool,
  getFormTool,
  getPaymentTool,
  listCustomersTool,
  listFormsTool,
  listPaymentsTool
} from './tools';
import { paymentCreatedTrigger, planEventTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listFormsTool,
    getFormTool,
    listPaymentsTool,
    getPaymentTool,
    listCustomersTool,
    getCustomerTool
  ],
  triggers: [paymentCreatedTrigger, planEventTrigger]
});
