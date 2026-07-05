#!/usr/bin/env node
// package.json 의 version 을 갱신한다.
//
// 사용법:
//   node scripts/bump-version.mjs 5.4.42     # 지정 버전으로 설정
//   node scripts/bump-version.mjs patch      # 현재 patch +1
//   node scripts/bump-version.mjs minor      # minor +1, patch=0
//   node scripts/bump-version.mjs major      # major +1, minor=patch=0
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = join(root, "package.json");

const SEMVER = /^\d+\.\d+\.\d+$/;

function nextVersion(current, arg) {
  if (SEMVER.test(arg)) return arg;
  const [maj, min, pat] = current.split(".").map((n) => parseInt(n, 10));
  if (arg === "patch") return `${maj}.${min}.${pat + 1}`;
  if (arg === "minor") return `${maj}.${min + 1}.0`;
  if (arg === "major") return `${maj + 1}.0.0`;
  throw new Error(`알 수 없는 인자: ${arg} (x.y.z | patch | minor | major)`);
}

const arg = process.argv[2];
if (!arg) {
  console.error("사용법: node scripts/bump-version.mjs <x.y.z|patch|minor|major>");
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const next = nextVersion(pkg.version, arg);

pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`버전 ${next} 로 갱신 완료 (package.json).`);
console.log(`다음: git add package.json && git commit -m "chore: 버전 ${next} bump"`);
