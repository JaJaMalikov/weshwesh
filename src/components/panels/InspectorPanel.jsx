import useSceneStore from '../../stores/useSceneStore'
import { useMemo } from 'react'

function InspectorPanel() {
  const objects = useSceneStore((state) => state.objects)
  const selectedObjectId = useSceneStore((state) => state.selectedObjectId)
  const updateObject = useSceneStore((state) => state.updateObject)

  const selectedObject = useMemo(
    () => objects.find((obj) => obj.id === selectedObjectId),
    [objects, selectedObjectId]
  )

  const availablePantins = useMemo(
    () => objects.filter(obj => obj.category === 'pantins' && obj.id !== selectedObjectId),
    [objects, selectedObjectId]
  )

  const parentPantin = useMemo(
    () => selectedObject?.parentObjectId ? objects.find(obj => obj.id === selectedObject.parentObjectId) : null,
    [objects, selectedObject]
  )

  const handleUpdate = (prop, value) => {
    if (!selectedObjectId) return
    const numericValue = parseFloat(value)
    if (isNaN(numericValue)) return
    updateObject(selectedObjectId, { [prop]: numericValue })
  }

  const handleVariantChange = (memberId, variantName) => {
    if (!selectedObjectId || !selectedObject.members) return
    const updatedMembers = selectedObject.members.map(member => {
      if (member.id === memberId) {
        return { ...member, activeVariant: variantName }
      }
      return member
    })
    updateObject(selectedObjectId, { members: updatedMembers })
  }

  const handleMemberRotationChange = (memberId, rotation) => {
    if (!selectedObjectId || !selectedObject.members) return
    const rotationValue = parseFloat(rotation)
    if (isNaN(rotationValue)) return
    const updatedMembers = selectedObject.members.map(member => {
      if (member.id === memberId) {
        return { ...member, rotation: rotationValue }
      }
      return member
    })
    updateObject(selectedObjectId, { members: updatedMembers })
  }

  // Calcul de la rotation absolue d'un membre (pour la soustraction correcte)
  const getMemberAbsoluteRotation = (pantin, memberId) => {
    if (!pantin?.members) return 0
    let totalRotation = pantin.rotation || 0
    let currentMemberId = memberId
    while (currentMemberId) {
      const member = pantin.members.find(m => m.id === currentMemberId)
      if (!member) break
      totalRotation += member.rotation || 0
      const parentId = member.parent || member.parentId
      currentMemberId = (parentId === 'root' || !parentId) ? null : parentId
    }
    return totalRotation
  }

  // Utilitaire rotation point
  const rotatePoint = (x, y, angleDeg) => {
    const angleRad = (angleDeg * Math.PI) / 180
    return {
      x: x * Math.cos(angleRad) - y * Math.sin(angleRad),
      y: x * Math.sin(angleRad) + y * Math.cos(angleRad)
    }
  }

  const handleParentChange = (parentObjectId) => {
    if (!selectedObjectId || !selectedObject) return

    if (parentObjectId === 'none') {
      // Délier : On garde les coords actuelles, elles deviennent absolues (monde)
      // Note : Pour être exact, il faudrait appliquer la transformation inverse (Monde -> Local Pantin -> Monde)
      // mais ici on simplifie en gardant la position visuelle relative au dernier parent.
      updateObject(selectedObjectId, {
        parentObjectId: null,
        parentMemberId: null,
        relativeX: undefined, 
        relativeY: undefined,
        relativeRotation: undefined
      })
    } else {
      // Lier : Calcul des coordonnées dans le référentiel du Pantin (Racine)
      // On ne se soucie pas de la rotation du membre ici, c'est Pantin.jsx qui gère l'affichage.
      // On se soucie uniquement de placer l'objet correctement par rapport au cadre du Pantin.
      
      const parent = objects.find(obj => obj.id === parentObjectId)
      const firstMember = parent?.members?.[0]
      
      const parentScale = parent.scale || 1
      const parentRot = parent.rotation || 0
      const parentWidth = parent.width || 0
      const parentHeight = parent.height || 0

      // 1. Centre du pantin en monde
      const pantinCenterX = parent.x + (parentWidth * parentScale) / 2
      const pantinCenterY = parent.y + (parentHeight * parentScale) / 2

      // 2. Vecteur Objet -> Centre
      const dx = selectedObject.x - pantinCenterX
      const dy = selectedObject.y - pantinCenterY

      // 3. Déroter par rapport au Pantin global
      const unrotated = rotatePoint(dx, dy, -parentRot)

      // 4. Coordonnées locales dans le viewBox du Pantin
      const localX = (unrotated.x / parentScale) + parentWidth / 2
      const localY = (unrotated.y / parentScale) + parentHeight / 2

      // 5. Rotation : On stocke la rotation relative au membre
      const currentAbsRotation = selectedObject.rotation || 0
      const parentMemberAbsRotation = getMemberAbsoluteRotation(parent, firstMember?.id)
      const newLocalRotation = currentAbsRotation - parentMemberAbsRotation

      updateObject(selectedObjectId, {
        parentObjectId,
        parentMemberId: firstMember?.id || null,
        x: localX,
        y: localY,
        rotation: newLocalRotation,
        relativeX: undefined,
        relativeY: undefined,
        relativeRotation: undefined
      })
    }
  }

  const handleParentMemberChange = (parentMemberId) => {
    if (!selectedObjectId || !parentPantin) return

    // Ajustement rotation seulement
    const oldParentMemberId = selectedObject.parentMemberId
    const oldParentAbsRotation = getMemberAbsoluteRotation(parentPantin, oldParentMemberId)
    const currentObjectAbsRotation = oldParentAbsRotation + (selectedObject.rotation || 0)

    const newParentAbsRotation = getMemberAbsoluteRotation(parentPantin, parentMemberId)
    const newLocalRotation = currentObjectAbsRotation - newParentAbsRotation

    updateObject(selectedObjectId, {
      parentMemberId,
      rotation: newLocalRotation
    })
  }

  if (!selectedObject) {
    return <p>Aucun objet sélectionné.</p>
  }

  const isPantin = selectedObject.category === 'pantins' && selectedObject.variantGroups

  return (
    <div className="inspector-grid">
      <label>
        Position X
        <input
          type="number"
          value={Math.round(selectedObject.x)}
          onChange={(e) => handleUpdate('x', e.target.value)}
        />
      </label>
      <label>
        Position Y
        <input
          type="number"
          value={Math.round(selectedObject.y)}
          onChange={(e) => handleUpdate('y', e.target.value)}
        />
      </label>
      <label>
        Rotation
        <input
          type="number"
          value={Math.round(selectedObject.rotation)}
          onChange={(e) => handleUpdate('rotation', e.target.value)}
        />
      </label>
      <label>
        Échelle
        <input
          type="number"
          value={selectedObject.scale.toFixed(2)}
          onChange={(e) => handleUpdate('scale', e.target.value)}
          step="0.05"
          min="0"
        />
      </label>

      {!isPantin && availablePantins.length > 0 && (
        <>
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Parentage</h3>
          </div>
          <label>
            Lier au pantin
            <select
              value={selectedObject.parentObjectId || 'none'}
              onChange={(e) => handleParentChange(e.target.value)}
            >
              <option value="none">Aucun</option>
              {availablePantins.map(pantin => (
                <option key={pantin.id} value={pantin.id}>
                  {pantin.name}
                </option>
              ))}
            </select>
          </label>
          {parentPantin && parentPantin.members && (
            <label>
              Membre parent
              <select
                value={selectedObject.parentMemberId || ''}
                onChange={(e) => handleParentMemberChange(e.target.value)}
              >
                {parentPantin.members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}

      {isPantin && (
        <>
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Membres - Rotation</h3>
          </div>
          {selectedObject.members && selectedObject.members.map(member => (
            <label key={`rotation-${member.id}`}>
              {member.name}
              <input
                type="number"
                value={Math.round(member.rotation || 0)}
                onChange={(e) => handleMemberRotationChange(member.id, e.target.value)}
                step="5"
                min="-180"
                max="180"
              />
            </label>
          ))}

          <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Variants</h3>
          </div>
          {Object.keys(selectedObject.variantGroups).map(memberId => {
            const member = selectedObject.members.find(m => m.id === memberId)
            const variantGroup = selectedObject.variantGroups[memberId]
            const variants = Object.keys(variantGroup.variants)
            if (!member || variants.length === 0) return null
            return (
              <label key={memberId}>
                {member.name}
                <select
                  value={member.activeVariant || variantGroup.defaultVariant}
                  onChange={(e) => handleVariantChange(memberId, e.target.value)}
                >
                  {variants.map(variantName => (
                    <option key={variantName} value={variantName}>
                      {variantName}
                    </option>
                  ))}
                </select>
              </label>
            )
          })}
        </>
      )}
    </div>
  )
}

export default InspectorPanel
