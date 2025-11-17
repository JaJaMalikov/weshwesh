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

  // Get available pantins for parenting
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
    // Ensure value is a number for numeric properties
    const numericValue = parseFloat(value)
    if (isNaN(numericValue)) return

    updateObject(selectedObjectId, { [prop]: numericValue })
  }

  const handleVariantChange = (memberId, variantName) => {
    if (!selectedObjectId || !selectedObject.members) return

    // Mettre à jour le membre avec le nouveau variant actif
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

    // Mettre à jour la rotation du membre
    const updatedMembers = selectedObject.members.map(member => {
      if (member.id === memberId) {
        return { ...member, rotation: rotationValue }
      }
      return member
    })

    updateObject(selectedObjectId, { members: updatedMembers })
  }

  // Calculate cumulative rotation of a member including all parent members
  const getCumulativeMemberRotation = (pantin, memberId) => {
    if (!pantin?.members) return 0

    let totalRotation = 0
    let currentMemberId = memberId

    // Traverse up the hierarchy
    while (currentMemberId) {
      const member = pantin.members.find(m => m.id === currentMemberId)
      if (!member) break

      totalRotation += member.rotation || 0
      // Check both 'parent' and 'parentId' for compatibility
      const parentId = member.parent || member.parentId
      currentMemberId = (parentId === 'root' || !parentId) ? null : parentId
    }

    return totalRotation
  }

  const handleParentChange = (parentObjectId) => {
    if (!selectedObjectId || !selectedObject) return

    if (parentObjectId === 'none') {
      // Unlink from parent - restore absolute coordinates
      const relativeX = selectedObject.relativeX ?? selectedObject.x
      const relativeY = selectedObject.relativeY ?? selectedObject.y
      updateObject(selectedObjectId, {
        parentObjectId: null,
        parentMemberId: null,
        x: relativeX,
        y: relativeY,
        relativeX: undefined,
        relativeY: undefined,
        relativeRotation: undefined
      })
    } else {
      // Link to parent - calculate relative coordinates
      const parent = objects.find(obj => obj.id === parentObjectId)
      const firstMember = parent?.members?.[0]

      // Calculate position relative to parent pantin
      const relativeX = selectedObject.x - (parent?.x || 0)
      const relativeY = selectedObject.y - (parent?.y || 0)

      // Calculate cumulative rotation of the member (including all parent members)
      const memberInitialRotation = getCumulativeMemberRotation(parent, firstMember?.id)

      // Calculate relative rotation: object's absolute rotation minus member's cumulative rotation
      // This ensures the object maintains its visual orientation when linked
      const relativeRotation = (selectedObject.rotation || 0) - memberInitialRotation

      updateObject(selectedObjectId, {
        parentObjectId,
        parentMemberId: firstMember?.id || null,
        relativeX,
        relativeY,
        relativeRotation,
        memberInitialRotation // Store member cumulative rotation at link time
      })
    }
  }

  const handleParentMemberChange = (parentMemberId) => {
    if (!selectedObjectId || !parentPantin) return

    // Calculate cumulative rotation of the new member
    const memberInitialRotation = getCumulativeMemberRotation(parentPantin, parentMemberId)

    updateObject(selectedObjectId, {
      parentMemberId,
      memberInitialRotation // Update member cumulative rotation reference
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
