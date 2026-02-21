# Gateway Directory

This directory contains the API Gateway implementation.

## Structure

```
gateway/
├── api-gateway/          # NestJS API Gateway service
│   ├── src/              # Source code
│   ├── package.json      # Dependencies
│   ├── .env.example      # Environment template
│   └── README.md         # Gateway documentation
└── notes.md              # Development notes
```

## Quick Start

Navigate to the api-gateway directory and follow the setup instructions:

```bash
cd api-gateway
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run start:dev
```

See `api-gateway/README.md` for detailed documentation.
