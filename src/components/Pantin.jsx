import React, { useEffect, useState, useMemo } from 'react';
import useSceneStore from '../stores/useSceneStore';

function Pantin({ pantin, onPointerDown }) {
  const { id, members, source, x, y, rotation, scale, variantGroups, width, height, viewBox } = pantin;
  const [svgContent, setSvgContent] = useState(null);

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

        const uniquePrefix = `pantin-${id}-`;

        // --- Préfixes IDs et hrefs ---
        const elementsWithId = svg.querySelectorAll('[id]');
        elementsWithId.forEach(element => {
          const oldId = element.getAttribute('id');
          const newId = uniquePrefix + oldId;
          element.setAttribute('id', newId);
        });

        const elementsWithHref = svg.querySelectorAll('[href], [xlink\\:href]');
        elementsWithHref.forEach(element => {
          const href = element.getAttribute('href') || element.getAttribute('xlink:href');
          if (href && href.startsWith('#')) {
            const newHref = '#' + uniquePrefix + href.substring(1);
            if (element.hasAttribute('href')) element.setAttribute('href', newHref);
            if (element.hasAttribute('xlink:href')) element.setAttribute('xlink:href', newHref);
          }
        });

        const attributesWithUrl = ['fill', 'stroke', 'clip-path', 'mask', 'filter', 'marker-start', 'marker-mid', 'marker-end'];
        const allElements = svg.querySelectorAll('*');
        allElements.forEach(element => {
          attributesWithUrl.forEach(attr => {
            const value = element.getAttribute(attr);
            if (value && value.includes('url(#')) {
              const newValue = value.replace(/url\(#([^)]+)\)/g, (match, id) => `url(#${uniquePrefix}${id})`);
              element.setAttribute(attr, newValue);
            }
          });
          const style = element.getAttribute('style');
          if (style && style.includes('url(#')) {
            const newStyle = style.replace(/url\(#([^)]+)\)/g, (match, id) => `url(#${uniquePrefix}${id})`);
            element.setAttribute('style', newStyle);
          }
        });

        // --- Rotations Membres ---
        if (members) {
          members.forEach(member => {
            const prefixedMemberId = uniquePrefix + member.id;
            const memberElement = svg.querySelector(`[id="${prefixedMemberId}"]`);

            if (memberElement && member.rotation !== undefined) {
              const styleAttr = memberElement.getAttribute('style') || '';
              const originMatch = styleAttr.match(/transform-origin:\s*([^;]+)/);
              const transformOrigin = originMatch ? originMatch[1] : '50% 50%';

              const currentTransform = memberElement.getAttribute('transform') || '';
              const rotationTransform = `rotate(${member.rotation})`;

              if (currentTransform) {
                memberElement.setAttribute('transform', `${currentTransform} ${rotationTransform}`);
              } else {
                memberElement.setAttribute('transform', rotationTransform);
              }

              if (!originMatch) {
                memberElement.setAttribute('style', `${styleAttr} transform-origin: ${transformOrigin};`);
              }
            }
          });
        }

        // --- Variants ---
        if (variantGroups && members) {
          for (const memberId in variantGroups) {
            const member = members.find(m => m.id === memberId);
            if (member) {
              const groupVariants = variantGroups[memberId].variants;
              const prefixedMemberId = uniquePrefix + memberId;
              const memberElement = svg.querySelector(`[id="${prefixedMemberId}"]`);
              const groupElements = svg.querySelectorAll(`[data-variant-groupe="${memberId}"]`);

              groupElements.forEach(variantElement => {
                const variantName = variantElement.getAttribute('data-variant-name');
                const isActive = variantName === member.activeVariant;

                if (isActive) {
                  variantElement.style.display = 'block';
                  const variantConfig = groupVariants[variantName];
                  if (memberElement) {
                    const isBehind = variantConfig?.isBehindParent !== undefined
                      ? variantConfig.isBehindParent
                      : member.isBehindParent;

                    if (isBehind) {
                      memberElement.setAttribute('data-isbehindparent', 'true');
                    } else {
                      memberElement.removeAttribute('data-isbehindparent');
                      memberElement.querySelectorAll('[data-isbehindparent]').forEach(el => el.removeAttribute('data-isbehindparent'));
                    }
                  }
                } else {
                  variantElement.style.display = 'none';
                }
              });
            }
          }
        }

        if (members) {
          members.forEach(member => {
            if (member.isBehindParent && !variantGroups?.[member.id]) {
              const prefixedMemberId = uniquePrefix + member.id;
              const memberElement = svg.querySelector(`[id="${prefixedMemberId}"]`);
              if (memberElement) memberElement.setAttribute('data-isbehindparent', 'true');
            }
          });
        }

        const reorderMembers = () => {
          const elementsWithBehind = svg.querySelectorAll('[data-isbehindparent="true"]');
          const processed = new Set();
          elementsWithBehind.forEach(element => {
            let memberElement = element;
            let memberId = element.getAttribute('id');
            let parentId = element.getAttribute('data-parent');

            if (!memberId && element.hasAttribute('data-variant-name')) {
              memberElement = element.closest('[data-membre="true"]');
              if (memberElement) {
                memberId = memberElement.getAttribute('id');
                parentId = memberElement.getAttribute('data-parent');
              }
            }
            if (!memberId || !parentId || parentId === 'root') return;
            if (processed.has(memberId)) return;
            processed.add(memberId);
            
            const prefixedParentId = uniquePrefix + parentId;
            const parentElement = svg.querySelector(`[id="${prefixedParentId}"]`);
            if (parentElement && parentElement.contains(memberElement)) {
              parentElement.insertBefore(memberElement, parentElement.firstChild);
            }
          });
        };
        reorderMembers();

        // --- Calcul rotation statique ---
        const getHierarchyStaticRotation = (element, rootSvg) => {
          let totalRotation = 0;
          let current = element;
          while (current && current !== rootSvg && rootSvg.contains(current)) {
            const transform = current.getAttribute('transform');
            if (transform) {
              const rotateMatches = [...transform.matchAll(/rotate\s*\(\s*(-?\d+(?:\.\d+)?)/g)];
              rotateMatches.forEach(m => totalRotation += parseFloat(m[1]));
            }
            const style = current.getAttribute('style') || '';
            const transformStyleMatch = style.match(/transform\s*:\s*([^;]+)/);
            if (transformStyleMatch) {
              const cssRotateMatches = [...transformStyleMatch[1].matchAll(/rotate\s*\(\s*(-?\d+(?:\.\d+)?)(deg|rad)?\s*\)/g)];
              cssRotateMatches.forEach(m => {
                const val = parseFloat(m[1]);
                const unit = m[2];
                totalRotation += (unit === 'rad') ? val * (180 / Math.PI) : val;
              });
            }
            const id = current.getAttribute('id');
            if (id && id.startsWith(uniquePrefix)) {
              const memberId = id.replace(uniquePrefix, '');
              const member = members.find(m => m.id === memberId);
              if (member && member.rotation) totalRotation -= member.rotation;
            }
            current = current.parentElement;
          }
          return totalRotation;
        };

        // --- Insertion Objets Enfants ---
        childObjects.forEach(childObj => {
          if (!childObj.parentMemberId) return;

          const prefixedMemberId = uniquePrefix + childObj.parentMemberId;
          const memberElement = svg.querySelector(`[id="${prefixedMemberId}"]`);

          if (memberElement) {
            // Utilisation des coordonnées x/y (qui sont locales)
            const objX = childObj.x ?? 0;
            const objY = childObj.y ?? 0;

            if (childObj.category === 'objets') {
              const staticRotation = getHierarchyStaticRotation(memberElement, svg);
              const image = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
              
              image.setAttribute('href', `/assets/${childObj.path}`);
              image.setAttribute('x', objX);
              image.setAttribute('y', objY);
              image.setAttribute('width', (childObj.width || 100) * childObj.scale);
              image.setAttribute('height', (childObj.height || 100) * childObj.scale);

              const desiredRotation = childObj.rotation || 0;
              const compensationRotation = desiredRotation - staticRotation;

              if (compensationRotation !== 0) {
                const cx = objX + ((childObj.width || 100) * childObj.scale) / 2;
                const cy = objY + ((childObj.height || 100) * childObj.scale) / 2;
                image.setAttribute('transform', `rotate(${compensationRotation} ${cx} ${cy})`);
              }

              // Attribut critique pour la sélection
              image.setAttribute('data-child-object', 'true');
              image.setAttribute('data-child-object-id', childObj.id);
              
              memberElement.appendChild(image);
            }
          }
        });

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
        if (!cancelled) console.error('Failed to load pantin SVG:', err);
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
