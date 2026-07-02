Now let me get the specific Excel API permission scopes:Now I have enough information to write the specification.

# Slates Specification for Excel Online

## Overview

Excel Online is Microsoft's cloud-based spreadsheet service, accessible programmatically through the Microsoft Graph API. It allows reading and modifying Excel workbooks (.xlsx) stored in OneDrive for Business, SharePoint sites, or Group drives. The API exposes workbook resources including worksheets, ranges, tables, charts, named items, and Excel's built-in calculation functions.

## Authentication

Excel Online uses the **Microsoft Identity Platform (OAuth 2.0)** for authentication via the Microsoft Graph API.

**OAuth 2.0 Authorization Code Flow (Delegated Access):**

1. Register an application in the **Microsoft Entra admin center** (formerly Azure AD) to obtain:
   - **Application (client) ID**
   - **Client secret** (or certificate)
   - **Redirect URI**
2. Authorization endpoint: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
3. Token endpoint: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
4. The `{tenant}` value can be `common`, `organizations`, `consumers`, or a specific tenant ID.
5. All API calls require the `Authorization: Bearer {access-token}` header.

**Permission Scopes (Delegated):**

- `Files.Read` — Read-only access to the user's files (and thus Excel workbooks)
- `Files.ReadWrite` — Read and write access to the user's files
- `Files.Read.All` — Read all files the user can access
- `Files.ReadWrite.All` — Read and write all files the user can access
- `Sites.Read.All` / `Sites.ReadWrite.All` — For accessing workbooks stored in SharePoint sites

**Application Permissions (App-Only Access):**

Application permissions (`Files.ReadWrite.All`, `Sites.ReadWrite.All`) can be used for background/daemon scenarios to access files without a signed-in user. However, some Excel-specific write operations (e.g., writing to worksheet ranges) have limited or no support with app-only permissions. Delegated permissions are recommended for full Excel API functionality.

**Important Considerations:**

- Only workbooks stored on **business platforms** (OneDrive for Business, SharePoint) are supported. Personal OneDrive (consumer) is not supported by the Excel REST APIs.
- Only `.xlsx` (Office Open XML) files are supported; `.xls` files are not.

## Features

### Worksheet Management

Create, read, update, delete, and reorder worksheets within a workbook. You can list all worksheets, change their names, positions, and visibility.

### Range Operations

Read and write values, formulas, and number formats to arbitrary cell ranges within a worksheet. You can target specific cells, rows, columns, or rectangular ranges by address (e.g., `A1:C10`). Supports getting the used range of a worksheet to determine which cells contain data. Sorting ranges is also supported.

- Writing to unbounded ranges (e.g., entire columns like `A:A`) is not allowed.
- Very large ranges may fail due to resource limits.

### Table Management

Create, read, update, and delete structured tables within worksheets. You can manage table rows and columns (add, list, delete), apply sorting and filtering on table columns, convert tables back to plain ranges, and configure table styles.

- Filters support various criteria including custom operators (e.g., greater than, less than).

### Chart Operations

List, create, update, and delete charts within a worksheet. You can set chart source data, update chart properties (name, size, position), and retrieve chart images as base64-encoded strings for rendering outside Excel.

- Chart images can be retrieved with configurable width, height, and fitting mode.

### Named Items

Access workbook-level and worksheet-level named ranges and constants. Named items allow referencing specific ranges or values by friendly names.

### Workbook Functions

Invoke Excel's built-in calculation functions (e.g., PMT, VLOOKUP, SUM) remotely via the API. You pass function parameters and receive calculated results without needing to write values into cells. This gives access to Excel's full calculation engine as a service.

### Session Management

Optionally create workbook sessions for more efficient multi-call interactions. Sessions can be:

- **Persistent** — changes are saved to the file.
- **Non-persistent** — changes exist only for the session duration and are discarded on expiry, useful for analysis or calculations without modifying the source file.

Sessionless calls are also supported but less efficient for repeated operations.

## Events

Excel Online does not have dedicated webhook subscriptions for changes within workbook content (e.g., cell value changes or worksheet modifications). However, since Excel files are stored as DriveItems in OneDrive/SharePoint, you can subscribe to **DriveItem change notifications** via Microsoft Graph subscriptions to detect when an Excel file has been modified.

### DriveItem Change Notifications

Subscribe to changes on a drive root folder or subfolder to be notified when any file (including Excel workbooks) within the hierarchy is created, updated, or deleted.

- **Resource**: `drives/{drive-id}/root` or `/me/drive/root` (folder-level only; individual file subscriptions are not supported).
- **Change types supported**: `updated` only for drive root items.
- **Notification delivery**: Webhooks (HTTPS endpoint), Azure Event Hubs, or Azure Event Grid.
- Subscriptions must be periodically renewed before expiry.
- Notifications indicate _that_ a file changed, but do not include details about _what_ changed within the workbook. Use the Delta Query API to determine which specific files were modified.
