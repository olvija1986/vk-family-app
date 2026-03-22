import { useState } from 'react'
import {
  Panel, PanelHeader, Group, Header, Button, FormItem, Input, Select,
  ModalRoot, ModalPage, ModalPageHeader, PanelHeaderButton, Div, Spinner, Snackbar,
} from '@vkontakte/vkui'
import { Icon24Dismiss, Icon24Add, Icon28Users3Outline } from '@vkontakte/icons'
import { addMember as apiAddMember, removeMember as apiRemoveMember } from '../api'
import './FamilyTree.css'

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

export default function FamilyTree({ id, members, onRefresh, loading }) {
  const [activeModal, setActiveModal] = useState(null)
  const [newMember, setNewMember] = useState({ name: '', relation: RELATIONS[0], parentId: '' })
  const [saving, setSaving] = useState(false)
  const [snackbar, setSnackbar] = useState(null)

  const showMessage = (text) => {
    setSnackbar(<Snackbar onClose={() => setSnackbar(null)} duration={2000}>{text}</Snackbar>)
  }

  const handleAdd = async () => {
    if (!newMember.name.trim()) return
    setSaving(true)
    const parent = members.find(m => String(m.id) === String(newMember.parentId))
    const result = await apiAddMember({
      name: newMember.name.trim(),
      relation: newMember.relation,
      emoji: EMOJIS[newMember.relation] || '🧑',
      parentId: newMember.parentId || '',
      generation: parent ? parent.generation + 1 : 0,
    })
    setSaving(false)
    if (result.success || result.id) {
      setNewMember({ name: '', relation: RELATIONS[0], parentId: '' })
      setActiveModal(null)
      showMessage('✅ Добавлено!')
      onRefresh()
    } else {
      showMessage('❌ Ошибка при добавлении')
    }
  }

  const handleRemove = async (memberId) => {
    const result = await apiRemoveMember(memberId)
    if (result.success) { showMessage('🗑 Удалено'); onRefresh() }
    else { showMessage('❌ Ошибка при удалении') }
  }

  const generations = {}
  members.forEach(m => {
    const gen = m.generation || 0
    if (!generations[gen]) generations[gen] = []
    generations[gen].push(m)
  })
  const generationLabels = ['Старшее поколение', 'Родители', 'Дети', 'Внуки', 'Правнуки']

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage id="add-member" header={
        <ModalPageHeader before={<PanelHeaderButton onClick={() => setActiveModal(null)}><Icon24Dismiss /></PanelHeaderButton>}>
          Добавить члена семьи
        </ModalPageHeader>
      }>
        <FormItem top="Имя">
          <Input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="Введите имя" />
        </FormItem>
        <FormItem top="Родственная связь">
          <Select value={newMember.relation} onChange={e => setNewMember({ ...newMember, relation: e.target.value })} options={RELATIONS.map(r => ({ label: r, value: r }))} />
        </FormItem>
        <FormItem top="Родитель (необязательно)">
          <Select value={newMember.parentId} onChange={e => setNewMember({ ...newMember, parentId: e.target.value })} options={[{ label: 'Нет', value: '' }, ...members.map(m => ({ label: `${m.emoji} ${m.name} (${m.relation})`, value: String(m.id) }))]} />
        </FormItem>
        <Div><Button size="l" stretched onClick={handleAdd} loading={saving}>Добавить</Button></Div>
      </ModalPage>
    </ModalRoot>
  )

  return (
    <Panel id={id} modal={modal}>
      <PanelHeader>Семейное дерево</PanelHeader>
      <Div><Button size="l" stretched before={<Icon24Add />} onClick={() => setActiveModal('add-member')}>Добавить члена семьи</Button></Div>
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Spinner size="large" /></Div>
      ) : (
        <>
          <div className="family-tree">
            {Object.keys(generations).sort((a, b) => Number(a) - Number(b)).map(gen => (
              <Group key={gen} header={<Header mode="secondary">{generationLabels[gen] || `Поколение ${Number(gen) + 1}`}</Header>}>
                <div className="generation-row">
                  {generations[gen].map(member => (
                    <div key={member.id} className="family-member-card">
                      <div className="member-emoji">{member.emoji}</div>
                      <div className="member-name">{member.name}</div>
                      <div className="member-relation">{member.relation}</div>
                      {member.parentId && <div className="member-parent">↑ {members.find(m => String(m.id) === String(member.parentId))?.name || ''}</div>}
                      <button className="member-remove" onClick={() => handleRemove(member.id)} title="Удалить">✕</button>
                    </div>
                  ))}
                </div>
              </Group>
            ))}
          </div>
          {members.length === 0 && (
            <Div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <Icon28Users3Outline width={64} height={64} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div>Добавьте первого члена семьи</div>
            </Div>
          )}
        </>
      )}
      {snackbar}
    </Panel>
  )
}
