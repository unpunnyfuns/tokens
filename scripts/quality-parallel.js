#!/usr/bin/env node

import { spawn } from "node:child_process";

const tasks = [
  ["Format", "npm", ["run", "format"]],
  ["Lint", "npm", ["run", "lint"]],
  ["TypeCheck", "npm", ["run", "typecheck"]],
  ["DepCheck", "npm", ["run", "depcheck"]],
  ["Test", "npm", ["run", "test"]],
  ["Validate Examples", "npm", ["run", "validate:examples"]],
  ["Test Bundler", "npm", ["run", "test:bundler"]],
  ["Validate Bundler Output", "npm", ["run", "validate:bundler-output"]],
];

function runTask([name, cmd, args]) {
  return new Promise((resolve) => {
    const start = Date.now();
    let output = "";

    const proc = spawn(cmd, args, { stdio: ["inherit", "pipe", "pipe"] });
    proc.stdout.on("data", (d) => {
      output += d;
    });
    proc.stderr.on("data", (d) => {
      output += d;
    });

    proc.on("close", (code) => {
      const time = ((Date.now() - start) / 1000).toFixed(2);
      const pass = code === 0;

      // Print with color
      const color = pass ? "\x1b[32m" : "\x1b[31m"; // green : red
      const reset = "\x1b[0m";
      console.log(
        `  ${color}${pass ? "PASS" : "FAIL"}${reset} ${name} (${time}s)`,
      );

      resolve({ name, pass, output });
    });
  });
}

async function main() {
  console.log("Running quality checks in parallel...\n");

  const start = Date.now();
  const results = await Promise.all(tasks.map(runTask));
  const time = ((Date.now() - start) / 1000).toFixed(2);

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);

  console.log(`\nTotal time: ${time}s`);
  console.log(`Passed: ${passed}/${tasks.length}`);

  if (failed.length > 0) {
    console.log("\nFailed tasks:");
    for (const { name, output } of failed) {
      console.log(`\n--- ${name} ---`);
      // Show more of the error output (last 50 lines instead of 20)
      const lines = output.trim().split("\n");
      console.log(lines.slice(-50).join("\n"));
      if (lines.length > 50)
        console.log(`... (${lines.length - 50} more lines)`);
    }
    process.exit(1);
  }

  console.log("\nAll checks passed!");
}

main().catch(console.error);
