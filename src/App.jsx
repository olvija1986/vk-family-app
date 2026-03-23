import { useState, useEffect, useCallback } from 'react'
import { fetchAll, addMember, addBirthday, updateMember, removeMember } from './api'
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
  const [selectedMember, setSelectedMember] = useState(null)

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
      {/* Анимированный фон: пейзаж с деревом, холмами, облаками и птицами */}
      <div className="animated-bg">
        <svg viewBox="0 0 500 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Градиент неба */}
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8ddd0" stopOpacity="0.06"/>
              <stop offset="50%" stopColor="#f0e8dc" stopOpacity="0.04"/>
              <stop offset="100%" stopColor="#f5f0e8" stopOpacity="0.02"/>
            </linearGradient>
            {/* Градиент холмов */}
            <linearGradient id="hillGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4c4a8"/>
              <stop offset="100%" stopColor="#c8b898"/>
            </linearGradient>
            <linearGradient id="hillGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cbbe9e"/>
              <stop offset="100%" stopColor="#bfb290"/>
            </linearGradient>
          </defs>

          {/* Небо */}
          <rect width="500" height="900" fill="url(#skyGrad)"/>

          {/* Облака */}
          <g className="cloud cloud-1" opacity="0.07">
            <ellipse cx="320" cy="120" rx="55" ry="22" fill="#fff"/>
            <ellipse cx="345" cy="110" rx="40" ry="20" fill="#fff"/>
            <ellipse cx="295" cy="115" rx="35" ry="18" fill="#fff"/>
            <ellipse cx="330" cy="105" rx="30" ry="16" fill="#fff"/>
          </g>
          <g className="cloud cloud-2" opacity="0.05">
            <ellipse cx="150" cy="80" rx="40" ry="16" fill="#fff"/>
            <ellipse cx="170" cy="72" rx="30" ry="14" fill="#fff"/>
            <ellipse cx="135" cy="75" rx="25" ry="12" fill="#fff"/>
          </g>

          {/* Холмы на заднем плане */}
          <g opacity="0.06">
            {/* Дальний холм */}
            <path d="M-50 750 Q100 680 250 720 Q400 760 550 700 L550 900 L-50 900 Z" fill="url(#hillGrad2)"/>
            {/* Ближний холм справа */}
            <path d="M200 780 Q350 720 450 750 Q500 765 550 760 L550 900 L200 900 Z" fill="url(#hillGrad1)"/>
            {/* Ближний холм слева */}
            <path d="M-50 790 Q50 760 150 780 Q220 795 280 800 L280 900 L-50 900 Z" fill="url(#hillGrad1)"/>
          </g>

          {/* Цветущее дерево — ствол и ветки */}
          <g opacity="0.08">
            {/* Главный ствол */}
            <path d="M128 580 Q126 520 125 480 Q124 450 126 420 L132 420 Q134 450 133 480 Q132 520 130 580 Z" fill="#4a3728"/>
            {/* Ветки */}
            <path d="M128 460 Q115 440 100 425 Q90 418 82 412" stroke="#4a3728" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M127 480 Q110 465 95 455" stroke="#4a3728" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            <path d="M130 450 Q145 435 160 420 Q168 414 175 410" stroke="#4a3728" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M131 470 Q148 458 162 448" stroke="#4a3728" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            <path d="M129 440 Q128 425 130 410 Q131 400 132 395" stroke="#4a3728" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          </g>

          {/* Крона — цветущие розовые шарики */}
          <g opacity="0.09">
            {/* Основная масса — нижний слой */}
            <g className="leaf-group-1">
              <ellipse cx="130" cy="420" rx="65" ry="50" fill="#d4869a"/>
              <ellipse cx="105" cy="410" rx="40" ry="35" fill="#dba0b0"/>
            </g>
            <g className="leaf-group-2">
              <ellipse cx="155" cy="405" rx="45" ry="38" fill="#d4869a"/>
              <ellipse cx="90" cy="425" rx="30" ry="28" fill="#c97a90"/>
            </g>
            {/* Средний слой */}
            <g className="leaf-group-3">
              <ellipse cx="130" cy="390" rx="55" ry="42" fill="#dba0b0"/>
              <ellipse cx="110" cy="380" rx="35" ry="30" fill="#e8b8c4"/>
            </g>
            <g className="leaf-group-4">
              <ellipse cx="150" cy="385" rx="40" ry="32" fill="#dba0b0"/>
              <ellipse cx="95" cy="395" rx="28" ry="24" fill="#e8b8c4"/>
            </g>
            {/* Верхний слой — светлее */}
            <g className="leaf-group-5">
              <ellipse cx="130" cy="370" rx="40" ry="32" fill="#e8b8c4"/>
              <ellipse cx="118" cy="360" rx="28" ry="22" fill="#f0d0d8"/>
            </g>
            <g className="leaf-group-6">
              <ellipse cx="142" cy="365" rx="25" ry="20" fill="#f0d0d8"/>
              <ellipse cx="130" cy="355" rx="18" ry="15" fill="#f5e0e5"/>
            </g>
            {/* Мелкие цветочки по краям */}
            <g className="leaf-group-1">
              <circle cx="72" cy="430" r="8" fill="#d4869a"/>
              <circle cx="80" cy="415" r="6" fill="#e8b8c4"/>
              <circle cx="170" cy="415" r="7" fill="#d4869a"/>
              <circle cx="165" cy="400" r="5" fill="#e8b8c4"/>
            </g>
            <g className="leaf-group-3">
              <circle cx="85" cy="375" r="5" fill="#f0d0d8"/>
              <circle cx="160" cy="375" r="5" fill="#f0d0d8"/>
              <circle cx="130" cy="348" r="4" fill="#f5e0e5"/>
            </g>
          </g>

          {/* Падающие лепестки */}
          <g>
            <ellipse rx="2" ry="1.2" fill="#e8b8c4">
              <animateTransform attributeName="transform" type="translate" values="140 400; 165 550; 145 700; 170 850; 155 900" dur="10s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.08;0.06;0.03;0" dur="10s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse rx="1.8" ry="1" fill="#f0d0d8">
              <animateTransform attributeName="transform" type="translate" values="120 380; 100 520; 115 660; 95 800; 110 900" dur="12s" begin="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.07;0.05;0.02;0" dur="12s" begin="2s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse rx="1.5" ry="0.8" fill="#d4869a">
              <animateTransform attributeName="transform" type="translate" values="150 410; 175 560; 160 710; 180 860; 165 900" dur="14s" begin="5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.06;0.04;0.02;0" dur="14s" begin="5s" repeatCount="indefinite"/>
            </ellipse>
          </g>

          {/* Стая птиц — V-образные галочки разного размера */}
          <g className="flock flock-1">
            {/* Лидер стаи */}
            <path d="M220 320 Q215 315 208 310" stroke="#5d4037" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.12">
              <animateTransform attributeName="transform" type="translate" values="0 0; 80 -40; 160 -80; 250 -120; 350 -160" dur="20s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.12;0.1;0.06;0" dur="20s" repeatCount="indefinite"/>
            </path>
            <path d="M220 320 Q225 315 232 310" stroke="#5d4037" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.12">
              <animateTransform attributeName="transform" type="translate" values="0 0; 80 -40; 160 -80; 250 -120; 350 -160" dur="20s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.12;0.1;0.06;0" dur="20s" repeatCount="indefinite"/>
            </path>

            {/* Птица 2 — слева от лидера */}
            <path d="M205 330 Q200 325 194 321" stroke="#5d4037" strokeWidth="0.7" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="translate" values="0 0; 78 -38; 156 -76; 245 -115; 345 -155" dur="20s" begin="0.3s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.1;0.08;0.05;0" dur="20s" begin="0.3s" repeatCount="indefinite"/>
            </path>
            <path d="M205 330 Q210 325 216 321" stroke="#5d4037" strokeWidth="0.7" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="translate" values="0 0; 78 -38; 156 -76; 245 -115; 345 -155" dur="20s" begin="0.3s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.1;0.08;0.05;0" dur="20s" begin="0.3s" repeatCount="indefinite"/>
            </path>

            {/* Птица 3 — справа от лидера */}
            <path d="M238 335 Q233 330 227 326" stroke="#5d4037" strokeWidth="0.7" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="translate" values="0 0; 82 -42; 164 -84; 255 -125; 355 -165" dur="20s" begin="0.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.1;0.08;0.04;0" dur="20s" begin="0.5s" repeatCount="indefinite"/>
            </path>
            <path d="M238 335 Q243 330 249 326" stroke="#5d4037" strokeWidth="0.7" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="translate" values="0 0; 82 -42; 164 -84; 255 -125; 355 -165" dur="20s" begin="0.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.1;0.08;0.04;0" dur="20s" begin="0.5s" repeatCount="indefinite"/>
            </path>

            {/* Птица 4 — дальше слева */}
            <path d="M192 345 Q188 341 183 338" stroke="#5d4037" strokeWidth="0.6" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="translate" values="0 0; 75 -35; 150 -70; 240 -110; 340 -150" dur="20s" begin="0.8s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.08;0.06;0.03;0" dur="20s" begin="0.8s" repeatCount="indefinite"/>
            </path>
            <path d="M192 345 Q196 341 201 338" stroke="#5d4037" strokeWidth="0.6" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="translate" values="0 0; 75 -35; 150 -70; 240 -110; 340 -150" dur="20s" begin="0.8s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.08;0.06;0.03;0" dur="20s" begin="0.8s" repeatCount="indefinite"/>
            </path>

            {/* Птица 5 — дальше справа */}
            <path d="M252 348 Q247 343 242 340" stroke="#5d4037" strokeWidth="0.6" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="translate" values="0 0; 84 -44; 168 -88; 260 -130; 360 -170" dur="20s" begin="1s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.08;0.06;0.03;0" dur="20s" begin="1s" repeatCount="indefinite"/>
            </path>
            <path d="M252 348 Q257 343 262 340" stroke="#5d4037" strokeWidth="0.6" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="translate" values="0 0; 84 -44; 168 -88; 260 -130; 360 -170" dur="20s" begin="1s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.08;0.06;0.03;0" dur="20s" begin="1s" repeatCount="indefinite"/>
            </path>

            {/* Птицы 6-7 — хвост стаи */}
            <path d="M182 360 Q178 356 174 353" stroke="#5d4037" strokeWidth="0.5" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="translate" values="0 0; 72 -32; 144 -64; 230 -100; 330 -140" dur="20s" begin="1.3s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.06;0.05;0.02;0" dur="20s" begin="1.3s" repeatCount="indefinite"/>
            </path>
            <path d="M182 360 Q186 356 190 353" stroke="#5d4037" strokeWidth="0.5" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="translate" values="0 0; 72 -32; 144 -64; 230 -100; 330 -140" dur="20s" begin="1.3s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.06;0.05;0.02;0" dur="20s" begin="1.3s" repeatCount="indefinite"/>
            </path>

            <path d="M265 358 Q261 354 257 351" stroke="#5d4037" strokeWidth="0.5" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="translate" values="0 0; 86 -46; 172 -92; 265 -135; 365 -175" dur="20s" begin="1.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.06;0.05;0.02;0" dur="20s" begin="1.5s" repeatCount="indefinite"/>
            </path>
            <path d="M265 358 Q269 354 273 351" stroke="#5d4037" strokeWidth="0.5" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="translate" values="0 0; 86 -46; 172 -92; 265 -135; 365 -175" dur="20s" begin="1.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.06;0.05;0.02;0" dur="20s" begin="1.5s" repeatCount="indefinite"/>
            </path>
          </g>
        </svg>
      </div>

      {tab === 'tree' && (
        <FamilyTree
          members={members}
          onRefresh={loadData}
          loading={loading}
          onAddClick={() => setModal('member')}
          onCardClick={(member) => { setSelectedMember(member); setModal('detail') }}
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

      {/* Модалка: карточка члена семьи */}
      {modal === 'detail' && selectedMember && (() => {
        const spouse = selectedMember.spouseId ? members.find(m => m.id === selectedMember.spouseId) : null
        const parent1 = selectedMember.parent1Id ? members.find(m => m.id === selectedMember.parent1Id) : null
        const parent2 = selectedMember.parent2Id ? members.find(m => m.id === selectedMember.parent2Id) : null
        const children = members.filter(m => m.parent1Id === selectedMember.id || m.parent2Id === selectedMember.id)
        const hasBirthday = birthdays.some(b => b.name === selectedMember.name)

        return (
          <Modal title={`${selectedMember.emoji} ${selectedMember.name}`} onClose={() => { setModal(null); setSelectedMember(null) }}>
            <div className="detail-card">
              <div className="detail-emoji">{selectedMember.emoji}</div>
              <div className="detail-name">{selectedMember.name}</div>
              <div className="detail-relation">{selectedMember.relation}</div>
            </div>

            {(parent1 || parent2) && (
              <div className="detail-section">
                <div className="detail-label">Родители</div>
                {parent1 && <div className="detail-value">{parent1.emoji} {parent1.name} ({parent1.relation})</div>}
                {parent2 && <div className="detail-value">{parent2.emoji} {parent2.name} ({parent2.relation})</div>}
              </div>
            )}

            {spouse && (
              <div className="detail-section">
                <div className="detail-label">Супруг(а)</div>
                <div className="detail-value">❤️ {spouse.emoji} {spouse.name} ({spouse.relation})</div>
              </div>
            )}

            {children.length > 0 && (
              <div className="detail-section">
                <div className="detail-label">Дети</div>
                {children.map(c => (
                  <div key={c.id} className="detail-value">{c.emoji} {c.name} ({c.relation})</div>
                ))}
              </div>
            )}

            {hasBirthday ? (
              <div className="detail-section">
                <div className="detail-label">День рождения</div>
                <div className="detail-value">
                  🎂 {(() => {
                    const b = birthdays.find(b => b.name === selectedMember.name)
                    if (!b || !b.date) return '—'
                    const [, m, d] = b.date.split('-')
                    const names = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
                    return `${Number(d)} ${names[Number(m) - 1]}`
                  })()}
                </div>
              </div>
            ) : (
              <button className="submit-btn" style={{ marginTop: 16 }} onClick={() => {
                setBdayForm({ name: selectedMember.name, date: '', emoji: selectedMember.emoji })
                setSelectedMember(null)
                setModal('birthday')
              }}>
                🎂 Добавить день рождения
              </button>
            )}

            <button className="delete-btn" onClick={async () => {
              if (!confirm(`Удалить ${selectedMember.name}?`)) return
              const r = await removeMember(selectedMember.id)
              if (r.success) {
                const updated = members.filter(m => m.id !== selectedMember.id)
                localStorage.setItem('family_tree_cache', JSON.stringify(updated))
                setMembers(updated)
              }
              setSelectedMember(null)
              setModal(null)
            }}>
              Удалить из дерева
            </button>
          </Modal>
        )
      })()}

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
