#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from './lib/backend-stack';

const app = new cdk.App();

// Get environment from context or environment variable
const env = app.node.tryGetContext('env') || process.env.ENVIRONMENT || 'prod';
const isLocal = env === 'dev' || env === 'local';

console.log(`Deploying in ${env} mode (isLocal: ${isLocal})`);

// For local development, skip actual deployment
// SAM Local will use template.yaml for local Lambda execution
if (isLocal) {
  console.log('Local development mode - CDK deployment skipped');
  console.log('Use "npm run sam:start" to start local API Gateway and Lambda');
  process.exit(0);
}

// For production deployment
new BackendStack(app, 'BackendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});