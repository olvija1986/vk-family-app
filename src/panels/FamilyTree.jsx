import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

// ===== Расчёт позиций узлов дерева (subtree layout) =====
function layoutTree(members) {
  if (!members.length) return { nodes: [], links: [], familyBoxes: [] }

  const byId = {}
  members.forEach(m => { byId[m.id] = m })

  const CARD_W = 112
  const CARD_H = 124
  const COUPLE_GAP = 22
  const SUBTREE_GAP = 36
  const LEVEL_GAP = 92
  const LEVEL_STEP = CARD_H + LEVEL_GAP

  // Находим пары (супруги)
  const coupleMap = {} // id → spouseId
  const inCouple = new Set()
  members.forEach(m => {
    if (m.spouseId && byId[m.spouseId] && !inCouple.has(m.id)) {
      coupleMap[m.id] = m.spouseId
      coupleMap[m.spouseId] = m.id
      inCouple.add(m.id)
      inCouple.add(m.spouseId)
    }
  })

  // Собираем детей каждой «ячейки» (пара или одиночка)
  // Ячейка = человек (+ супруг если есть)
  // Дети ячейки = те, у кого parent1Id или parent2Id совпадает с id ячейки
  function getChildren(unitIds) {
    return members.filter(m => {
      const p1 = m.parent1Id, p2 = m.parent2Id
      return unitIds.some(uid => uid === p1 || uid === p2)
    })
  }

  // Находим корни — те, у кого нет родителей в дереве
  const hasParent = new Set()
  members.forEach(m => {
    if (m.parent1Id && byId[m.parent1Id]) hasParent.add(m.id)
    if (m.parent2Id && byId[m.parent2Id]) hasParent.add(m.id)
  })

  // Корневые «ячейки» — только те, кто не является ребёнком и чей супруг тоже не ребёнок
  // Супруги детей НЕ корни — они часть ячейки своего партнёра
  const rootCouplesDone = new Set()
  const rootUnits = []

  members.forEach(m => {
    if (hasParent.has(m.id)) return
    if (rootCouplesDone.has(m.id)) return
    // Если супруг является ребёнком кого-то — не делаем корнем, он будет в поддереве
    if (coupleMap[m.id] && hasParent.has(coupleMap[m.id])) return

    rootCouplesDone.add(m.id)
    if (coupleMap[m.id]) {
      rootCouplesDone.add(coupleMap[m.id])
      rootUnits.push([m.id, coupleMap[m.id]])
    } else {
      rootUnits.push([m.id])
    }
  })

  const MAX_ROW = 4  // макс. ячеек в одной строке

  // Рекурсивно считаем ширину поддерева
  const subtreeWidth = {}
  const subtreeDepth = {}
  const subtreeCache = {}

  const keyFromUnit = (unitIds) => [...unitIds].sort().join('_')

  function calcMetrics(unitIds, stack = new Set()) {
    const key = keyFromUnit(unitIds)
    if (subtreeWidth[key] !== undefined) return { width: subtreeWidth[key], depth: subtreeDepth[key] }

    if (stack.has(key)) {
      const fallbackW = unitIds.length === 2 ? CARD_W * 2 + COUPLE_GAP : CARD_W
      subtreeWidth[key] = fallbackW
      subtreeDepth[key] = 1
      subtreeCache[key] = []
      return { width: fallbackW, depth: 1 }
    }

    const nextStack = new Set(stack)
    nextStack.add(key)

    const unitW = unitIds.length === 2 ? CARD_W * 2 + COUPLE_GAP : CARD_W

    const children = getChildren(unitIds)
    if (!children.length) {
      subtreeWidth[key] = unitW
      subtreeDepth[key] = 1
      subtreeCache[key] = []
      return { width: unitW, depth: 1 }
    }

    const childUnits = []
    const placed = new Set()
    children.forEach(c => {
      if (placed.has(c.id)) return
      placed.add(c.id)
      if (coupleMap[c.id] && !placed.has(coupleMap[c.id])) {
        placed.add(coupleMap[c.id])
        childUnits.push([c.id, coupleMap[c.id]])
      } else {
        childUnits.push([c.id])
      }
    })

    subtreeCache[key] = childUnits

    // Шахматная раскладка: разбиваем на строки по MAX_ROW
    const rows = []
    for (let i = 0; i < childUnits.length; i += MAX_ROW) {
      rows.push(childUnits.slice(i, i + MAX_ROW))
    }

    // Ширина = макс из ширин строк
    let maxRowW = 0
    rows.forEach(row => {
      let rowW = 0
      row.forEach((cu, i) => {
        if (i > 0) rowW += SUBTREE_GAP
        rowW += calcMetrics(cu, nextStack).width
      })
      if (rowW > maxRowW) maxRowW = rowW
    })

    let maxDepth = 1
    rows.forEach((row, ri) => {
      row.forEach((cu) => {
        const cuKey = keyFromUnit(cu)
        const childDepth = subtreeDepth[cuKey]
        const candidateDepth = 1 + ri + childDepth
        if (candidateDepth > maxDepth) maxDepth = candidateDepth
      })
    })

    subtreeWidth[key] = Math.max(unitW, maxRowW)
    subtreeDepth[key] = maxDepth
    return { width: subtreeWidth[key], depth: subtreeDepth[key] }
  }

  rootUnits.forEach(ru => calcMetrics(ru))

  // Раскладываем
  const nodes = []
  const nodePos = {}
  const links = []

  function placeUnit(unitIds, cx, level) {
    const key = keyFromUnit(unitIds)

    const y = level * LEVEL_STEP

    // Размещаем саму ячейку по центру
    if (unitIds.length === 2) {
      const x1 = cx - CARD_W - COUPLE_GAP / 2
      const x2 = cx + COUPLE_GAP / 2
      const m1 = byId[unitIds[0]], m2 = byId[unitIds[1]]
      nodePos[unitIds[0]] = { x: x1, y }
      nodePos[unitIds[1]] = { x: x2, y }
      nodes.push({ ...m1, x: x1, y, w: CARD_W, h: CARD_H })
      nodes.push({ ...m2, x: x2, y, w: CARD_W, h: CARD_H })
      links.push({
        type: 'spouse',
        x1: x1 + CARD_W, y1: y + CARD_H / 2,
        x2: x2, y2: y + CARD_H / 2,
      })
    } else {
      const x1 = cx - CARD_W / 2
      const m1 = byId[unitIds[0]]
      nodePos[unitIds[0]] = { x: x1, y }
      nodes.push({ ...m1, x: x1, y, w: CARD_W, h: CARD_H })
    }

    const childUnits = subtreeCache[key]
    if (!childUnits || !childUnits.length) return

    const parentBottomY = y + CARD_H

    // Разбиваем детей на строки по MAX_ROW
    const rows = []
    for (let i = 0; i < childUnits.length; i += MAX_ROW) {
      rows.push(childUnits.slice(i, i + MAX_ROW))
    }

    // Для каждой строки
    const allChildInfo = [] // {cx, cy} для линий

    rows.forEach((row, ri) => {
      // Ширина этой строки
      let rowW = 0
      row.forEach((cu, i) => {
        if (i > 0) rowW += SUBTREE_GAP
        rowW += subtreeWidth[keyFromUnit(cu)]
      })

      const chessOffset = ri % 2 === 1 ? Math.min(CARD_W * 0.55, rowW * 0.18) : 0
      let childX = cx - rowW / 2 + chessOffset
      const thisRowLevel = level + 1 + ri
      const thisRowY = thisRowLevel * LEVEL_STEP

      row.forEach((cu) => {
        const cuKey = keyFromUnit(cu)
        const cuW = subtreeWidth[cuKey]
        const childCx = childX + cuW / 2

        placeUnit(cu, childCx, thisRowLevel)
        allChildInfo.push({ cx: childCx, y: thisRowY })

        childX += cuW + SUBTREE_GAP
      })
    })

    // Рисуем линии
    const midY = parentBottomY + Math.min(LEVEL_GAP * 0.5, LEVEL_GAP - 14)

    // Вертикаль от родителей
    links.push({
      type: 'parent-child',
      points: [{ x: cx, y: parentBottomY }, { x: cx, y: midY }],
    })

    if (allChildInfo.length === 1) {
      const c = allChildInfo[0]
      if (cx !== c.cx) {
        links.push({ type: 'parent-child', points: [{ x: cx, y: midY }, { x: c.cx, y: midY }] })
      }
      links.push({ type: 'parent-child', points: [{ x: c.cx, y: midY }, { x: c.cx, y: c.y }] })
    } else {
      // Горизонтальная перекладина
      const allCx = allChildInfo.map(c => c.cx)
      const leftX = Math.min(...allCx, cx)
      const rightX = Math.max(...allCx, cx)
      links.push({
        type: 'parent-child',
        points: [{ x: leftX, y: midY }, { x: rightX, y: midY }],
      })
      // Вертикали к каждому ребёнку
      allChildInfo.forEach(c => {
        links.push({
          type: 'parent-child',
          points: [{ x: c.cx, y: midY }, { x: c.cx, y: c.y }],
        })
      })
    }
  }

  // Размещаем все корневые ячейки
  let rx = 0
  rootUnits.forEach((ru) => {
    const ruKey = keyFromUnit(ru)
    const ruW = subtreeWidth[ruKey]
    const rcx = rx + ruW / 2
    placeUnit(ru, rcx, 0)
    rx += ruW + SUBTREE_GAP * 2
  })

  return { nodes, links, familyBoxes: [] }
}

// ===== SVG Линии =====
function TreeLinks({ links }) {
  return (
    <svg className="tree-svg" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {links.map((link, i) => {
        if (link.type === 'spouse') {
          return (
            <g key={`s${i}`}>
              <line
                x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2}
                stroke="#ccc" strokeWidth={2.5}
              />
              <text
                x={(link.x1 + link.x2) / 2}
                y={(link.y1 + link.y2) / 2 - 6}
                textAnchor="middle" fontSize="12">❤️</text>
            </g>
          )
        }
        if (link.type === 'parent-child' && link.points) {
          const d = link.points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
          return (
            <path key={`p${i}`} d={d}
              fill="none" stroke="#bbb" strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
            />
          )
        }
        return null
      })}
    </svg>
  )
}

// ===== Карточка =====
function MemberCard({ node, onClick }) {
  return (
    <div className="tree-card" style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
      onClick={() => onClick(node)}>
      <div className="tree-card-emoji">{node.emoji}</div>
      <div className="tree-card-name">{node.name}</div>
      <div className="tree-card-relation">{node.relation}</div>
    </div>
  )
}

// ===== Мини-карта =====
function Minimap({ nodes, links, viewport, onClick, onClose }) {
  const MINI_W = 150
  const MINI_H = 100
  const PAD = 20

  if (!nodes.length) return null

  const minX = Math.min(...nodes.map(n => n.x)) - PAD
  const minY = Math.min(...nodes.map(n => n.y)) - PAD
  const maxX = Math.max(...nodes.map(n => n.x + n.w)) + PAD
  const maxY = Math.max(...nodes.map(n => n.y + n.h)) + PAD
  const treeW = maxX - minX || 1
  const treeH = maxY - minY || 1

  const scale = Math.min(MINI_W / treeW, MINI_H / treeH)

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / scale + minX
    const my = (e.clientY - rect.top) / scale + minY
    onClick(mx, my)
  }

  return (
    <div className="minimap" onClick={handleClick}>
      <button className="minimap-close" onClick={(e) => { e.stopPropagation(); onClose() }}>✕</button>
      <svg width={MINI_W} height={MINI_H}>
        <g transform={`scale(${scale}) translate(${-minX}, ${-minY})`}>
          {links.map((link, i) => {
            if (link.type === 'spouse') {
              return <line key={i} x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} stroke="#e74c7c" strokeWidth={1/scale} />
            }
            if (link.type === 'parent-child' && link.points) {
              const d = link.points.map((p, j) => `${j===0?'M':'L'} ${p.x} ${p.y}`).join(' ')
              return <path key={i} d={d} fill="none" stroke="#2688eb" strokeWidth={1/scale} />
            }
            return null
          })}
          {nodes.map(n => (
            <rect key={n.id} x={n.x} y={n.y} width={n.w} height={n.h} rx={4}
              fill="#dbeafe" stroke="#2688eb" strokeWidth={1/scale} />
          ))}
          {/* Viewport rectangle */}
          <rect
            x={-viewport.x / viewport.scale}
            y={-viewport.y / viewport.scale}
            width={viewport.containerW / viewport.scale}
            height={viewport.containerH / viewport.scale}
            fill="rgba(38,136,235,0.15)"
            stroke="#2688eb"
            strokeWidth={2/scale}
          />
        </g>
      </svg>
    </div>
  )
}

// ===== Главный компонент =====
export default function FamilyTree({ members, loading, onAddClick, onCardClick }) {
  const [showMinimap, setShowMinimap] = useState(false)
  const containerRef = useRef(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const [containerSize, setContainerSize] = useState({ w: 400, h: 600 })

  const { nodes, links } = useMemo(() => layoutTree(members), [members])

  // Авто-центрировать при загрузке
  useEffect(() => {
    if (!nodes.length || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setContainerSize({ w: rect.width, h: rect.height })

    const minX = Math.min(...nodes.map(n => n.x))
    const maxX = Math.max(...nodes.map(n => n.x + n.w))
    const minY = Math.min(...nodes.map(n => n.y))
    const maxY = Math.max(...nodes.map(n => n.y + n.h))
    const treeW = maxX - minX
    const treeH = maxY - minY

    const fitScale = Math.min(rect.width / (treeW + 60), rect.height / (treeH + 60), 1)
    const clampedScale = Math.max(fitScale, 0.15)
    const cx = -(minX + treeW / 2) * clampedScale + rect.width / 2
    const cy = -(minY + treeH / 2) * clampedScale + rect.height / 2

    setScale(clampedScale)
    setPan({ x: cx, y: cy })
  }, [nodes])

  // Drag / pan
  const onPointerDown = useCallback((e) => {
    if (e.target.closest('.tree-card') || e.target.closest('.minimap') || e.target.closest('.tree-toolbar')) return
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [pan])

  const onPointerMove = useCallback((e) => {
    if (!dragging) return
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    })
  }, [dragging])

  const onPointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  // Zoom
  const handleZoom = useCallback((delta) => {
    setScale(s => Math.max(0.2, Math.min(2, s + delta)))
  }, [])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    handleZoom(e.deltaY > 0 ? -0.1 : 0.1)
  }, [handleZoom])

  // Minimap click → center
  const handleMinimapClick = useCallback((mx, my) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setPan({
      x: -mx * scale + rect.width / 2,
      y: -my * scale + rect.height / 2,
    })
  }, [scale])

  // Fit all
  const fitAll = useCallback(() => {
    if (!nodes.length || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const minX = Math.min(...nodes.map(n => n.x))
    const maxX = Math.max(...nodes.map(n => n.x + n.w))
    const minY = Math.min(...nodes.map(n => n.y))
    const maxY = Math.max(...nodes.map(n => n.y + n.h))
    const treeW = maxX - minX
    const treeH = maxY - minY
    const fitScale = Math.min(rect.width / (treeW + 60), rect.height / (treeH + 60), 1)
    const clampedScale2 = Math.max(fitScale, 0.15)
    const cx = -(minX + treeW / 2) * clampedScale2 + rect.width / 2
    const cy = -(minY + treeH / 2) * clampedScale2 + rect.height / 2
    setScale(clampedScale2)
    setPan({ x: cx, y: cy })
  }, [nodes])

  return (
    <div>
      <div className="panel-header">🌳 Семейное дерево</div>
      <div className="panel-content" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Тулбар */}
        <div className="tree-toolbar">
          <button className="add-btn" style={{ margin: '8px 12px', width: 'auto', flex: 1 }} onClick={onAddClick}>＋ Добавить</button>
          <button className="toolbar-btn" onClick={() => handleZoom(0.2)} title="Увеличить">🔍+</button>
          <button className="toolbar-btn" onClick={() => handleZoom(-0.2)} title="Уменьшить">🔍−</button>
          <button className="toolbar-btn" onClick={fitAll} title="Показать всё">📋</button>
          <button className={`toolbar-btn ${showMinimap ? 'active' : ''}`} onClick={() => setShowMinimap(!showMinimap)} title="Мини-карта">🗺</button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : members.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👨‍👩‍👧‍👦</div>
            <div>Добавьте первого члена семьи</div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="tree-container"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
            style={{ touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
          >
            <div className="tree-canvas" style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
            }}>
              <TreeLinks links={links} />
              {nodes.map(node => (
                <MemberCard key={node.id} node={node} onClick={onCardClick} />
              ))}
            </div>
          </div>
        )}

        {/* Мини-карта */}
        {showMinimap && nodes.length > 0 && (
          <Minimap
            nodes={nodes}
            links={links}
            viewport={{ x: pan.x, y: pan.y, scale, containerW: containerSize.w, containerH: containerSize.h }}
            onClick={handleMinimapClick}
            onClose={() => setShowMinimap(false)}
          />
        )}
      </div>
    </div>
  )
}
