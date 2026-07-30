import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'web',
      environment: 'jsdom',
      globals: true,
    },
    include: ['apps/web/**/*.test.ts', 'apps/web/**/*.test.tsx'],
  },
  {
    test: {
      name: 'packages-node',
      environment: 'node',
      globals: true,
    },
    include: [
      'packages/db/**/*.test.ts',
      'packages/auth/**/*.test.ts',
      'packages/permissions/**/*.test.ts',
    ],
  },
]);
