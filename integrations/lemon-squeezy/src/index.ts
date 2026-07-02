import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCheckoutTool,
  createDiscountTool,
  getOrderTool,
  listCustomersTool,
  listDiscountsTool,
  listLicenseKeysTool,
  listOrdersTool,
  listProductsTool,
  listStoresTool,
  listSubscriptionsTool,
  listVariantsTool,
  manageLicenseKeyTool,
  manageSubscriptionTool,
  refundOrderTool
} from './tools';
import {
  licenseKeyEventsTrigger,
  orderEventsTrigger,
  subscriptionEventsTrigger,
  subscriptionPaymentEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listStoresTool,
    listProductsTool,
    listVariantsTool,
    getOrderTool,
    listOrdersTool,
    refundOrderTool,
    createCheckoutTool,
    manageSubscriptionTool,
    listSubscriptionsTool,
    createDiscountTool,
    listDiscountsTool,
    listCustomersTool,
    manageLicenseKeyTool,
    listLicenseKeysTool
  ],
  triggers: [
    orderEventsTrigger,
    subscriptionEventsTrigger,
    subscriptionPaymentEventsTrigger,
    licenseKeyEventsTrigger
  ]
});
