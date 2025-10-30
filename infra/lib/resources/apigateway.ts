import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { buildNameAndId } from '../utils/naming';

export interface ApiGatewayProps {
  loginLambda: lambda.Function;
  listGamesLambda: lambda.Function;
  gameClickLambda: lambda.Function;
  downloadStudentsLambda: lambda.Function;
  downloadTeachersLambda: lambda.Function;
  downloadGamesLambda: lambda.Function;
  uploadStudentsLambda: lambda.Function;
  uploadTeachersLambda: lambda.Function;
  uploadGamesLambda: lambda.Function;
}

export interface ApiGatewayResources {
  api: apigateway.RestApi;
}

/**
 * Create API Gateway and configure all endpoints
 */
export function createApiGateway(
  scope: Construct,
  props: ApiGatewayProps
): ApiGatewayResources {
  const {
    loginLambda,
    listGamesLambda,
    gameClickLambda,
    downloadStudentsLambda,
    downloadTeachersLambda,
    downloadGamesLambda,
    uploadStudentsLambda,
    uploadTeachersLambda,
    uploadGamesLambda,
  } = props;

  // API Gateway REST API
  const api = new apigateway.RestApi(scope, buildNameAndId('Api'), {
    restApiName: buildNameAndId('api'),
    description: 'API for Ho Yu College Scratch Game Platform',
    deployOptions: {
      stageName: 'prod',
    },
    defaultCorsPreflightOptions: {
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: apigateway.Cors.ALL_METHODS,
      allowHeaders: ['Content-Type', 'Authorization'],
    },
  });

  // Auth resource
  const authResource = api.root.addResource('auth');
  
  // POST /auth/login - User authentication
  authResource.addResource('login').addMethod(
    'POST',
    new apigateway.LambdaIntegration(loginLambda)
  );

  // Games resource
  const gamesResource = api.root.addResource('games');
  
  // GET /games - List all games
  gamesResource.addMethod(
    'GET',
    new apigateway.LambdaIntegration(listGamesLambda)
  );

  // Games download resource
  const gamesDownloadResource = gamesResource.addResource('download');
  
  // GET /games/download - Download games as Excel
  gamesDownloadResource.addMethod(
    'GET',
    new apigateway.LambdaIntegration(downloadGamesLambda)
  );

  // Game click tracking
  const gameResource = gamesResource.addResource('{gameId}');
  const clickResource = gameResource.addResource('click');

  // POST /games/{gameId}/click - Increment click count
  clickResource.addMethod(
    'POST',
    new apigateway.LambdaIntegration(gameClickLambda)
  );

  // Students resource
  const studentsResource = api.root.addResource('students');
  
  // Students download resource
  const studentsDownloadResource = studentsResource.addResource('download');
  
  // GET /students/download - Download students as Excel
  studentsDownloadResource.addMethod(
    'GET',
    new apigateway.LambdaIntegration(downloadStudentsLambda)
  );

  // Teachers resource
  const teachersResource = api.root.addResource('teachers');
  
  // Teachers download resource
  const teachersDownloadResource = teachersResource.addResource('download');
  
  // GET /teachers/download - Download teachers as Excel
  teachersDownloadResource.addMethod(
    'GET',
    new apigateway.LambdaIntegration(downloadTeachersLambda)
  );

  // Upload resource
  const uploadResource = api.root.addResource('upload');

  // Upload students
  const uploadStudentsResource = uploadResource.addResource('students');
  
  // POST /upload/students - Upload students Excel file
  uploadStudentsResource.addMethod(
    'POST',
    new apigateway.LambdaIntegration(uploadStudentsLambda)
  );

  // Upload teachers
  const uploadTeachersResource = uploadResource.addResource('teachers');
  
  // POST /upload/teachers - Upload teachers Excel file
  uploadTeachersResource.addMethod(
    'POST',
    new apigateway.LambdaIntegration(uploadTeachersLambda)
  );

  // Upload games
  const uploadGamesResource = uploadResource.addResource('games');
  
  // POST /upload/games - Upload games Excel file
  uploadGamesResource.addMethod(
    'POST',
    new apigateway.LambdaIntegration(uploadGamesLambda)
  );

  return {
    api,
  };
}
