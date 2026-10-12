# Spiral Sounds

Spiral Sounds is a simple online store for browsing and buying vinyl records. The app includes a searchable catalog with genre filters, user accounts, and a shopping cart stored in SQLite.

## Features

- Browse the vinyl catalog, search by title, artist, or genre, and filter by genre.
- Create an account and log in.
- Add products to the cart and view the item count.
- View and remove cart items or empty the entire cart.
- Pay for an order through Midtrans Snap. The cart is updated only after a verified payment notification.
- Store user accounts, catalog data, and cart items in SQLite.

## Tech Stack

- Node.js with Express 5
- SQLite using `sqlite` and `sqlite3`
- Cookie-based sessions with `express-session`
- HTML, CSS, and JavaScript

## Setup

Make sure Node.js and npm are installed. From the project directory, install the dependencies:

```bash
npm install
```

Create a `.env` file from the provided example:

```bash
cp .env.example .env
```

Set `SPIRAL_SESSION_SECRET` in `.env` to a strong random string. `PORT` is optional and defaults to `8000`.
Set the Midtrans keys from your [Midtrans dashboard](https://dashboard.midtrans.com/) and configure
`SPIRAL_USD_IDR_RATE` with the current number of Rupiah per US dollar. Keep sandbox mode enabled
while testing; switch `MIDTRANS_IS_PRODUCTION` to `true` only with production keys and a deployed
HTTPS notification URL configured in Midtrans.

```env
PORT=8000
SPIRAL_SESSION_SECRET=replace-with-a-strong-random-string
MIDTRANS_SERVER_KEY=your-midtrans-server-key
MIDTRANS_CLIENT_KEY=your-midtrans-client-key
MIDTRANS_IS_PRODUCTION=false
SPIRAL_USD_IDR_RATE=16000
```

### Initialize a new database

The app uses a `database.db` file in the project directory. If you don't already have a database and its tables, run these commands **once** from the project directory:

```bash
node sql/productTable/createTable.js
node sql/userTable/createTable.js
node sql/cartItemsTable/createTable.js
node sql/orderTable/createTable.js
node sql/productTable/seedTable.js
```

The last command populates the initial catalog. Do not rerun the cart table creation or catalog seeding commands on an already initialized database: the cart table script is not idempotent, and seeding will add the catalog data again.
Run `node sql/orderTable/createTable.js` once on existing databases to add payment orders and order items; this command is safe to rerun.

## Run the app

Start the app normally:

```bash
npm start
```

Start in development mode with automatic restarts:

```bash
npm run dev
```

Open [http://localhost:8000](http://localhost:8000), or use the port configured in `PORT`.

## API

Requests that send data use JSON. Login and registration use a session cookie; all cart endpoints require the user to be logged in.

| Method   | Endpoint               | Description                                                                                         |
| -------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/products`        | Get the catalog. Optional: `?genre=Rock` and/or `?search=artist` to filter and search.              |
| `GET`    | `/api/products/genres` | Get the list of genres.                                                                             |
| `POST`   | `/api/auth/register`   | Create an account. Body: `{ "name": "...", "email": "...", "username": "...", "password": "..." }`. |
| `POST`   | `/api/auth/login`      | Log in. Body: `{ "username": "...", "password": "..." }`.                                           |
| `GET`    | `/api/auth/logout`     | Log out and destroy the session.                                                                    |
| `GET`    | `/api/auth/me`         | Check login status and get the user's name if logged in.                                            |
| `POST`   | `/api/cart/add`        | Add one unit of a product. Body: `{ "productId": 1 }`. Requires login.                              |
| `GET`    | `/api/cart/cart-count` | Get the total number of units in the cart.                                                          |
| `GET`    | `/api/cart`            | Get the cart items. Requires login.                                                                 |
| `DELETE` | `/api/cart/:itemId`    | Remove a cart item by its ID. Requires login.                                                       |
| `DELETE` | `/api/cart/all`        | Empty the cart. Requires login.                                                                     |
| `GET`    | `/api/checkout/config` | Get the public Midtrans Snap configuration. Requires login.                                        |
| `POST`   | `/api/checkout`        | Create a pending order and Midtrans Snap transaction from the current cart. Requires login.        |
| `GET`    | `/api/checkout/:orderId`| Check the status of one of the logged-in user's orders. Requires login.                             |
| `POST`   | `/api/checkout/notification` | Receive Midtrans payment notifications; verify its signature before updating an order.         |

Configure `https://<your-domain>/api/checkout/notification` as the payment notification URL in Midtrans.
The catalog's existing `$` prices are treated as USD; each unit price is converted and rounded to whole
Rupiah using `SPIRAL_USD_IDR_RATE` when creating a payment. Never expose the server key in frontend code.

## Project structure

```text
.
├── controllers/   # Endpoint logic
├── db/            # SQLite connection
├── middleware/    # Authentication middleware
├── public/        # Frontend pages, assets, and JavaScript
├── routes/        # API route definitions
└── sql/           # Table creation scripts and catalog data
```

## Notes

- `database.db` and `.env` are not included in Git. Create your local database using the steps above.
- The default Express session store is intended for development; configure a persistent session store before running the app in production.
