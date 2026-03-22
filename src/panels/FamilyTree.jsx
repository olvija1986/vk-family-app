import { useState } from 'react'
import { removeMember as apiRemoveMember } from '../api'

export default function FamilyTree({ members, onRefresh, loading, onAddClick }) {
  const [msg, setMsg] = useState(null)

  const showMsg = (text) => {
    setMsg(text)
    setTimeout(() => setMsg(null), 2000)
  }

  const handleRemove = async (id) => {
    const result = await apiRemoveMember(id)
    if (result.success) { showMsg('🗑 Удалено'); onRefresh() }
    else { showMsg('❌ Ошибка') }
  }

  const generations = {}
  members.forEach(m => {
    const gen = m.generation || 0
    if (!generations[gen]) generations[gen] = []
    generations[gen].push(m)
  })
  const labels = ['Старшее поколение', 'Родители', 'Дети', 'Внуки', 'Правнуки']

  return (
    <div>
      <div className="panel-header">🌳 Семейное дерево</div>
      <div className="panel-content">
        <button className="add-btn" onClick={onAddClick}>＋ Добавить члена семьи</button>

        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            {Object.keys(generations)
              .sort((a, b) => Number(a) - Number(b))
              .map(gen => (
                <div key={gen}>
                  <div className="section-title">{labels[gen] || `Поколение ${Number(gen) + 1}`}</div>
                  <div className="generation-row">
                    {generations[gen].map(member => (
                      <div key={member.id} className="family-member-card">
                        <div className="member-emoji">{member.emoji}</div>
                        <div className="member-name">{member.name}</div>
                        <div className="member-relation">{member.relation}</div>
                        {member.parentId && (
                          <div className="member-parent">
                            ↑ {members.find(m => String(m.id) === String(member.parentId))?.name || ''}
                          </div>
                        )}
                        <button className="member-remove" onClick={() => handleRemove(member.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            {members.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">👨‍👩‍👧‍👦</div>
                <div>Добавьте первого члена семьи</div>
              </div>
            )}
          </>
        )}
      </div>
      {msg && <div className="snackbar">{msg}</div>}
    </div>
  )
}
