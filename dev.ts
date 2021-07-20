/* eslint-disable @typescript-eslint/no-var-requires */

import * as childProcess from "child_process";
import * as module from "module";
import * as path from "path";
import * as url from "url";

const require = module.createRequire(import.meta.url);

const chokidar = require("chokidar") as typeof import("chokidar");
const chalk = require("chalk") as typeof import("chalk");
const vite = require("vite") as typeof import("vite");

const ROOT = path.dirname(url.fileURLToPath(import.meta.url));

(async () => {
  // build main process
  await vite.build({
    mode: "development",
    configFile: path.join(ROOT, "vite.config.main.ts"),
    build: { watch: {}, sourcemap: "inline" },
  });

  // build preload process
  await vite.build({
    mode: "development",
    configFile: path.join(ROOT, "vite.config.preload.ts"),
    build: { watch: {}, sourcemap: "inline" },
  });

  // serve renderer process
  const server = await vite.createServer({
    mode: "development",
    configFile: path.join(ROOT, "vite.config.renderer.ts"),
    server: {
      port: 3000,
    },
    build: { sourcemap: "inline" },
  });

  await server.listen();

  // wait for first build
  await new Promise((r) => setTimeout(r, 5000));

  let electronProcess: childProcess.ChildProcess | undefined;

  const restartElectron = () => {
    if (electronProcess && !electronProcess.killed) {
      electronProcess.kill();
      electronProcess = undefined;
    }

    electronProcess = childProcess.spawn("npm", ["start"], {
      stdio: "inherit",
    });
  };

  const watchDirs = [
    path.join(ROOT, "build", "main.cjs"),
    path.join(ROOT, "build", "preload.cjs"),
  ];

  chokidar.watch(watchDirs).on("all", (event, path) => {
    if (event !== "add" && event !== "change") return;

    // restart app when main/preload files are changed
    console.log(chalk.yellow(`[${event}] ${path}`));
    restartElectron();
  });
})();
