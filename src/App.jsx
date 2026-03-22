import { useState, useEffect, useCallback } from 'react'
import { fetchAll, addMember, addBirthday, updateMember } from './api'
import FamilyTree from './panels/FamilyTree'
import Birthdays from './panels/Birthdays'

const RELATIONS = [
  'Дедушка', 'Бабушка', 'Отец', 'Мать',
  'Сын', 'Дочь', 'Брат', 'Сестра',
  'Дядя', 'Тётя', 'Племянник', 'Племянница',
  'Муж', 'Жена', 'Внук', 'Внучка',
]

const EMOJIS = {
  'Дедушка': '👴', 'Бабушка': '👵', 'Отец': '👨', 'Мать': '👩',
  'Сын': '👦', 'Дочь': '👧', 'Брат': '👦', 'Сестра': '👧',
  'Дядя': '👨', 'Тётя': '👩', 'Племянник': '👦', 'Племянница': '👧',
  'Муж': '👨', 'Жена': '👩', 'Внук': '👦', 'Внучка': '👧',
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('tree')
  const [members, setMembers] = useState([])
  const [birthdays, setBirthdays] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const [memberForm, setMemberForm] = useState({
    name: '', relation: RELATIONS[0], parent1Id: '', parent2Id: '', spouseId: '',
  })
  const [bdayForm, setBdayForm] = useState({ name: '', date: '', emoji: '🧑' })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAll()
      setMembers(data.tree || [])
      setBirthdays(data.birthdays || [])
    } catch (err) {
      console.error('Ошибка загрузки:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleAddMember = async () => {
    if (!memberForm.name.trim()) return
    setSaving(true)

    // Определяем поколение
    const p1 = members.find(m => String(m.id) === memberForm.parent1Id)
    const p2 = members.find(m => String(m.id) === memberForm.parent2Id)
    const spouse = members.find(m => String(m.id) === memberForm.spouseId)
    let generation = 0
    if (p1) generation = (p1.generation || 0) + 1
    else if (p2) generation = (p2.generation || 0) + 1
    else if (spouse) generation = spouse.generation || 0

    const newMember = {
      name: memberForm.name.trim(),
      relation: memberForm.relation,
      emoji: EMOJIS[memberForm.relation] || '🧑',
      parent1Id: memberForm.parent1Id || '',
      parent2Id: memberForm.parent2Id || '',
      spouseId: memberForm.spouseId || '',
      generation,
    }

    // Сохраняем
    const id = String(Date.now())
    const updated = [...members, { ...newMember, id }]

    // Если указан супруг — обновим и его (spouseId)
    if (memberForm.spouseId) {
      const spouseIdx = updated.findIndex(m => m.id === memberForm.spouseId)
      if (spouseIdx >= 0) {
        updated[spouseIdx] = { ...updated[spouseIdx], spouseId: id }
      }
    }

    localStorage.setItem('family_tree_cache', JSON.stringify(updated))
    setMembers(updated)

    // Отправляем в Google Sheets
    await addMember({ ...newMember, id })

    // Если есть супруг — обновляем его spouseId в таблице
    if (memberForm.spouseId) {
      await updateMember({ id: memberForm.spouseId, spouseId: id })
    }

    setSaving(false)
    setMemberForm({ name: '', relation: RELATIONS[0], parent1Id: '', parent2Id: '', spouseId: '' })
    setModal(null)
  }

  const handleAddBirthday = async () => {
    if (!bdayForm.name.trim() || !bdayForm.date) return
    setSaving(true)

    const id = String(Date.now())
    const entry = { id, name: bdayForm.name.trim(), date: bdayForm.date, emoji: bdayForm.emoji || '🧑' }
    const updated = [...birthdays, entry]
    localStorage.setItem('birthdays_cache', JSON.stringify(updated))
    setBirthdays(updated)

    await addBirthday(entry)

    setSaving(false)
    setBdayForm({ name: '', date: '', emoji: '🧑' })
    setModal(null)
  }

  const memberOptions = members.map(m => (
    <option key={m.id} value={m.id}>{m.emoji} {m.name} ({m.relation})</option>
  ))

  return (
    <>
      {tab === 'tree' && (
        <FamilyTree
          members={members}
          onRefresh={loadData}
          loading={loading}
          onAddClick={() => setModal('member')}
        />
      )}
      {tab === 'birthdays' && (
        <Birthdays
          birthdays={birthdays}
          onRefresh={loadData}
          loading={loading}
          onAddClick={() => setModal('birthday')}
        />
      )}

      {/* Табы */}
      <nav className="tabbar">
        <button className={`tabbar-item ${tab === 'tree' ? 'active' : ''}`} onClick={() => setTab('tree')}>
          <svg viewBox="0 0 28 28" fill="currentColor"><path d="M14 4a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm-2 3.5a2 2 0 114 0 2 2 0 01-4 0zM5 14.5a3 3 0 116 0 3 3 0 01-6 0zm3-1.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM17 14.5a3 3 0 116 0 3 3 0 01-6 0zm3-1.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM7 20a2 2 0 00-2 2v1.25a.75.75 0 01-1.5 0V22a3.5 3.5 0 013.5-3.5h2a.75.75 0 010 1.5H7zM19 19.5a.75.75 0 000 1.5h2a2 2 0 012 2v.25a.75.75 0 001.5 0V23a3.5 3.5 0 00-3.5-3.5h-2zM10.5 19.5a.75.75 0 000 1.5h1.75V23a.75.75 0 001.5 0v-2h1.75a.75.75 0 000-1.5h-5z"/></svg>
          <span>Дерево</span>
        </button>
        <button className={`tabbar-item ${tab === 'birthdays' ? 'active' : ''}`} onClick={() => setTab('birthdays')}>
          <svg viewBox="0 0 28 28" fill="currentColor"><path d="M14 3.75a.75.75 0 01.75.75v2a.75.75 0 01-1.5 0v-2a.75.75 0 01.75-.75zM8.5 8A1.5 1.5 0 0110 6.5h8A1.5 1.5 0 0119.5 8v1h1A2.5 2.5 0 0123 11.5v9A2.5 2.5 0 0120.5 23h-13A2.5 2.5 0 015 20.5v-9A2.5 2.5 0 017.5 9h1V8zM10 9h8V8h-8v1zM7.5 10.5a1 1 0 00-1 1v9a1 1 0 001 1h13a1 1 0 001-1v-9a1 1 0 00-1-1h-13zM10 14a1 1 0 011-1h6a1 1 0 110 1.5h-6A1 1 0 0110 14z"/></svg>
          <span>Дни рождения</span>
        </button>
      </nav>

      {/* Модалка: добавить члена семьи */}
      {modal === 'member' && (
        <Modal title="Добавить члена семьи" onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">Имя</label>
            <input className="form-input" value={memberForm.name}
              onChange={e => setMemberForm({...memberForm, name: e.target.value})}
              placeholder="Введите имя" />
          </div>
          <div className="form-group">
            <label className="form-label">Кто в семье</label>
            <select className="form-select" value={memberForm.relation}
              onChange={e => setMemberForm({...memberForm, relation: e.target.value})}>
              {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Родитель 1</label>
            <select className="form-select" value={memberForm.parent1Id}
              onChange={e => setMemberForm({...memberForm, parent1Id: e.target.value})}>
              <option value="">— не выбран —</option>
              {memberOptions}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Родитель 2</label>
            <select className="form-select" value={memberForm.parent2Id}
              onChange={e => setMemberForm({...memberForm, parent2Id: e.target.value})}>
              <option value="">— не выбран —</option>
              {memberOptions}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Супруг / Супруга</label>
            <select className="form-select" value={memberForm.spouseId}
              onChange={e => setMemberForm({...memberForm, spouseId: e.target.value})}>
              <option value="">— не выбран(а) —</option>
              {memberOptions}
            </select>
          </div>
          <button className="submit-btn" onClick={handleAddMember} disabled={saving}>
            {saving ? 'Сохраняю...' : 'Добавить'}
          </button>
        </Modal>
      )}

      {/* Модалка: добавить ДР */}
      {modal === 'birthday' && (
        <Modal title="Добавить день рождения" onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">Имя</label>
            <input className="form-input" value={bdayForm.name}
              onChange={e => setBdayForm({...bdayForm, name: e.target.value})}
              placeholder="Введите имя" />
          </div>
          <div className="form-group">
            <label className="form-label">Дата рождения</label>
            <input className="form-input" type="date" value={bdayForm.date}
              onChange={e => setBdayForm({...bdayForm, date: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Эмодзи</label>
            <input className="form-input" value={bdayForm.emoji}
              onChange={e => setBdayForm({...bdayForm, emoji: e.target.value})}
              placeholder="🧑" maxLength={2} />
          </div>
          <button className="submit-btn" onClick={handleAddBirthday} disabled={saving}>
            {saving ? 'Сохраняю...' : 'Добавить'}
          </button>
        </Modal>
      )}
    </>
  )
}
