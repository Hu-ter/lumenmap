#!/usr/bin/env node

import { execSync } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ZIP_URL =
  "https://github.com/stellar-expert/public-directory/archive/refs/heads/master.zip";
const OUTPUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/directory.json",
);

const TAG_PRIORITY = [
  "exchange",
  "anchor",
  "issuer",
  "wallet",
  "defi",
  "custodian",
  "sdf",
];

function tagToCategory(tags) {
  if (!tags?.length) {
    return "account";
  }

  for (const tag of TAG_PRIORITY) {
    if (tags.includes(tag)) {
      return tag === "sdf" ? "foundation" : tag;
    }
  }

  return tags[0];
}

function recordToEntity(record) {
  const domain = record.domain?.replace(/^www\./, "");
  const name =
    record.name?.trim() ||
    (domain
      ? domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1)
      : record.address);

  return {
    name,
    category: tagToCategory(record.tags),
    protocol: domain ?? name,
  };
}

async function syncDirectoryFromGitHub() {
  const tmpDir = await mkdir(path.join(os.tmpdir(), "stellar-directory-sync"), {
    recursive: true,
  }).then(() => path.join(os.tmpdir(), "stellar-directory-sync"));

  const zipPath = path.join(tmpDir, "public-directory.zip");
  const extractDir = path.join(tmpDir, "extracted");

  console.log("Downloading Stellar Expert public directory...");
  execSync(`curl -fsSL "${ZIP_URL}" -o "${zipPath}"`, { stdio: "inherit" });
  execSync(`unzip -q -o "${zipPath}" -d "${extractDir}"`, { stdio: "inherit" });

  const accountsDir = path.join(
    extractDir,
    "public-directory-master",
    "accounts",
  );
  const files = await readdir(accountsDir);
  const directory = {};

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }

    const content = JSON.parse(
      await readFile(path.join(accountsDir, file), "utf8"),
    );

    if (!content.address) {
      continue;
    }

    directory[content.address] = recordToEntity(content);
  }

  await writeFile(OUTPUT, `${JSON.stringify(directory, null, 2)}\n`, "utf8");
  await rm(tmpDir, { recursive: true, force: true });

  console.log(`Wrote ${Object.keys(directory).length} entries to ${OUTPUT}`);
}

syncDirectoryFromGitHub().catch((error) => {
  console.error(error);
  process.exit(1);
});
