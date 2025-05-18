// Global mocks for browser environment in Node.js
global.window = {} as any;

// Import and setup fetch mock
import fetchMock from 'jest-fetch-mock';
fetchMock.enableMocks();

// Mock document object for cookie handling
global.document = {
  cookie: ''
} as any;

// Mock fetch API with default implementation
// This can be overridden in specific tests
global.fetch = jest.fn().mockImplementation((url, options) => {
  // Always log request headers for debugging
  console.log('Request Headers:', options?.headers);

  return Promise.resolve({
    ok: true,
    status: 200,
    headers: {
      get: jest.fn().mockImplementation((name) => {
        // Return a mock CSRF token when requested
        if (name === 'X-CSRF-Token-Hosby') {
          return 'mock-csrf-token-hosby';
        }
        return null;
      })
    },
    // Provide a default successful response with CSRF token in data
    json: async () => ({
      success: true,
      status: 200,
      message: 'CSRF token generated',
      data: { token: 'mock-csrf-token-hosby' }
    })
  });
});

// Mock FileReader if needed
class MockFileReader {
  onload: () => void = () => { };
  readAsDataURL(blob: Blob) {
    this.onload();
  }
  result = "data:image/png;base64,mockedBase64Data";
}

// Mock AbortController
class MockAbortController {
  signal = {};
  abort = jest.fn();
}

// Apply mock classes to global
global.FileReader = MockFileReader as any;
global.AbortController = MockAbortController as any;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock as any;

// Mock URL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Create a proper mock for CryptoJS with all expected properties
const mockCryptoJS = {
  SHA256: jest.fn().mockImplementation((data) => ({
    toString: jest.fn().mockReturnValue('mocked-hash')
  })),
  enc: {
    Hex: {},
    Base64: {},
    Utf8: {}
  },
  AES: {
    encrypt: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('encrypted-data')
    }),
    decrypt: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('decrypted-data')
    })
  },
  lib: {
    WordArray: {
      random: jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue('random-data')
      })
    }
  },
  mode: {
    CBC: {}
  },
  pad: {
    Pkcs7: {}
  }
};

// Mock JSEncrypt
jest.mock('jsencrypt', () => {
  const mockSetPrivateKey = jest.fn();
  const mockSign = jest.fn().mockImplementation((data, hashFunction, algorithm) => {
    // Ensure the mock properly handles the signature function with all parameters
    // This matches the usage in BaseClient.signWithPrivateKey
    if (typeof hashFunction === 'function') {
      hashFunction(data); // Call the hash function to ensure it's properly mocked
    }
    return 'mocked-signature';
  });

  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      return {
        setPrivateKey: mockSetPrivateKey,
        setPublicKey: jest.fn(),
        sign: mockSign,
        verify: jest.fn().mockReturnValue(true),
        encrypt: jest.fn().mockReturnValue('mocked-encrypted-data'),
        decrypt: jest.fn().mockReturnValue('mocked-decrypted-data')
      };
    })
  };
});

// Apply CryptoJS mock
jest.mock('crypto-js', () => mockCryptoJS);

// Mock formatPEM utility to ensure it works with the tests
jest.mock('../src/utils/formatPem', () => ({
  formatPEM: jest.fn().mockImplementation((keyData, type = 'PRIVATE KEY') => {
    // Simple implementation that mimics the real formatPEM function
    return `-----BEGIN ${type}-----\nmocked-formatted-key-content\n-----END ${type}-----`;
  })
}));
// Make CryptoJS available globally for any tests that need direct access
// @ts-ignore - Adding CryptoJS to global for testing purposes
global.CryptoJS = mockCryptoJS;
