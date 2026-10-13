#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

node sql/productTable/createTable.js
node sql/productTable/seedTable.js
node sql/userTable/createTable.js
node sql/cartItemsTable/createTable.js
node sql/orderTable/createTable.js
node sql/orderTable/migrateStatus.js