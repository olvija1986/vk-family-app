import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

// ===== Расчёт позиций узлов дерева (subtree layout) =====
function layoutTree(members) {
  if (!members.length) return { nodes: [], links: [], familyBoxes: [] }

  const byId = {}
  members.forEach(m => { byId[m.id] = m })

  const CARD_W = 95
  const CARD_H = 100
  const COUPLE_GAP = 16
  const SUBTREE_GAP = 44
  const LEVEL_GAP = 140
  const MAX_ROW = 12
  const ROW_GAP = CARD_H + LEVEL_GAP

  // Находим пары (супруги)
  const coupleMap = {}
  const inCouple = new Set()
  members.forEach(m => {
    if (m.spouseId && byId[m.spouseId] && !inCouple.has(m.id)) {
      coupleMap[m.id] = m.spouseId
      coupleMap[m.spouseId] = m.id
      inCouple.add(m.id)
      inCouple.add(m.spouseId)
    }
  })

  function unitKey(ids) { return [...ids].sort().join('_') }

  function unitSelfWidth(ids) {
    return ids.length === 2 ? CARD_W * 2 + COUPLE_GAP : CARD_W
  }

  function getChildren(ids) {
    return members.filter(m => {
      const p1 = m.parent1Id, p2 = m.parent2Id
      return ids.some(uid => uid === p1 || uid === p2)
    })
  }

  function childUnitsOf(ids) {
    const children = getChildren(ids)
    const units = []
    const placed = new Set()
    children.forEach(c => {
      if (placed.has(c.id)) return
      placed.add(c.id)
      if (coupleMap[c.id] && !placed.has(coupleMap[c.id])) {
        placed.add(coupleMap[c.id])
        units.push([c.id, coupleMap[c.id]])
      } else {
        units.push([c.id])
      }
    })
    return units
  }

  // Находим корни
  const hasParent = new Set()
  members.forEach(m => {
    if (m.parent1Id && byId[m.parent1Id]) hasParent.add(m.id)
    if (m.parent2Id && byId[m.parent2Id]) hasParent.add(m.id)
  })

  const rootCouplesDone = new Set()
  const rootUnits = []
  members.forEach(m => {
    if (hasParent.has(m.id)) return
    if (rootCouplesDone.has(m.id)) return
    if (coupleMap[m.id] && hasParent.has(coupleMap[m.id])) return
    rootCouplesDone.add(m.id)
    if (coupleMap[m.id]) {
      rootCouplesDone.add(coupleMap[m.id])
      rootUnits.push([m.id, coupleMap[m.id]])
    } else {
      rootUnits.push([m.id])
    }
  })

  // === Рекурсивный расчёт ширины поддерева ===
  const cache = {}

  function calcSubtree(ids) {
    const key = unitKey(ids)
    if (cache[key]) return cache[key]

    const selfW = unitSelfWidth(ids)
    const childUnits = childUnitsOf(ids)

    if (!childUnits.length) {
      cache[key] = { width: selfW, childUnits: [], rows: [] }
      return cache[key]
    }

    // Разбиваем на строки по MAX_ROW карточек
    const rows = []
    let currentRow = []
    let currentCards = 0
    childUnits.forEach(cu => {
      const cards = cu.length
      if (currentCards + cards > MAX_ROW && currentRow.length > 0) {
        rows.push(currentRow)
        currentRow = [cu]
        currentCards = cards
      } else {
        currentRow.push(cu)
        currentCards += cards
      }
    })
    if (currentRow.length) rows.push(currentRow)

    let maxRowW = 0
    rows.forEach(row => {
      let rowW = 0
      row.forEach((cu, i) => {
        if (i > 0) rowW += SUBTREE_GAP
        rowW += calcSubtree(cu).width
      })
      maxRowW = Math.max(maxRowW, rowW)
    })

    const totalW = Math.max(selfW, maxRowW)
    cache[key] = { width: totalW, childUnits, rows }
    return cache[key]
  }

  rootUnits.forEach(ru => calcSubtree(ru))

  // Палитра цветов для веток
  const BRANCH_COLORS = [
    '#43a047', '#e67c30', '#5c6bc0', '#ec407a', '#26a69a',
    '#ab47bc', '#f44336', '#2196f3', '#ff9800', '#8d6e63',
  ]
  let branchColorIdx = 0

  // === Размещение ===
  const nodes = []
  const links = []
  const placedIds = new Set()

  function placeUnit(ids, cx, y, color) {
    const key = unitKey(ids)

    // Размещаем ячейку
    if (ids.length === 2) {
      const x1 = cx - CARD_W - COUPLE_GAP / 2
      const x2 = cx + COUPLE_GAP / 2
      const m1 = byId[ids[0]], m2 = byId[ids[1]]
      if (m1 && !placedIds.has(ids[0])) {
        placedIds.add(ids[0])
        nodes.push({ ...m1, x: x1, y, w: CARD_W, h: CARD_H })
      }
      if (m2 && !placedIds.has(ids[1])) {
        placedIds.add(ids[1])
        nodes.push({ ...m2, x: x2, y, w: CARD_W, h: CARD_H })
      }
      links.push({
        type: 'spouse',
        x1: x1 + CARD_W, y1: y + CARD_H / 2,
        x2: x2, y2: y + CARD_H / 2,
        color,
      })
    } else {
      const x1 = cx - CARD_W / 2
      const m1 = byId[ids[0]]
      if (m1 && !placedIds.has(ids[0])) {
        placedIds.add(ids[0])
        nodes.push({ ...m1, x: x1, y, w: CARD_W, h: CARD_H })
      }
    }

    const { rows } = cache[key]
    if (!rows.length) return

    const parentBottomY = y + CARD_H
    const addLine = (pts) => links.push({ type: 'parent-child', points: pts, color })

    rows.forEach((row, ri) => {
      const childY = y + CARD_H + LEVEL_GAP + ri * ROW_GAP

      // Считаем ширину строки
      let rowW = 0
      row.forEach((cu, i) => {
        if (i > 0) rowW += SUBTREE_GAP
        rowW += calcSubtree(cu).width
      })

      // Центрируем строку под родителем
      let childX = cx - rowW / 2
      const childCenters = []

      row.forEach(cu => {
        const cuW = calcSubtree(cu).width
        const childCx = childX + cuW / 2
        placeUnit(cu, childCx, childY, color)
        childCenters.push(childCx)
        childX += cuW + SUBTREE_GAP
      })

      // === Рисуем линии ===
      // Точка начала вертикали: от родителя или от предыдущей строки
      const prevBottom = ri === 0
        ? parentBottomY
        : (y + CARD_H + LEVEL_GAP + (ri - 1) * ROW_GAP + CARD_H)

      // Горизонтальная перекладина по центру между prevBottom и childY
      const midY = prevBottom + (childY - prevBottom) * 0.35

      // Вертикаль от предыдущего уровня до midY
      addLine([{ x: cx, y: prevBottom }, { x: cx, y: midY }])

      if (childCenters.length === 1) {
        // Один ребёнок — Г-образная линия
        const ccx = childCenters[0]
        if (cx !== ccx) {
          addLine([{ x: cx, y: midY }, { x: ccx, y: midY }])
        }
        addLine([{ x: ccx, y: midY }, { x: ccx, y: childY }])
      } else {
        // Несколько детей — горизонтальная перекладина
        const allX = [cx, ...childCenters]
        const leftX = Math.min(...allX)
        const rightX = Math.max(...allX)
        addLine([{ x: leftX, y: midY }, { x: rightX, y: midY }])
        // Вертикали от перекладины к детям
        childCenters.forEach(ccx => {
          addLine([{ x: ccx, y: midY }, { x: ccx, y: childY }])
        })
      }
    })
  }

  // Размещаем корневые ячейки
  let rx = 0
  rootUnits.forEach(ru => {
    const ruW = calcSubtree(ru).width
    const rcx = rx + ruW / 2
    const branchColor = BRANCH_COLORS[branchColorIdx % BRANCH_COLORS.length]
    branchColorIdx++
    placeUnit(ru, rcx, 0, branchColor)
    rx += ruW + SUBTREE_GAP * 2
  })

  // === Пост-обработка: устранение наложений ===
  const byY = {}
  nodes.forEach((n, i) => {
    const roundY = Math.round(n.y / 10) * 10
    if (!byY[roundY]) byY[roundY] = []
    byY[roundY].push(i)
  })

  Object.values(byY).forEach(indices => {
    if (indices.length <= 1) return
    indices.sort((a, b) => nodes[a].x - nodes[b].x)
    for (let i = 1; i < indices.length; i++) {
      const prev = nodes[indices[i - 1]]
      const curr = nodes[indices[i]]
      const minGap = 12
      const overlap = (prev.x + prev.w + minGap) - curr.x
      if (overlap > 0) {
        for (let j = i; j < indices.length; j++) {
          nodes[indices[j]].x += overlap
        }
      }
    }
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
                stroke={link.color || '#ccc'} strokeWidth={2.5} strokeOpacity={0.5}
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
              fill="none" stroke={link.color || '#bbb'} strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
              strokeOpacity={0.6}
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
              return <path key={i} d={d} fill="none" stroke="#43a047" strokeWidth={1/scale} />
            }
            return null
          })}
          {nodes.map(n => (
            <rect key={n.id} x={n.x} y={n.y} width={n.w} height={n.h} rx={4}
              fill="#e8f5e9" stroke="#43a047" strokeWidth={1/scale} />
          ))}
          <rect
            x={-viewport.x / viewport.scale}
            y={-viewport.y / viewport.scale}
            width={viewport.containerW / viewport.scale}
            height={viewport.containerH / viewport.scale}
            fill="rgba(67,160,71,0.15)"
            stroke="#43a047"
            strokeWidth={2/scale}
          />
        </g>
      </svg>
    </div>
  )
}

// ===== Главный компонент =====
export default function FamilyTree({ members, onRefresh, loading, onAddClick, onCardClick }) {
  const [msg, setMsg] = useState(null)
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

  const showMessage = (text) => { setMsg(text); setTimeout(() => setMsg(null), 2000) }

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
    setScale(s => Math.max(0.15, Math.min(2, s + delta)))
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
          <button className="add-btn" style={{ flex: 1 }} onClick={onAddClick}>＋ Добавить</button>
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
              {nodes.map((node, idx) => (
                <MemberCard key={`${node.id}_${idx}`} node={node} onClick={onCardClick} />
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
      {msg && <div className="snackbar">{msg}</div>}
    </div>
  )
}
