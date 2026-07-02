import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCheckoutTool,
  createDiscountTool,
  getOrderTool,
  listCheckoutsTool,
  listCustomersTool,
  listDiscountRedemptionsTool,
  listDiscountsTool,
  listFilesTool,
  listLicenseKeysTool,
  listOrderItemsTool,
  listOrdersTool,
  listPricesTool,
  listProductsTool,
  listStoresTool,
  listSubscriptionInvoicesTool,
  listSubscriptionItemsTool,
  listSubscriptionsTool,
  listVariantsTool,
  listWebhooksTool,
  manageCustomerTool,
  manageDiscountTool,
  manageLicenseKeyTool,
  manageSubscriptionTool,
  manageWebhookTool,
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
    listPricesTool,
    listFilesTool,
    getOrderTool,
    listOrdersTool,
    listOrderItemsTool,
    refundOrderTool,
    createCheckoutTool,
    listCheckoutsTool,
    manageCustomerTool,
    listWebhooksTool,
    manageWebhookTool,
    manageSubscriptionTool,
    listSubscriptionsTool,
    listSubscriptionInvoicesTool,
    listSubscriptionItemsTool,
    createDiscountTool,
    manageDiscountTool,
    listDiscountsTool,
    listDiscountRedemptionsTool,
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
