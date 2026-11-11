import * as esbuild from "esbuild";
await esbuild.build({
  entryPoints: ["index.ts"],
  bundle: true,
  format: "iife",
  globalName: "LU",
  target: "es2019",
  jsx: "automatic",
  alias: { "react/jsx-runtime": "./shim/jsx-runtime.ts", react: "./shim/react.ts" },
  outfile: "../build/lu.js",
  charset: "utf8",
  legalComments: "none",
});
console.log("built");
