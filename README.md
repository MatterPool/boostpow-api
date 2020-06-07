# Boost POW API Service

> Boost Proof of Work Protocol
> https://boostpow.com

Boost is a new type of content ranking system that enables users to increase the amount of energy required to mine or process their content. Users will boost their post as a way to signal to the network that they believe their information is valuable. Boosted posts will appear in the boost feed – ordered by the amount of energy requested for their information.

**Links**:

- <a href='https://github.com/matterpool/boostpow-js'>Javascript SDK: boostpow-js</a>
- <a href='https://github.com/matterpool/boostpow-api'>Standalone API Server: boostpow-api</a>
- <a href='https://media.bitcoinfiles.org/52fb4bedc85854638af61a7f906bf8e93da847d2ddb522b1aec53cfc6a0b2023'>Whitepaper</a>

## Installation

Requirements:
- Postgres 11+
- Node 10+

Tested on Ubuntu 16.04, 18.04 and OSX 10.14.4

NOTE: rename `.env.example` to `.env` for production and to `.env.test` for testing.

You must run the database migration to get started first.

```sh
# Install dependencies. Prefer yarn.
yarn install
npm install

# Production Prod build
yarn start build

# Start service
yarn start serve

```

### Database Migrations (Typeorm)

NOTE: Configure `.env.example` to `.env` for production and to `.env.test` for testing.

```sh
sudo yarn start db.migrate
```

### More Documentation (Migrations, etc)

Based off: https://github.com/w3tecch/express-typescript-boilerplate

