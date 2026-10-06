# Digital Product Delivery API v2

Fourteen public tools preserve thirteen existing keys and add an authenticated API-status check. See [README](../README.md) for credential, paging, exact-value, verification and retained-effect behavior.

## Official references

- [API identity and hosted-site limitation](https://getdpd.com/docs/api/about.html)
- [Basic authentication](https://getdpd.com/docs/api/authentication.html)
- [Pagination and time zones](https://getdpd.com/docs/api/limits.html)
- [HTTP and JSON responses](https://getdpd.com/docs/api/response.html)
- [Ping and notification verification](https://getdpd.com/docs/api/general.html)
- [Storefronts](https://getdpd.com/docs/api/storefronts.html)
- [Products](https://getdpd.com/docs/api/products.html)
- [Purchases and reactivation](https://getdpd.com/docs/api/purchases.html)
- [Subscribers](https://getdpd.com/docs/api/subscribers.html)
- [Customers](https://getdpd.com/docs/api/customers.html)
- [Notification form fields](https://support.getdpd.com/hc/en-us/articles/201282853-IPN-Notification-URL)
- [Official PHP client](https://github.com/getdpd/getdpd-php)

The older PHP client confirms form-encoded POST transport, but its entitlement guidance differs from the API reference. Status is reported without an invented entitlement decision. The overview describes a read-only API while the detailed purchase reference explicitly documents reactivation; that narrow retained operation is supported with honest effects/readback limits.
