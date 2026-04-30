import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^expo-constants$': '<rootDir>/node_modules/expo/node_modules/expo-constants',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
  },
};

export default config;
