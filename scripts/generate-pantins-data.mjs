#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { JSDOM } from 'jsdom'

// ROOT = Répertoire où le script est exécuté (la racine de votre projet)
const ROOT = process.cwd();
const PANTINS_DIR = path.join(ROOT, "public", "assets", "pantins");

/**
 * Traduction de la fonction parse_number de Python.
 * Tente de convertir une chaîne en nombre.
 * Renvoie un nombre (int ou float) si c'est valide.
 * Renvoie la chaîne originale si ce n'est pas un nombre.
 * Renvoie null si la chaîne est vide ou null/undefined.
 */
function parseNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmedValue = String(value).trim();
  if (!trimmedValue) {
    return null;
  }
  
  const num = Number(trimmedValue);
  
  if (isNaN(num)) {
    return trimmedValue; // Renvoie la chaîne si ce n'est pas un nombre
  }
  
  // Number() gère "10" et "10.0" comme 10 (entier)
  // et "10.5" comme 10.5 (flottant)
  return num;
}

/**
 * Traduction de la fonction parse_bool de Python.
 */
function parseBool(value) {
  if (value === null || value === undefined) {
    return false;
  }
  const lowerValue = String(value).trim().toLowerCase();
  return ["1", "true", "yes"].includes(lowerValue);
}

/**
 * Génère le JSON pour un fichier SVG donné.
 */
function generateFor(svgPath) {
  const svgContent = fs.readFileSync(svgPath, 'utf-8');
  
  // Utiliser JSDOM pour analyser le SVG
  const dom = new JSDOM(svgContent, { contentType: 'image/svg+xml' });
  const root = dom.window.document.documentElement; // L'élément <svg>

  const members = [];
  const membersById = {};
  const variantGroups = [];
  const variantGroupLookup = {};

  /**
   * Fonction récursive pour parcourir le DOM SVG.
   */
  function traverse(element, currentMemberId = null) {
    let memberId = currentMemberId;

    // Détecter un nouveau membre
    if (element.getAttribute("data-membre") && element.getAttribute("id")) {
      memberId = element.getAttribute("id");
      const member = {
        id: memberId,
        name: memberId,
        parentId: element.getAttribute("data-parent") || "root",
        children: [],
        isBehindParent: parseBool(element.getAttribute("data-isbehindparent")),
      };
      members.push(member);
      membersById[memberId] = member;
    }

    // Détecter un groupe de variante
    const variantGroup = element.getAttribute("data-variant-groupe");
    if (variantGroup) {
      let variantName = element.getAttribute("data-variant-name") || element.getAttribute("id");
      
      // Logique pour le nom par défaut (correspondant au len(variant_groups) de Python)
      if (!variantName) {
        variantName = `${variantGroup}_${variantGroups.length}`;
      }
      
      const targetMemberId = memberId || variantGroup;
      const entry = {
        targetMemberId: targetMemberId,
        name: variantName,
        isDefault: parseBool(element.getAttribute("data-variant-default")),
        isBehindParent: parseBool(element.getAttribute("data-isbehindparent")),
      };

      let groupData = variantGroupLookup[variantGroup];
      if (!groupData) {
        groupData = {
          group: variantGroup,
          defaultVariantId: variantGroup,
          variants: [],
        };
        variantGroupLookup[variantGroup] = groupData;
        variantGroups.push(groupData);
      }
      groupData.variants.push(entry);
    }

    // Continuer la traversée
    for (const child of element.children) {
      traverse(child, memberId);
    }
  }

  traverse(root, null);

  // Lier les enfants aux parents après la traversée
  for (const member of members) {
    const parent = membersById[member.parentId];
    if (parent) {
      parent.children.push(member.id);
    }
  }

  // Trouver le membre racine
  const rootMember = members.find(m => m.parentId === "root");
  const rootMemberId = rootMember ? rootMember.id : null;

  // Construire la charge utile JSON
  const payload = {
    id: root.getAttribute("id") || path.basename(svgPath, '.svg'),
    source: `pantins/${path.basename(svgPath)}`,
    width: parseNumber(root.getAttribute("width")),
    height: parseNumber(root.getAttribute("height")),
    viewBox: root.getAttribute("viewBox"),
    rootMemberId: rootMemberId,
    members: members,
  };

  if (variantGroups.length > 0) {
    payload.variantGroups = variantGroups;
  }

  // Écrire le fichier JSON
  const outputPath = svgPath.replace('.svg', '.json');
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  
  return outputPath;
}

/**
 * Fonction principale
 */
function main() {
  if (!fs.existsSync(PANTINS_DIR)) {
    console.error("Aucun dossier pantins trouvé.");
    return 0;
  }

  const svgFiles = fs.readdirSync(PANTINS_DIR)
    .filter(file => file.endsWith('.svg'))
    .sort();

  if (svgFiles.length === 0) {
    console.error("Aucun fichier pantin .svg détecté.");
    return 0;
  }

  const generated = [];
  for (const svgFile of svgFiles) {
    const svgPath = path.join(PANTINS_DIR, svgFile);
    const generatedPath = generateFor(svgPath);
    generated.push(path.relative(ROOT, generatedPath));
  }

  console.log(`[pantins] ${generated.length} fiche(s) générée(s): ${generated.join(', ')}`);
  return 0;
}

// Exécuter le script
try {
    process.exit(main());
} catch (error) {
    console.error(error);
    process.exit(1);
}
