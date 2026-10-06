import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCoupon,
  createProduct,
  deleteCoupon,
  deleteProduct,
  getAccount,
  listCoupons,
  redeemLicenseKey,
  refundLicenseKey,
  updateCoupon,
  updateProduct,
  verifyLicenseKey,
  verifySubscription
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createProduct,
    updateProduct,
    deleteProduct,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    listCoupons,
    verifyLicenseKey,
    redeemLicenseKey,
    refundLicenseKey,
    verifySubscription,
    getAccount
  ],
  triggers: []
});
