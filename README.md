# Hosby Client Library

A TypeScript library for easily interacting with REST APIs created on the **Hosby** platform. It supports full CRUD functionality and handles CSRF security to protect requests.

## Features

- **CRUD Operations**:
  - `GET` to retrieve data.
  - `POST` to create resources.
  - `PUT` and `PATCH` to update resources.
  - `DELETE` to remove resources.
- **Advanced Operations**:
  - Search by criteria (`bulkDelete`, `updateBy`).
  - Support for aggregation queries like `populate`.
  - Entry counting (`getCount`).
  - Bulk operations (`bulkInsert`, `bulkUpdate`).
- **CSRF Management**:
  - Secure initialization with a CSRF token.
- **Extensibility**:
  - Customize request options via parameters.

## Installation

Install the library via npm:

```bash
npm install hosby-client
```

Or with Yarn:

```bash
yarn add hosby-client
```

## Usage

### Import

```typescript
import { HosbyClient } from 'hosby-client';
```

### Initialization

```typescript
const client = new HosbyClient({
  baseURL: 'https://api.hosby.com',
  apiKey: 'your-api-key',
});

// Initialize the client (required to fetch the CSRF token)
await client.init();
```

### CRUD Operations

#### GET

```typescript
const data = await client.get('/workspace/project/tables', {
  limit: 10,
  page: 1,
}, {
  populate: ['foreignKey1', 'foreignKey2'],
});
```

#### POST

```typescript
const newEntry = await client.post('/workspace/project/tables', {
  name: 'New table',
  description: 'Table description',
});
```

#### PUT

```typescript
const updatedEntry = await client.put('/workspace/project/tables/123', {
  name: 'Updated name',
});
```

#### DELETE

```typescript
await client.delete('/workspace/project/tables', '123');
```

### Advanced Operations

#### Bulk Insert

```typescript
await client.bulkInsert('/workspace/project/tables', [
  { name: 'Table 1' },
  { name: 'Table 2' },
]);
```

#### Bulk Delete

```typescript
await client.bulkDelete('/workspace/project/tables', {
  createdBy: 'admin',
});
```

#### Entry Counting

```typescript
const count = await client.getCount('/workspace/project/tables', {
  status: 'active',
});
```

#### Existence Check

```typescript
const exists = await client.exists('/workspace/project/tables', {
  email: 'test@example.com',
});
```

## Tests

Tests are written with **Jest**. To run the tests:

```bash
npm test
```

## Contributions

Contributions are welcome! If you find a bug or want to propose a new feature, feel free to open an issue.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

**Hosby Client Library** – Simplify your backend integrations with Hosby!

