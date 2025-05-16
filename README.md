# hosby-ts

![npm](https://img.shields.io/npm/v/hosby-ts)
![GitHub License](https://img.shields.io/github/license/hosby-client/hosby-ts)
![TypeScript](https://img.shields.io/badge/TypeScript-4.7%2B-blue)

TypeScript client library for consuming APIs created on the Hosby Backend-as-a-Service platform.

<div align="center">
  <img src="https://hosby.io/hosby.png" alt="Hosby Logo" width="200"/>
  <br/>
  <a href="https://docs.hosby.io">Documentation</a> | <a href="https://hosby.io/en">Platform</a>
</div>


## Features

- 🔒 **Secure Authentication**: RSA signature verification, CSRF protection, and JWT token management
- 🔄 **Complete CRUD Operations**: Comprehensive set of methods for creating, reading, updating, and deleting data
- 📊 **Advanced Querying**: Filter, sort, populate, and paginate your data with a simple interface
- 📘 **Strong TypeScript Support**: Fully typed API for better developer experience and code safety
- 🚀 **Modern JavaScript**: Built with modern JavaScript features and ES modules support

## Installation

```bash
# Using npm
npm install hosby-ts

# Using yarn
yarn add hosby-ts

# Using pnpm
pnpm add hosby-ts
```

## Quick Start

```typescript
import { HosbyClient } from 'hosby-ts';

// Create a client instance
const client = new HosbyClient({
  baseURL: 'https://api.hosby.io',
  privateKey: 'your-private-key',
  apiKeyId: 'your-api-key-id',
  projectName: 'your-project-name',
  projectId: 'your-project-id',
  userId: 'your-user-id'
});

// Initialize the client (required before making requests)
await client.init();

// Define your data types for type safety
interface User {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

// Example: Find active users
const response = await client.find<User[]>(
  'users',
  [{ field: 'active', value: true }],
  { limit: 10 }
);

if (response.success) {
  const users = response.data;
  console.log(`Found ${users.length} active users`);
} else {
  console.error(`Error: ${response.message}`);
}
```

## CRUD Operations

### Read Operations

```typescript
// Find multiple documents
const users = await client.find<User[]>('users');

// Find by ID
const user = await client.findById<User>(
  'users', 
  [{ field: 'id', value: '123456789' }]
);

// Find by email
const userByEmail = await client.findByEmail<User>(
  'users', 
  [{ field: 'email', value: 'user@example.com' }]
);

// Count documents
const count = await client.count<{ count: number }>(
  'users',
  [{ field: 'active', value: true }]
);
```

### Create Operations

```typescript
// Create a single document
const newUser = await client.insertOne<User>(
  'users',
  {
    name: 'John Doe',
    email: 'john@example.com',
    active: true
  }
);

// Create multiple documents
const newUsers = await client.insertMany<User[]>(
  'users',
  [
    { name: 'John', email: 'john@example.com', active: true },
    { name: 'Jane', email: 'jane@example.com', active: true }
  ]
);

// Upsert (create or update)
const upsertedUser = await client.upsert<User>(
  'users',
    { name: 'John Doe', email: 'john@example.com', active: true },
  [{ field: 'email', value: 'john@example.com' }]
);
```

### Update Operations

```typescript
// Update a document
const updatedUser = await client.updateOne<User>(
  'users',
  { active: false },
  [{ field: 'id', value: '123456789' }],
);

// Update multiple documents
const result = await client.updateMany<{ modifiedCount: number }>(
  'users',
  { active: false },
  [{ field: 'role', value: 'guest' }]
);

// Find and update
const foundAndUpdated = await client.findOneAndUpdate<User>(
  'users',
  { lastLoginDate: new Date() },
  [{ field: 'email', value: 'user@example.com' }],
);
```

### Delete Operations

```typescript
// Delete a document
const deletedUser = await client.deleteOne<User>(
  'users',
  [{ field: 'id', value: '123456789' }]
);

// Delete multiple documents
const deleteResult = await client.deleteMany<{ deletedCount: number }>(
  'users',
  [{ field: 'active', value: false }]
);

// Find and delete
const foundAndDeleted = await client.findOneAndDelete<User>(
  'users',
  [{ field: 'email', value: 'user@example.com' }]
);
```

## Advanced Usage

### Query Filters

```typescript
// Simple filter
[{ field: 'status', value: 'active' }]

// Multiple filters (AND condition)
[
  { field: 'role', value: 'admin' },
  { field: 'active', value: true }
]
```

### Query Options

```typescript
// Pagination
{ skip: 10, limit: 10 }

// Population of referenced fields
{ populate: ['author', 'comments'] }

// Advanced query with operators
{
  query: {
    createdAt: { $gt: '2023-01-01' },
    status: { $in: ['active', 'pending'] }
  }
}
```

### Secure Configuration

```typescript
import { createClient, SecureClientConfig } from 'hosby-ts';

const secureConfig: SecureClientConfig = {
  baseURL: 'https://api.hosby.io',
  privateKey: 'your-private-key',
  apiKeyId: 'your-api-key-id',
  projectName: 'your-project-name',
  projectId: 'your-project-id',
  userId: 'your-user-id',
  
  // Advanced security options
  httpsMode: 'strict',
  httpsExemptHosts: ['localhost', '127.0.0.1'],
  timeout: 5000,
  retryAttempts: 3
};

const client = createClient(secureConfig);
```

## API Response Format

All methods return a standardized response object:

```typescript
interface ApiResponse<T> {
  success: boolean;  // Whether the request was successful
  status: number;    // HTTP status code
  message: string;   // Response message
  data: T;           // Typed response data
}
```

## Error Handling

```typescript
try {
  const response = await client.find<User[]>('users');
  
  if (response.success) {
    // Handle successful response
    const users = response.data;
  } else {
    // Handle unsuccessful response
    console.error(`API Error: ${response.message} (${response.status})`);
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request