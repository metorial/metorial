import { anyOf } from 'slates';

// Gumroad OAuth scopes: https://gumroad.com/api#api-scopes
export let gumroadScope = {
  viewProfile: 'view_profile',
  editProducts: 'edit_products',
  viewSales: 'view_sales',
  markSalesAsShipped: 'mark_sales_as_shipped',
  editSales: 'edit_sales',
  viewPayouts: 'view_payouts',
  viewTaxData: 'view_tax_data',
  editEmails: 'edit_emails'
} as const;

export let gumroadActionScopes = {
  // Gumroad's public read endpoints (user, products, categories, reviews) accept any read
  // scope; edit_emails is excluded by Gumroad.
  read: anyOf(
    gumroadScope.viewProfile,
    gumroadScope.editProducts,
    gumroadScope.viewSales,
    gumroadScope.markSalesAsShipped,
    gumroadScope.editSales,
    gumroadScope.viewPayouts,
    gumroadScope.viewTaxData
  ),
  editProducts: anyOf(gumroadScope.editProducts),
  viewSales: anyOf(gumroadScope.viewSales),
  // mark_as_shipped needs mark_sales_as_shipped; refund, access, and receipt actions need edit_sales.
  manageSale: anyOf(gumroadScope.markSalesAsShipped, gumroadScope.editSales),
  viewPayouts: anyOf(gumroadScope.viewPayouts),
  viewTaxData: anyOf(gumroadScope.viewTaxData),
  editEmails: anyOf(gumroadScope.editEmails)
};
