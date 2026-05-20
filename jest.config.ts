import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts'],
    collectCoverageFrom: ['src/**/*.ts'],
    coverageThreshold: {
        global: {
            lines: 80,
            functions: 80,
            branches: 75,
        },
    },
    clearMocks: true,
};

export default config;
