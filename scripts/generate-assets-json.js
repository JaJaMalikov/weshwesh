#!/usr/bin/env node
/* eslint-env node */
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const rootDir = process.cwd()
const assetsDir = path.resolve(rootDir, 'public', 'assets')
const manifestPath = path.resolve(assetsDir, 'assets-manifest.json')

const ASSET_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'json'])

function formatName(filename) {
  const base = path.parse(filename).name
  const normalized = base.replace(/[-_]+/g, ' ').trim().toLowerCase()
  if (!normalized) return base
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

async function collectAssets(currentDir) {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const collected = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.resolve(currentDir, entry.name)

    if (fullPath === manifestPath) continue

    if (entry.isDirectory()) {
      collected.push(...(await collectAssets(fullPath)))
      continue
    }

    if (!entry.isFile()) continue

    const relativePath = path
      .relative(assetsDir, fullPath)
      .replace(/\\/g, '/')
      .replace(/^\.?\/*/, '')

    if (!relativePath) continue

    const category = relativePath.split('/')[0] ?? ''
    const ext = path.extname(entry.name).slice(1).toLowerCase()

    if (ext && !ASSET_EXTENSIONS.has(ext)) continue

    collected.push({
      name: formatName(entry.name),
      path: relativePath,
      category,
      ext,
    })
  }

  return collected
}

function buildManifest(rawAssets) {
  const pantinConfigs = new Map()

  for (const asset of rawAssets) {
    if (asset.category === 'pantins' && asset.ext === 'json') {
      const base = asset.path.replace(/\.json$/i, '')
      pantinConfigs.set(base, asset.path)
    }
  }

  const manifest = []

  for (const asset of rawAssets) {
    if (asset.category === 'pantins' && asset.ext === 'json') continue

    const entry = {
      name: asset.name,
      path: asset.path,
      category: asset.category,
    }

    if (asset.category === 'pantins' && asset.ext === 'svg') {
      const base = asset.path.replace(/\.svg$/i, '')
      const configPath = pantinConfigs.get(base)
      if (configPath) entry.meta = configPath
    }

    manifest.push(entry)
  }

  manifest.sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category)
    if (categoryCompare !== 0) return categoryCompare
    return a.path.localeCompare(b.path)
  })

  return manifest
}

async function run() {
  await mkdir(assetsDir, { recursive: true })
  const rawAssets = await collectAssets(assetsDir)
  const manifest = buildManifest(rawAssets)

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(
    `[assets] Manifest mis à jour (${manifest.length} élément${
      manifest.length > 1 ? 's' : ''
    }) -> ${path.relative(rootDir, manifestPath)}`,
  )
}

run().catch((error) => {
  console.error('[assets] Échec de la génération du manifest')
  console.error(error)
  process.exitCode = 1
})
