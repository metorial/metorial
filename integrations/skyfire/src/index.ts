import { Slate } from 'slates';
import { spec } from './spec';
import {
  chargeToken,
  createToken,
  getTokenCharges,
  getWalletBalance,
  introspectToken,
  manageAgent,
  manageSellerService,
  searchServices
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    createToken,
    chargeToken,
    introspectToken,
    getWalletBalance,
    searchServices,
    getTokenCharges,
    manageSellerService,
    manageAgent
  ],
  triggers: []
});
