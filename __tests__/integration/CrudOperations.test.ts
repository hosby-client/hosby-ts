import { HosbyClient } from '../../src';
import fetchMock from 'jest-fetch-mock';

// Define sample interfaces for testing
interface User {
  id: string;
  name: string;
  email: string;
  active: boolean;
  profile?: {
    bio: string;
    avatar: string;
  };
}

interface UserCreate {
  name: string;
  email: string;
  active: boolean;
  profile?: {
    bio: string;
    avatar: string;
  };
}

describe('CRUD Operations Integration', () => {
  let client: HosbyClient;
  
  const mockConfig = {
    baseURL: 'https://api.example.com',
    privateKey: 'mock-private-key',
    apiKeyId: 'mock-api-key-id',
    projectId: 'mock-project-id',
    projectName: 'mock-project',
    userId: 'mock-user-id',
  };
  
  beforeAll(() => {
    fetchMock.enableMocks();
  });
  
  beforeEach(async () => {
    fetchMock.resetMocks();
    client = new HosbyClient(mockConfig);
    
    // Mock the CSRF token fetch for init with proper response format
    fetchMock.mockResponseOnce(JSON.stringify({
      success: true,
      status: 200,
      message: 'CSRF token generated',
      data: { token: 'mock-csrf-token' }
    }));
    
    // Initialize the client before each test
    await client.init();
    
    // Reset mock again so we have clean call history for the actual test
    fetchMock.resetMocks();
  });
  
  afterAll(() => {
    fetchMock.disableMocks();
  });
  
  describe('GET operations', () => {
    test('should find users and deserialize response', async () => {
      const mockUsers: User[] = [
        { 
          id: '1', 
          name: 'John Doe', 
          email: 'john@example.com', 
          active: true,
          profile: {
            bio: 'Software developer',
            avatar: 'avatar1.jpg'
          }
        },
        { 
          id: '2', 
          name: 'Jane Smith', 
          email: 'jane@example.com', 
          active: true 
        }
      ];
      
      // Mock the response for the users query
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 200,
        message: 'Users retrieved successfully',
        data: mockUsers
      }));
      
      // client is already initialized in beforeEach
      
      const response = await client.find<User[]>(
        'users',
        [{ field: 'active', value: true }],
        { limit: 10 }
      );
      
      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
      expect(response.data[0].name).toBe('John Doe');
      expect(response.data[0].profile?.bio).toBe('Software developer');
    });
    
    test('should find user by id', async () => {
      const mockUser: User = { 
        id: '1', 
        name: 'John Doe', 
        email: 'john@example.com', 
        active: true 
      };
      
      // Mock the response for findById query
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 200,
        message: 'User retrieved successfully',
        data: mockUser
      }));
      
      const response = await client.findById<User>(
        'users',
        [{ field: 'id', value: '1' }]
      );
      
      expect(response.success).toBe(true);
      expect(response.data.id).toBe('1');
      expect(response.data.name).toBe('John Doe');
      
      // Check that the request was made with the correct URL format and headers
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/mock-project/users/findById/?id=1",
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-api-key': 'mock-api-key-id_mock-project-id_mock-user-id',
            'x-signature': 'mocked-signature',
            'x-timestamp': expect.any(String),
            'X-CSRF-Token': 'mock-csrf-token'
          },
          'credentials': 'include',
          'mode': 'cors',
        }
      );
    });
    
    test('should handle not found error', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({
        success: false,
        status: 404,
        message: 'User not found',
        data: null
      }), { status: 404 });
      
      try {
        await client.findById<User>('users', [{ field: 'id', value: 'nonexistent' }]);
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toHaveProperty('success', false);
        expect(error).toHaveProperty('status', 404);
        expect(error).toHaveProperty('message', 'User not found');
      }
    });
  });
  
  describe('POST operations', () => {
    test('should create a new user', async () => {
      const newUser: UserCreate = {
        name: 'New User',
        email: 'new@example.com',
        active: true,
        profile: {
          bio: 'New user bio',
          avatar: 'new-avatar.jpg'
        }
      };
      
      const createdUser: User = {
        id: '3',
        ...newUser
      };
      
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 201,
        message: 'User created successfully',
        data: createdUser
      }));
      
      const response = await client.insertOne<User, UserCreate>(
        'users',
        newUser
      );
      
      expect(response.success).toBe(true);
      expect(response.status).toBe(201);
      expect(response.data.id).toBe('3');
      expect(response.data.name).toBe('New User');
      expect(response.data.profile?.bio).toBe('New user bio');
    });
    
    test('should upsert a user', async () => {
      const userData: UserCreate = {
        name: 'Updated User',
        email: 'existing@example.com',
        active: true
      };
      
      const upsertedUser: User = {
        id: '4',
        ...userData
      };
      
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 200,
        message: 'User upserted successfully',
        data: upsertedUser
      }));
      
      const response = await client.upsert<User, UserCreate>(
        'users',
        [{ field: 'email', value: 'existing@example.com' }],
        userData
      );
      
      expect(response.success).toBe(true);
      expect(response.data.id).toBe('4');
      expect(response.data.name).toBe('Updated User');
    });
  });
  
  describe('PUT operations', () => {
    test('should replace a user document', async () => {
      const replacementData: UserCreate = {
        name: 'Replaced User',
        email: 'user@example.com',
        active: true,
        profile: {
          bio: 'Updated bio',
          avatar: 'updated-avatar.jpg'
        }
      };
      
      const replacedUser: User = {
        id: '5',
        ...replacementData
      };
      
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 200,
        message: 'User replaced successfully',
        data: replacedUser
      }));
      
      const response = await client.replaceOne<User, UserCreate>(
        'users',
        [{ field: 'id', value: '5' }],
        replacementData
      );
      
      expect(response.success).toBe(true);
      expect(response.data.id).toBe('5');
      expect(response.data.name).toBe('Replaced User');
      expect(response.data.profile?.bio).toBe('Updated bio');
    });
  });
  
  describe('PATCH operations', () => {
    test('should update user fields', async () => {
      const updateData = {
        active: false,
        profile: {
          bio: 'Updated bio text'
        }
      };
      
      const updatedUser: User = {
        id: '6',
        name: 'Existing User',
        email: 'existing@example.com',
        active: false,
        profile: {
          bio: 'Updated bio text',
          avatar: 'existing-avatar.jpg'
        }
      };
      
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 200,
        message: 'User updated successfully',
        data: updatedUser
      }));
      
      const response = await client.updateOne<User>(
        'users',
        [{ field: 'id', value: '6' }],
        updateData
      );
      
      expect(response.success).toBe(true);
      expect(response.data.id).toBe('6');
      expect(response.data.active).toBe(false);
      expect(response.data.profile?.bio).toBe('Updated bio text');
    });
    
    test('should update multiple documents', async () => {
      const updateData = {
        active: false
      };
      
      const updateResult = {
        modifiedCount: 5
      };
      
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 200,
        message: '5 users updated successfully',
        data: updateResult
      }));
      
      const response = await client.updateMany<{ modifiedCount: number }>(
        'users',
        [{ field: 'role', value: 'guest' }],
        updateData
      );
      
      expect(response.success).toBe(true);
      expect(response.data.modifiedCount).toBe(5);
    });
  });
  
  describe('DELETE operations', () => {
    test('should delete a user by id', async () => {
      const deletedUser: User = {
        id: '7',
        name: 'User to Delete',
        email: 'delete@example.com',
        active: true
      };
      
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 200,
        message: 'User deleted successfully',
        data: deletedUser
      }));
      
      const response = await client.deleteOne<User>(
        'users',
        [{ field: 'id', value: '7' }]
      );
      
      expect(response.success).toBe(true);
      expect(response.data.id).toBe('7');
      expect(response.data.name).toBe('User to Delete');
    });
    
    test('should delete multiple users', async () => {
      const deleteResult = {
        deletedCount: 3
      };
      
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 200,
        message: '3 users deleted successfully',
        data: deleteResult
      }));
      
      const response = await client.deleteMany<{ deletedCount: number }>(
        'users',
        [{ field: 'active', value: false }]
      );
      
      expect(response.success).toBe(true);
      expect(response.data.deletedCount).toBe(3);
    });
  });
  
  describe('Advanced queries', () => {
    test('should find and populate related documents', async () => {
      interface Post {
        id: string;
        title: string;
        content: string;
        author: string | User;
      }
      
      const populatedPosts: Post[] = [
        {
          id: 'post1',
          title: 'First Post',
          content: 'Post content',
          author: {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            active: true
          }
        },
        {
          id: 'post2',
          title: 'Second Post',
          content: 'Another post content',
          author: {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            active: true
          }
        }
      ];
      
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 200,
        message: 'Posts retrieved successfully',
        data: populatedPosts
      }));
      
      const response = await client.find<Post[]>(
        'posts',
        [{ field: 'published', value: true }],
        { populate: ['author'] }
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.data[0].author).toHaveProperty('name');
      expect((response.data[0].author as User).email).toBe('john@example.com');
    });
    
    test('should perform aggregation', async () => {
      interface AggregateResult {
        _id: string;
        count: number;
        avgAge: number;
      }
      
      const aggregationResults: AggregateResult[] = [
        { _id: 'admin', count: 2, avgAge: 35 },
        { _id: 'user', count: 10, avgAge: 28 },
        { _id: 'guest', count: 5, avgAge: 31 }
      ];
      
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 200,
        message: 'Aggregation completed successfully',
        data: aggregationResults
      }));
      
      const response = await client.aggregate<AggregateResult[]>(
        'users',
        [{ field: 'active', value: true }]
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(3);
      expect(response.data[0]._id).toBe('admin');
      expect(response.data[0].count).toBe(2);
      expect(response.data[1].avgAge).toBe(28);
    });
    
    test('should get distinct values', async () => {
      const distinctRoles = ['admin', 'user', 'guest', 'moderator'];
      
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 200,
        message: 'Distinct values retrieved successfully',
        data: distinctRoles
      }));
      
      const response = await client.distinct<string[]>(
        'users',
        [{ field: 'role', value: 'user' }]
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(distinctRoles);
      expect(response.data).toContain('moderator');
    });
    
    test('should find documents with complex query filters', async () => {
      // Finding users with age greater than 30
      const mockUsers: User[] = [
        { id: '8', name: 'Older User 1', email: 'older1@example.com', active: true },
        { id: '9', name: 'Older User 2', email: 'older2@example.com', active: true }
      ];
      
      fetchMock.mockResponseOnce(JSON.stringify({
        success: true,
        status: 200,
        message: 'Users retrieved successfully',
        data: mockUsers
      }));
      
      const response = await client.findGreaterThan<User[]>(
        'users',
        [{ field: 'age', value: 30 }]
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.data[0].name).toContain('Older User');
    });
  });
});