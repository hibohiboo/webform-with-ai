#!/usr/bin/env node
/**
 * Lambda Layer ビルドスクリプト
 * Layer用の依存関係をインストールし、正しいディレクトリ構造を作成する
 *
 * Lambda Layer のディレクトリ構造:
 * layers/deps/
 *   nodejs/
 *     node_modules/
 *       ulid/
 *       ...
 */
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";

const LAYER_DIR = path.resolve(__dirname, "../layers/deps");
const NODEJS_DIR = path.join(LAYER_DIR, "nodejs");

async function buildLayer(): Promise<void> {
  console.log("Building Lambda layer...");

  // nodejs ディレクトリを作成（既存の場合は削除して再作成）
  if (fs.existsSync(NODEJS_DIR)) {
    fs.removeSync(NODEJS_DIR);
  }
  fs.mkdirSync(NODEJS_DIR, { recursive: true });

  // package.json を nodejs ディレクトリにコピー
  const srcPackageJson = path.join(LAYER_DIR, "package.json");
  const destPackageJson = path.join(NODEJS_DIR, "package.json");
  fs.copyFileSync(srcPackageJson, destPackageJson);

  // npm install --omit=dev を実行
  console.log("Installing layer dependencies...");
  execSync("npm install --omit=dev", {
    cwd: NODEJS_DIR,
    stdio: "inherit",
  });

  // package.json と package-lock.json を削除（node_modules のみ残す）
  fs.removeSync(destPackageJson);
  const lockFile = path.join(NODEJS_DIR, "package-lock.json");
  if (fs.existsSync(lockFile)) {
    fs.removeSync(lockFile);
  }

  console.log("Lambda layer built successfully!");
}

buildLayer().catch((err) => {
  console.error("Failed to build layer:", err);
  process.exit(1);
});
