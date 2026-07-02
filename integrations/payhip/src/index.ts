import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCoupon,
  getCoupon,
  listCoupons,
  manageLicense,
  updateLicenseUsage,
  verifyLicense
} from './tools';
import { paymentTrigger, subscriptionTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createCoupon,
    listCoupons,
    getCoupon,
    verifyLicense,
    manageLicense,
    updateLicenseUsage
  ],
  triggers: [paymentTrigger, subscriptionTrigger]
});
