module.exports = {
  testEnvironment: "node",
  testPathIgnorePatterns: [
    "\\\\.claude\\\\",
    "\\\\dist\\\\",
    "\\\\coverage\\\\",
    "/node_modules/",
  ],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  coverageThreshold: {
    "./src/domain/": {
      statements: 70,
      branches: 55,
      functions: 70,
      lines: 70,
    },
    "./src/hooks/": {
      statements: 19,
      branches: 15,
      functions: 10,
      lines: 19,
    },
    "./src/three/": {
      statements: 55,
      branches: 35,
      functions: 50,
      lines: 55,
    },
  },
};
