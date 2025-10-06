# AWS Infrastructure Code

This directory contains AWS CDK infrastructure code for the Ho Yu College Scratch Game Platform.

## Purpose

This folder houses all AWS-related backend code **excluding Lambda functions**. Lambda functions remain in the `/backend/lambda/` directory to maintain clear separation between infrastructure definitions and function implementations.

## Structure

```
aws/
├── lib/              # CDK stack definitions
│   └── backend-stack.ts  # Main infrastructure stack
└── bin/              # CDK app entry point (not used, entry is in /backend/bin/)
```

## Infrastructure Components

The `backend-stack.ts` file defines:

- **S3 Bucket**: Frontend static hosting
- **DynamoDB Tables**: Data storage for students, teachers, and games
- **API Gateway**: REST API endpoints
- **CloudFormation Outputs**: Exported values for use by Lambda functions

## Usage

This code is deployed via CDK commands run from the `/backend/` directory:

```bash
# From /backend/ directory
npm run build       # Compile TypeScript
npx cdk synth      # Generate CloudFormation template
npx cdk deploy     # Deploy to AWS
```

## Why This Organization?

- **Separation of Concerns**: Infrastructure as Code (IaC) is separated from application logic
- **Lambda Exclusion**: Lambda functions remain in `/backend/lambda/` as they contain application business logic, not infrastructure definitions
- **Maintainability**: Easier to locate and modify AWS resource configurations
- **Clear Boundaries**: Developers know where to find infrastructure vs. application code
