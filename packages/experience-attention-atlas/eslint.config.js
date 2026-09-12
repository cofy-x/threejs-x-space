import config from "@threejs-x-space/config-eslint/react";

export default [
  ...config,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        AbortController: "readonly",
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
        URL: "readonly",
      },
    },
  },
];
