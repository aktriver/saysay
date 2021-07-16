import * as childProcess from "child_process";
import * as module from "module";
import * as path from "path";

// @ts-ignore
const require = module.createRequire(import.meta.url);

const chokidar = require("chokidar") as typeof import("chokidar");
const chalk = require("chalk") as typeof import("chalk");
const vite = require("vite") as typeof import("vite");
const esbuild = require("esbuild") as typeof import("esbuild");

const workDir = process.cwd();

const watchDirs = [path.join(workDir, "build", "main")];

const esbuildOptions: import("esbuild").BuildOptions = {
  entryPoints: ["src/main/index.ts", "src/main/preload.ts"],
  outdir: "build/main",
  bundle: true,
  platform: "node",
  target: "node14",
  external: ["electron"],
  format: "cjs",
  watch: true,
  sourcemap: "inline",
  outExtension: { ".js": ".cjs" },
};

const viteConfig: import("vite").InlineConfig = {
  configFile: path.join(workDir, "vite.config.ts"),
  server: {
    port: 3000,
  },
};

(async () => {
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

  const server = await vite.createServer(viteConfig);

  await server.listen();

  await esbuild.build(esbuildOptions);

  chokidar.watch(watchDirs).on("all", (event, path) => {
    console.log(chalk.yellow(`[${event}] ${path}`));
    restartElectron();
  });
})();
