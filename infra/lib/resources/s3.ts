import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import { buildNameAndId } from '../utils/naming';

export interface S3ResourcesProps {
  removalPolicy?: cdk.RemovalPolicy;
}

export interface S3Resources {
  frontendBucket: s3.Bucket;
  distribution: cloudfront.Distribution;
  oac: cloudfront.CfnOriginAccessControl;
}

/**
 * Create S3 bucket and CloudFront distribution for frontend hosting
 */
export function createS3Resources(
  scope: Construct,
  props?: S3ResourcesProps
): S3Resources {
  const removalPolicy = props?.removalPolicy ?? cdk.RemovalPolicy.DESTROY;

  // S3 bucket for frontend static hosting
  const frontendBucket = new s3.Bucket(scope, buildNameAndId('FrontendBucket'), {
    bucketName: buildNameAndId('frontend'),
    publicReadAccess: false, // CloudFront will access via OAC
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    removalPolicy,
    autoDeleteObjects: true,
  });

  // CloudFront Origin Access Control for S3
  const oac = new cloudfront.CfnOriginAccessControl(scope, buildNameAndId('OAC'), {
    originAccessControlConfig: {
      name: buildNameAndId('frontend-oac'),
      originAccessControlOriginType: 's3',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
    },
  });

  // CloudFront distribution
  const distribution = new cloudfront.Distribution(scope, buildNameAndId('FrontendDistribution'), {
    defaultBehavior: {
      origin: new origins.S3Origin(frontendBucket),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    },
    defaultRootObject: 'index.html',
    errorResponses: [
      {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: cdk.Duration.minutes(5),
      },
      {
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: cdk.Duration.minutes(5),
      },
    ],
  });

  // Update bucket policy to allow CloudFront OAC access
  frontendBucket.addToResourcePolicy(
    new cdk.aws_iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [frontendBucket.arnForObjects('*')],
      principals: [new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com')],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Stack.of(scope).account}:distribution/${distribution.distributionId}`,
        },
      },
    })
  );

  return {
    frontendBucket,
    distribution,
    oac,
  };
}
