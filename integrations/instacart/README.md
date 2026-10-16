# <img src="logo.png" height="20"> Instacart

Create shoppable recipe and shopping-list pages, discover nearby retailers, and manage retailer delivery and pickup fulfillment.

The integration contains two separate API products:

- **Developer Platform:** recipe pages, shopping-list pages, and nearby retailers. Authenticate with a Developer Platform API key and choose its production or development environment.
- **Connect:** retailer customer lookup, address validation, store discovery, cart time slots, reservations, order creation, retrieval and cancellation, and sandbox batch progression. Authenticate with Connect client credentials and `connect:fulfillment`. If Instacart assigned a specific Connect server, enter its HTTPS origin during authentication. Existing connections continue to use the environment setting when no server was stored.

Developer Platform keys do not grant Connect access. Customers complete Developer Platform checkout on Instacart. Connect requires an approved retailer relationship. Post-checkout account access, account linking, advertising, catalog ingestion, and privacy APIs are outside the tools provided here.

Use `item.upc` or `item.rrc` for current Connect item identification. Original `productCodes` inputs remain available for existing workflows. Supply the delivery address when listing cart time slots. Pickup previews require the optional store code from Find Stores. Reserve a slot from the completed cart, then pass the hold ID to order creation. The list-all-orders branch and cart-validation reservation endpoint are deprecated upstream; prefer an explicit order ID and **Reserve Time Slot**. The old reservation tool is frozen to its prior behavior, including its legacy response mapping and environment routing.

See [API details](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
