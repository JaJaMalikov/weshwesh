import React, { useEffect, useState, useMemo } from 'react';
import useSceneStore from '../stores/useSceneStore';

function Pantin({ pantin, onPointerDown }) {
  const { id, members, source, x, y, rotation, scale, variantGroups, width, height, viewBox } = pantin;
  const [svgContent, setSvgContent] = useState(null);

  // Get child objects attached to this pantin's members
  const objects = useSceneStore((state) => state.objects);
  const childObjects = useMemo(() => objects.filter(obj => obj.parentObjectId === id), [objects, id]);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;

    fetch(`/assets/${source}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch SVG: ${res.statusText}`);
        return res.text();
      })
      .then((svgString) => {
        if (cancelled) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (!svg) return;

        // Préfixer tous les IDs avec l'ID unique du pantin pour éviter les conflits
        const uniquePrefix = `pantin-${id}-`;

        // Mettre à jour tous les éléments avec un attribut id
        const elementsWithId = svg.querySelectorAll('[id]');
        elementsWithId.forEach(element => {
          const oldId = element.getAttribute('id');
          const newId = uniquePrefix + oldId;
          element.setAttribute('id', newId);
        });

        // Mettre à jour toutes les références aux IDs (href, etc.)
        const elementsWithHref = svg.querySelectorAll('[href], [xlink\\:href]');
        elementsWithHref.forEach(element => {
          const href = element.getAttribute('href') || element.getAttribute('xlink:href');
          if (href && href.startsWith('#')) {
            const newHref = '#' + uniquePrefix + href.substring(1);
            if (element.hasAttribute('href')) {
              element.setAttribute('href', newHref);
            }
            if (element.hasAttribute('xlink:href')) {
              element.setAttribute('xlink:href', newHref);
            }
          }
        });

        // Mettre à jour les références url(#id) dans les attributs de style
        const attributesWithUrl = ['fill', 'stroke', 'clip-path', 'mask', 'filter', 'marker-start', 'marker-mid', 'marker-end'];
        const allElements = svg.querySelectorAll('*');
        allElements.forEach(element => {
          attributesWithUrl.forEach(attr => {
            const value = element.getAttribute(attr);
            if (value && value.includes('url(#')) {
              const newValue = value.replace(/url\(#([^)]+)\)/g, (match, id) => {
                return `url(#${uniquePrefix}${id})`;
              });
              element.setAttribute(attr, newValue);
            }
          });

          // Vérifier aussi l'attribut style
          const style = element.getAttribute('style');
          if (style && style.includes('url(#')) {
            const newStyle = style.replace(/url\(#([^)]+)\)/g, (match, id) => {
              return `url(#${uniquePrefix}${id})`;
            });
            element.setAttribute('style', newStyle);
          }
        });

        // Appliquer les rotations aux membres
        if (members) {
          members.forEach(member => {
            const prefixedMemberId = uniquePrefix + member.id;
            const memberElement = svg.querySelector(`[id="${prefixedMemberId}"]`);

            if (memberElement && member.rotation !== undefined) {
              // Récupérer le transform-origin existant ou calculer le centre
              const styleAttr = memberElement.getAttribute('style') || '';
              const originMatch = styleAttr.match(/transform-origin:\s*([^;]+)/);
              const transformOrigin = originMatch ? originMatch[1] : '50% 50%';

              // Appliquer la rotation
              const currentTransform = memberElement.getAttribute('transform') || '';
              const rotationTransform = `rotate(${member.rotation})`;

              // Si un transform existe déjà, le combiner, sinon créer un nouveau
              if (currentTransform) {
                memberElement.setAttribute('transform', `${currentTransform} ${rotationTransform}`);
              } else {
                memberElement.setAttribute('transform', rotationTransform);
              }

              // S'assurer que transform-origin est défini
              if (!originMatch) {
                memberElement.setAttribute('style', `${styleAttr} transform-origin: ${transformOrigin};`);
              }
            }
          });
        }

        // Gérer les variants et appliquer isBehindParent
        if (variantGroups && members) {
          for (const memberId in variantGroups) {
            const member = members.find(m => m.id === memberId);
            if (member) {
              const groupVariants = variantGroups[memberId].variants;
              const prefixedMemberId = uniquePrefix + memberId;
              const memberElement = svg.querySelector(`[id="${prefixedMemberId}"]`);

              // Chercher tous les éléments de ce groupe de variants
              const groupElements = svg.querySelectorAll(`[data-variant-groupe="${memberId}"]`);

              groupElements.forEach(variantElement => {
                const variantName = variantElement.getAttribute('data-variant-name');
                const isActive = variantName === member.activeVariant;

                // Afficher seulement le variant actif
                if (isActive) {
                  variantElement.style.display = 'block';

                  // Appliquer isBehindParent du variant actif sur le MEMBRE
                  // Si le variant définit isBehindParent, l'utiliser, sinon utiliser la valeur du membre
                  const variantConfig = groupVariants[variantName];
                  if (memberElement) {
                    const isBehind = variantConfig?.isBehindParent !== undefined
                      ? variantConfig.isBehindParent
                      : member.isBehindParent;

                    if (isBehind) {
                      memberElement.setAttribute('data-isbehindparent', 'true');
                    } else {
                      // Retirer l'attribut du membre ET de tous ses variants
                      memberElement.removeAttribute('data-isbehindparent');
                      // Retirer aussi des variants pour éviter qu'ils soient trouvés par querySelectorAll
                      memberElement.querySelectorAll('[data-isbehindparent]').forEach(el => {
                        el.removeAttribute('data-isbehindparent');
                      });
                    }
                  }
                } else {
                  variantElement.style.display = 'none';
                }
              });
            }
          }
        }

        // Appliquer isBehindParent aux membres sans variants
        if (members) {
          members.forEach(member => {
            // Ne traiter que les membres sans variants
            if (member.isBehindParent && !variantGroups?.[member.id]) {
              const prefixedMemberId = uniquePrefix + member.id;
              const memberElement = svg.querySelector(`[id="${prefixedMemberId}"]`);
              if (memberElement) {
                memberElement.setAttribute('data-isbehindparent', 'true');
              }
            }
          });
        }

        // Gérer l'ordre de rendu basé sur isBehindParent
        const reorderMembers = () => {
          const elementsWithBehind = svg.querySelectorAll('[data-isbehindparent="true"]');
          const processed = new Set();

          elementsWithBehind.forEach(element => {
            let memberElement = element;
            let memberId = element.getAttribute('id');
            let parentId = element.getAttribute('data-parent');

            // Si c'est un variant (pas d'id), remonter au membre parent
            if (!memberId && element.hasAttribute('data-variant-name')) {
              // C'est un variant, trouver le membre parent
              memberElement = element.closest('[data-membre="true"]');
              if (memberElement) {
                memberId = memberElement.getAttribute('id');
                parentId = memberElement.getAttribute('data-parent');
              }
            }

            if (!memberId || !parentId || parentId === 'root') return;
            if (processed.has(memberId)) return;

            processed.add(memberId);

            // Trouver l'élément parent avec le bon ID (préfixé)
            const prefixedParentId = uniquePrefix + parentId;
            const parentElement = svg.querySelector(`[id="${prefixedParentId}"]`);

            if (parentElement && parentElement.contains(memberElement)) {
              // Déplacer l'élément au début du parent (premier enfant = rendu en arrière)
              parentElement.insertBefore(memberElement, parentElement.firstChild);
            }
          });
        };

        reorderMembers();

        // Helper function to calculate cumulative rotation of a member
        const getCumulativeRotation = (memberId) => {
          let totalRot = 0;
          let currentId = memberId;

          while (currentId) {
            const member = members.find(m => m.id === currentId);
            if (!member) break;

            totalRot += member.rotation || 0;
            const parentId = member.parent || member.parentId;
            currentId = (parentId === 'root' || !parentId) ? null : parentId;
          }

          return totalRot;
        };

        // Insérer les objets enfants dans les membres parents
        childObjects.forEach(childObj => {
          if (!childObj.parentMemberId) return;

          const prefixedMemberId = uniquePrefix + childObj.parentMemberId;
          const memberElement = svg.querySelector(`[id="${prefixedMemberId}"]`);

          if (memberElement) {
            // Utiliser les coordonnées relatives (ou absolues si pas définies)
            const objX = childObj.relativeX ?? childObj.x;
            const objY = childObj.relativeY ?? childObj.y;

            // Créer un élément image ou utiliser le SVG de l'objet
            if (childObj.category === 'objets') {
              const image = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
              image.setAttribute('href', `/assets/${childObj.path}`);
              image.setAttribute('x', objX);
              image.setAttribute('y', objY);
              image.setAttribute('width', (childObj.width || 100) * childObj.scale);
              image.setAttribute('height', (childObj.height || 100) * childObj.scale);

              // Use only relativeRotation (already calculated at link time)
              const totalRotation = childObj.relativeRotation ?? 0;

              if (totalRotation !== 0) {
                const cx = objX + ((childObj.width || 100) * childObj.scale) / 2;
                const cy = objY + ((childObj.height || 100) * childObj.scale) / 2;
                image.setAttribute('transform', `rotate(${totalRotation} ${cx} ${cy})`);
              }

              image.setAttribute('data-child-object', 'true');
              image.setAttribute('data-child-object-id', childObj.id);
              memberElement.appendChild(image);
            }
          }
        });

        // Extraire le viewBox et les dimensions
        const svgViewBox = svg.getAttribute('viewBox') || viewBox;
        const svgWidth = parseFloat(svg.getAttribute('width')) || width;
        const svgHeight = parseFloat(svg.getAttribute('height')) || height;

        setSvgContent({
          innerHTML: svg.innerHTML,
          viewBox: svgViewBox,
          width: svgWidth,
          height: svgHeight,
        });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load pantin SVG:', err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [source, id, members, variantGroups, width, height, viewBox, childObjects]);

  if (!svgContent) {
    return null;
  }

  return (
    <svg
      x={x}
      y={y}
      width={svgContent.width * scale}
      height={svgContent.height * scale}
      viewBox={svgContent.viewBox || `0 0 ${svgContent.width} ${svgContent.height}`}
      transform={`rotate(${rotation} ${x + (svgContent.width * scale) / 2} ${y + (svgContent.height * scale) / 2})`}
      onPointerDown={onPointerDown}
      style={{ cursor: 'grab', overflow: 'visible' }}
      shapeRendering="geometricPrecision"
    >
      <g dangerouslySetInnerHTML={{ __html: svgContent.innerHTML }} />
    </svg>
  );
}

export default Pantin;
