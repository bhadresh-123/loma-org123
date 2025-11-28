#!/usr/bin/env node

/**
 * Server Entry Point
 * Loads environment configuration before importing the server
 */

// CRITICAL: Import express-async-errors FIRST to handle async middleware errors
import 'express-async-errors';

// Load environment configuration FIRST
import { loadEnvironmentConfig } from './utils/environment.js';
console.log('Loading environment configuration...');
loadEnvironmentConfig();
console.log('Environment loaded successfully');

// Run startup validation
// Import startup validation dynamically AFTER env is loaded to avoid hoisted ESM imports
const { runStartupValidation } = await import('./utils/startup-validation.js');
await runStartupValidation();

// Validate middleware before registering routes
const { ensureMiddlewareValid } = await import('./utils/middleware-validator.js');
ensureMiddlewareValid();

// Now dynamically import the server to ensure environment is loaded first
console.log('Starting server...');
await import('./index.js');
