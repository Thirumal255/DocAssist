// mobile/api/index.ts

// 1. Export the client configuration
export * from './client';

// 2. Export all API modules
export * from './users';
export * from './patients';
export * from './appointments';
export * from './prescriptions'; 
export * from './availability';
export * from './visits';
export * from './medicines'; // Ensures medicinesApi is available for search
//export * from './auth';      // Uncommented as it's typically required