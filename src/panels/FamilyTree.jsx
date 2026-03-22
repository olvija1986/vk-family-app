import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { removeMember as apiRemoveMember } from '../api'

// ===== Расчёт позиций узлов дерева =====
function layoutTree(members) {
  if (!members.length) return { nodes: [], links: [] }

  const byId = {}
  members.forEach(m => { byId[m.id] = m })

  // Находим пары (супруги)
  const couples = []
  const inCouple = new Set()
  members.forEach(m => {
    if (m.spouseId && byId[m.spouseId] && !inCouple.has(m.id)) {
      couples.push([m.id, m.spouseId])
      inCouple.add(m.id)
      inCouple.add(m.spouseId)
    }
  })

  // Группируем по поколениям
  const gens = {}
  members.forEach(m => {
    const g = m.generation || 0
    if (!gens[g]) gens[g] = []
    gens[g].push(m)
  })

  const CARD_W = 110
  const CARD_H = 100
  const GAP_X = 40
  const COUPLE_GAP = 40
  const FAMILY_GAP = 70
  const GAP_Y = 180

  const nodes = []
  const nodePos = {}

  // Размещаем по поколениям
  const genKeys = Object.keys(gens).sort((a, b) => Number(a) - Number(b))

  genKeys.forEach(g => {
    const gen = gens[g]

    // Группируем по семьям: дети одних родителей + их супруги рядом
    const familyGroups = []
    const placed = new Set()

    // Сначала находим «семьи» — группы детей от одних родителей
    const childrenByParents = {}
    gen.forEach(m => {
      const parents = [m.parent1Id, m.parent2Id].filter(p => p && byId[p]).sort()
      if (parents.length) {
        const key = parents.join('_')
        if (!childrenByParents[key]) childrenByParents[key] = []
        childrenByParents[key].push(m)
      }
    })

    // Добавляем семьи (дети + их супруги)
    Object.values(childrenByParents).forEach(children => {
      const group = []
      children.forEach(child => {
        if (placed.has(child.id)) return
        placed.add(child.id)
        group.push(child)
        // Супруг рядом
        if (child.spouseId && byId[child.spouseId] && !placed.has(child.spouseId)) {
          const sp = byId[child.spouseId]
          if ((sp.generation || 0) === Number(g)) {
            placed.add(sp.id)
            group.push(sp)
          }
        }
      })
      if (group.length) familyGroups.push(group)
    })

    // Оставшиеся (без родителей) — каждый как своя «семья»
    gen.forEach(m => {
      if (placed.has(m.id)) return
      const group = [m]
      placed.add(m.id)
      if (m.spouseId && byId[m.spouseId] && !placed.has(m.spouseId)) {
        const sp = byId[m.spouseId]
        if ((sp.generation || 0) === Number(g)) {
          placed.add(sp.id)
          group.push(sp)
        }
      }
      familyGroups.push(group)
    })

    // Раскладываем семьи с увеличенным зазором между ними
    let x = 0
    const y = Number(g) * (CARD_H + GAP_Y)

    familyGroups.forEach((group, gi) => {
      if (gi > 0) x += FAMILY_GAP // большой зазор между семьями

      group.forEach((m, i) => {
        const isSecondInCouple = i > 0 && couples.some(c =>
          (c[0] === group[i - 1].id && c[1] === m.id) ||
          (c[1] === group[i - 1].id && c[0] === m.id)
        )

        if (isSecondInCouple) {
          x = nodePos[group[i - 1].id].x + CARD_W + COUPLE_GAP
        }

        nodePos[m.id] = { x, y }
        nodes.push({ ...m, x, y, w: CARD_W, h: CARD_H })

        const isFirstInCouple = couples.some(c =>
          (c[0] === m.id || c[1] === m.id) &&
          group[i + 1] && (c[0] === group[i + 1].id || c[1] === group[i + 1].id)
        )

        x += CARD_W + (isFirstInCouple ? COUPLE_GAP : GAP_X)
      })
    })
  })

  // Центрируем каждое поколение
  const maxWidth = Math.max(...genKeys.map(g => {
    const genNodes = nodes.filter(n => (n.generation || 0) === Number(g))
    if (!genNodes.length) return 0
    return Math.max(...genNodes.map(n => n.x + n.w)) - Math.min(...genNodes.map(n => n.x))
  }))

  genKeys.forEach(g => {
    const genNodes = nodes.filter(n => (n.generation || 0) === Number(g))
    if (!genNodes.length) return
    const minX = Math.min(...genNodes.map(n => n.x))
    const curW = Math.max(...genNodes.map(n => n.x + n.w)) - minX
    const offset = (maxWidth - curW) / 2 - minX
    genNodes.forEach(n => {
      n.x += offset
      nodePos[n.id].x = n.x
    })
  })

  // Строим линии связей
  const links = []

  // Линии супругов (горизонтальные)
  couples.forEach(([id1, id2]) => {
    if (!nodePos[id1] || !nodePos[id2]) return
    const n1 = nodePos[id1], n2 = nodePos[id2]
    links.push({
      type: 'spouse',
      x1: n1.x + CARD_W, y1: n1.y + CARD_H / 2,
      x2: n2.x, y2: n2.y + CARD_H / 2,
    })
  })

  // Группируем детей по паре родителей
  const parentGroups = {}
  members.forEach(m => {
    const parents = [m.parent1Id, m.parent2Id].filter(p => p && nodePos[p]).sort()
    if (!parents.length || !nodePos[m.id]) return
    const key = parents.join('_')
    if (!parentGroups[key]) parentGroups[key] = { parents, children: [] }
    parentGroups[key].children.push(m)
  })

  // Линии родитель→дети — со смещением midY для каждой группы
  const groupsByGenGap = {}
  Object.values(parentGroups).forEach(group => {
    const parentGen = byId[group.parents[0]] ? (byId[group.parents[0]].generation || 0) : 0
    const key = String(parentGen)
    if (!groupsByGenGap[key]) groupsByGenGap[key] = []
    groupsByGenGap[key].push(group)
  })

  Object.values(groupsByGenGap).forEach(groups => {
    const totalGroups = groups.length
    groups.forEach((group, groupIdx) => {
      const { parents, children } = group

      let parentCenterX, parentBottomY
      if (parents.length === 2 && nodePos[parents[0]] && nodePos[parents[1]]) {
        parentCenterX = (nodePos[parents[0]].x + CARD_W / 2 + nodePos[parents[1]].x + CARD_W / 2) / 2
        parentBottomY = nodePos[parents[0]].y + CARD_H
      } else {
        parentCenterX = nodePos[parents[0]].x + CARD_W / 2
        parentBottomY = nodePos[parents[0]].y + CARD_H
      }

      const childCenters = children.map(c => ({
        x: nodePos[c.id].x + CARD_W / 2,
        y: nodePos[c.id].y,
      }))

      const childTopY = childCenters[0].y
      const space = childTopY - parentBottomY

      // Смещаем midY для каждой группы, чтобы линии не сливались
      const baseOffset = 0.3
      const step = totalGroups > 1 ? 0.4 / (totalGroups - 1) : 0
      const ratio = baseOffset + step * groupIdx
      const midY = parentBottomY + space * ratio

      // Вертикаль от родителей вниз до midY
      links.push({
        type: 'parent-child',
        points: [
          { x: parentCenterX, y: parentBottomY },
          { x: parentCenterX, y: midY },
        ],
      })

      // Горизонтальная линия
      const allX = [...childCenters.map(c => c.x), parentCenterX]
      const leftX = Math.min(...allX)
      const rightX = Math.max(...allX)

      if (leftX !== rightX) {
        links.push({
          type: 'parent-child',
          points: [
            { x: leftX, y: midY },
            { x: rightX, y: midY },
          ],
        })
      }

      // Вертикали от midY вниз к каждому ребёнку
      childCenters.forEach(c => {
        links.push({
          type: 'parent-child',
          points: [
            { x: c.x, y: midY },
            { x: c.x, y: c.y },
          ],
        })
      })
    })
  })

  return { nodes, links }
}

// ===== SVG Линии =====
function TreeLinks({ links }) {
  return (
    <svg className="tree-svg" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {links.map((link, i) => {
        if (link.type === 'spouse') {
          return (
            <line key={`s${i}`}
              x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2}
              stroke="#e74c7c" strokeWidth={2} strokeDasharray="6 3"
            />
          )
        }
        if (link.type === 'parent-child' && link.points) {
          const d = link.points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
          return (
            <path key={`p${i}`} d={d}
              fill="none" stroke="#2688eb" strokeWidth={2}
            />
          )
        }
        return null
      })}
      {/* Сердечко на супружеских связях */}
      {links.filter(l => l.type === 'spouse').map((link, i) => {
        const cx = (link.x1 + link.x2) / 2
        const cy = (link.y1 + link.y2) / 2
        return <text key={`h${i}`} x={cx} y={cy - 6} textAnchor="middle" fontSize="14">❤️</text>
      })}
    </svg>
  )
}

// ===== Карточка =====
function MemberCard({ node, onRemove, onClick }) {
  return (
    <div className="tree-card" style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
      onClick={() => onClick(node)}>
      <button className="tree-card-remove" onClick={(e) => { e.stopPropagation(); onRemove(node.id) }}>✕</button>
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
    const clampedScale = Math.max(fitScale, 0.3)
    const cx = -(minX + treeW / 2) * clampedScale + rect.width / 2
    const cy = -(minY + treeH / 2) * clampedScale + rect.height / 2

    setScale(clampedScale)
    setPan({ x: cx, y: cy })
  }, [nodes])

  const showMessage = (text) => { setMsg(text); setTimeout(() => setMsg(null), 2000) }

  const handleRemove = async (id) => {
    const r = await apiRemoveMember(id)
    if (r.success) { showMessage('🗑 Удалено'); onRefresh() }
    else { showMessage('❌ Ошибка') }
  }

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
    const clampedScale2 = Math.max(fitScale, 0.3)
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
                <MemberCard key={node.id} node={node} onRemove={handleRemove} onClick={onCardClick} />
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
