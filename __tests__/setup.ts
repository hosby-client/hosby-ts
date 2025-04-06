// Global mocks for browser environment in Node.js
global.window = {} as any;

// Mock fetch API
global.fetch = jest.fn();

// Mock FileReader if needed
class MockFileReader {
  onload: () => void = () => {};
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

// JSEncrypt mock
jest.mock('jsencrypt', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      setPrivateKey: jest.fn(),
      sign: jest.fn().mockReturnValue('mocked-signature')
    }))
  };
});