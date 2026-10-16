import { Slate } from 'slates';
import { spec } from './spec';
import {
  getOrderResult,
  orderFeedback,
  paymentFeedback,
  screenOrder,
  sendSmsVerification,
  verifyOtp
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    screenOrder,
    orderFeedback,
    getOrderResult,
    sendSmsVerification,
    verifyOtp,
    paymentFeedback
  ],
  triggers: []
});
