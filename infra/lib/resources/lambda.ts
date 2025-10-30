import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { buildNameAndId } from '../utils/naming';

export interface LambdaFunctionsProps {
  studentsTable: dynamodb.Table;
  teachersTable: dynamodb.Table;
  gamesTable: dynamodb.Table;
}

export interface LambdaFunctions {
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

/**
 * Create Lambda functions for the application
 */
export function createLambdaFunctions(
  scope: Construct,
  props: LambdaFunctionsProps
): LambdaFunctions {
  const { studentsTable, teachersTable, gamesTable } = props;

  // Lambda function for authentication/login
  const loginLambda = new lambda.Function(scope, buildNameAndId('LoginFunction'), {
    functionName: buildNameAndId('login'),
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'auth/login.handler',
    code: lambda.Code.fromAsset('../backend/build/lambda'),
    environment: {
      STUDENTS_TABLE_NAME: studentsTable.tableName,
      TEACHERS_TABLE_NAME: teachersTable.tableName,
    },
    timeout: cdk.Duration.seconds(10),
  });

  // Grant login Lambda permissions to read students and teachers tables
  studentsTable.grantReadData(loginLambda);
  teachersTable.grantReadData(loginLambda);

  // Lambda function for listing games
  const listGamesLambda = new lambda.Function(scope, buildNameAndId('ListGamesFunction'), {
    functionName: buildNameAndId('list-games'),
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'games/list.handler',
    code: lambda.Code.fromAsset('../backend/build/lambda'),
    environment: {
      GAMES_TABLE_NAME: gamesTable.tableName,
    },
    timeout: cdk.Duration.seconds(10),
  });

  // Grant list games Lambda permission to read games table
  gamesTable.grantReadData(listGamesLambda);

  // Lambda function for game click tracking
  const gameClickLambda = new lambda.Function(scope, buildNameAndId('GameClickFunction'), {
    functionName: buildNameAndId('game-click'),
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'games/click.handler',
    code: lambda.Code.fromAsset('../backend/build/lambda'),
    environment: {
      GAMES_TABLE_NAME: gamesTable.tableName,
      STUDENTS_TABLE_NAME: studentsTable.tableName,
    },
    timeout: cdk.Duration.seconds(10),
  });

  // Grant Lambda permissions to read and update games and students tables
  gamesTable.grantReadWriteData(gameClickLambda);
  studentsTable.grantReadWriteData(gameClickLambda);

  // Lambda function for downloading students
  const downloadStudentsLambda = new lambda.Function(scope, buildNameAndId('DownloadStudentsFunction'), {
    functionName: buildNameAndId('download-students'),
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'download/students.handler',
    code: lambda.Code.fromAsset('../backend/build/lambda'),
    environment: {
      STUDENTS_TABLE_NAME: studentsTable.tableName,
    },
    timeout: cdk.Duration.seconds(30),
  });

  // Grant download students Lambda permission to read students table
  studentsTable.grantReadData(downloadStudentsLambda);

  // Lambda function for downloading teachers
  const downloadTeachersLambda = new lambda.Function(scope, buildNameAndId('DownloadTeachersFunction'), {
    functionName: buildNameAndId('download-teachers'),
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'download/teachers.handler',
    code: lambda.Code.fromAsset('../backend/build/lambda'),
    environment: {
      TEACHERS_TABLE_NAME: teachersTable.tableName,
    },
    timeout: cdk.Duration.seconds(30),
  });

  // Grant download teachers Lambda permission to read teachers table
  teachersTable.grantReadData(downloadTeachersLambda);

  // Lambda function for downloading games
  const downloadGamesLambda = new lambda.Function(scope, buildNameAndId('DownloadGamesFunction'), {
    functionName: buildNameAndId('download-games'),
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'download/games.handler',
    code: lambda.Code.fromAsset('../backend/build/lambda'),
    environment: {
      GAMES_TABLE_NAME: gamesTable.tableName,
    },
    timeout: cdk.Duration.seconds(30),
  });

  // Grant download games Lambda permission to read games table
  gamesTable.grantReadData(downloadGamesLambda);

  // Lambda function for uploading students
  const uploadStudentsLambda = new lambda.Function(scope, buildNameAndId('UploadStudentsFunction'), {
    functionName: buildNameAndId('upload-students'),
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'upload/students.handler',
    code: lambda.Code.fromAsset('../backend/build/lambda'),
    environment: {
      STUDENTS_TABLE_NAME: studentsTable.tableName,
      TEACHERS_TABLE_NAME: teachersTable.tableName,
    },
    timeout: cdk.Duration.minutes(5),
  });

  // Grant upload students Lambda permissions to read/write students and teachers tables
  studentsTable.grantReadWriteData(uploadStudentsLambda);
  teachersTable.grantReadData(uploadStudentsLambda);

  // Lambda function for uploading teachers
  const uploadTeachersLambda = new lambda.Function(scope, buildNameAndId('UploadTeachersFunction'), {
    functionName: buildNameAndId('upload-teachers'),
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'upload/teachers.handler',
    code: lambda.Code.fromAsset('../backend/build/lambda'),
    environment: {
      TEACHERS_TABLE_NAME: teachersTable.tableName,
    },
    timeout: cdk.Duration.minutes(5),
  });

  // Grant upload teachers Lambda permission to read/write teachers table
  teachersTable.grantReadWriteData(uploadTeachersLambda);

  // Lambda function for uploading games
  const uploadGamesLambda = new lambda.Function(scope, buildNameAndId('UploadGamesFunction'), {
    functionName: buildNameAndId('upload-games'),
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'upload/games.handler',
    code: lambda.Code.fromAsset('../backend/build/lambda'),
    environment: {
      GAMES_TABLE_NAME: gamesTable.tableName,
      STUDENTS_TABLE_NAME: studentsTable.tableName,
      TEACHERS_TABLE_NAME: teachersTable.tableName,
    },
    timeout: cdk.Duration.minutes(5),
  });

  // Grant upload games Lambda permissions to read/write games table and read students/teachers tables
  gamesTable.grantReadWriteData(uploadGamesLambda);
  studentsTable.grantReadData(uploadGamesLambda);
  teachersTable.grantReadData(uploadGamesLambda);

  return {
    loginLambda,
    listGamesLambda,
    gameClickLambda,
    downloadStudentsLambda,
    downloadTeachersLambda,
    downloadGamesLambda,
    uploadStudentsLambda,
    uploadTeachersLambda,
    uploadGamesLambda,
  };
}
