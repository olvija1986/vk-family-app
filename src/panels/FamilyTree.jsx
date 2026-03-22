import { useState } from 'react'
import {
  Panel,
  PanelHeader,
  Group,
  Header,
  SimpleCell,
  Avatar,
  InfoRow,
  Button,
  FormItem,
  Input,
  Select,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  PanelHeaderButton,
  Div,
} from '@vkontakte/vkui'
import { Icon24Dismiss, Icon24Add, Icon28Users3Outline } from '@vkontakte/icons'
import './FamilyTree.css'

const INITIAL_MEMBERS = [
  { id: 1, name: 'Дедушка', relation: 'Дедушка', parentId: null, generation: 0, emoji: '👴' },
  { id: 2, name: 'Бабушка', relation: 'Бабушка', parentId: null, generation: 0, emoji: '👵' },
  { id: 3, name: 'Папа', relation: 'Отец', parentId: 1, generation: 1, emoji: '👨' },
  { id: 4, name: 'Мама', relation: 'Мать', parentId: 2, generation: 1, emoji: '👩' },
  { id: 5, name: 'Я', relation: 'Сын/Дочь', parentId: 3, generation: 2, emoji: '🧑' },
]

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

export default function FamilyTree({ id }) {
  const [members, setMembers] = useState(INITIAL_MEMBERS)
  const [activeModal, setActiveModal] = useState(null)
  const [newMember, setNewMember] = useState({ name: '', relation: RELATIONS[0], parentId: '' })

  const addMember = () => {
    if (!newMember.name.trim()) return
    const parent = members.find(m => m.id === Number(newMember.parentId))
    const member = {
      id: Date.now(),
      name: newMember.name.trim(),
      relation: newMember.relation,
      parentId: newMember.parentId ? Number(newMember.parentId) : null,
      generation: parent ? parent.generation + 1 : 0,
      emoji: EMOJIS[newMember.relation] || '🧑',
    }
    setMembers([...members, member])
    setNewMember({ name: '', relation: RELATIONS[0], parentId: '' })
    setActiveModal(null)
  }

  const removeMember = (memberId) => {
    setMembers(members.filter(m => m.id !== memberId))
  }

  const generations = {}
  members.forEach(m => {
    if (!generations[m.generation]) generations[m.generation] = []
    generations[m.generation].push(m)
  })

  const generationLabels = ['Старшее поколение', 'Родители', 'Дети', 'Внуки', 'Правнуки']

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id="add-member"
        header={
          <ModalPageHeader
            before={<PanelHeaderButton onClick={() => setActiveModal(null)}><Icon24Dismiss /></PanelHeaderButton>}
          >
            Добавить члена семьи
          </ModalPageHeader>
        }
      >
        <FormItem top="Имя">
          <Input
            value={newMember.name}
            onChange={e => setNewMember({ ...newMember, name: e.target.value })}
            placeholder="Введите имя"
          />
        </FormItem>
        <FormItem top="Родственная связь">
          <Select
            value={newMember.relation}
            onChange={e => setNewMember({ ...newMember, relation: e.target.value })}
            options={RELATIONS.map(r => ({ label: r, value: r }))}
          />
        </FormItem>
        <FormItem top="Родитель (необязательно)">
          <Select
            value={newMember.parentId}
            onChange={e => setNewMember({ ...newMember, parentId: e.target.value })}
            options={[
              { label: 'Нет', value: '' },
              ...members.map(m => ({ label: `${m.emoji} ${m.name} (${m.relation})`, value: String(m.id) }))
            ]}
          />
        </FormItem>
        <Div>
          <Button size="l" stretched onClick={addMember}>
            Добавить
          </Button>
        </Div>
      </ModalPage>
    </ModalRoot>
  )

  return (
    <Panel id={id} modal={modal}>
      <PanelHeader>Семейное дерево</PanelHeader>

      <Div>
        <Button
          size="l"
          stretched
          before={<Icon24Add />}
          onClick={() => setActiveModal('add-member')}
        >
          Добавить члена семьи
        </Button>
      </Div>

      <div className="family-tree">
        {Object.keys(generations)
          .sort((a, b) => Number(a) - Number(b))
          .map(gen => (
            <Group
              key={gen}
              header={<Header mode="secondary">{generationLabels[gen] || `Поколение ${Number(gen) + 1}`}</Header>}
            >
              <div className="generation-row">
                {generations[gen].map(member => (
                  <div key={member.id} className="family-member-card">
                    <div className="member-emoji">{member.emoji}</div>
                    <div className="member-name">{member.name}</div>
                    <div className="member-relation">{member.relation}</div>
                    {member.parentId && (
                      <div className="member-parent">
                        ↑ {members.find(m => m.id === member.parentId)?.name || ''}
                      </div>
                    )}
                    <button
                      className="member-remove"
                      onClick={() => removeMember(member.id)}
                      title="Удалить"
                    >
                      ✕
                    </button>
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
    </Panel>
  )
}
