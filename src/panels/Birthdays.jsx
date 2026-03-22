import { useState } from 'react'
import {
  Panel,
  PanelHeader,
  Group,
  Header,
  SimpleCell,
  Button,
  FormItem,
  Input,
  Div,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  PanelHeaderButton,
  Banner,
} from '@vkontakte/vkui'
import { Icon24Dismiss, Icon24Add, Icon28GiftOutline } from '@vkontakte/icons'
import './Birthdays.css'

const INITIAL_BIRTHDAYS = [
  { id: 1, name: 'Дедушка', date: '1950-03-15', emoji: '👴' },
  { id: 2, name: 'Бабушка', date: '1952-07-22', emoji: '👵' },
  { id: 3, name: 'Папа', date: '1975-11-08', emoji: '👨' },
  { id: 4, name: 'Мама', date: '1978-05-30', emoji: '👩' },
  { id: 5, name: 'Я', date: '2000-01-12', emoji: '🧑' },
]

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

function formatDate(dateStr) {
  const [, month, day] = dateStr.split('-')
  return `${Number(day)} ${MONTHS[Number(month) - 1].toLowerCase().slice(0, -1)}я`
}

function getAge(dateStr) {
  const today = new Date()
  const birth = new Date(dateStr)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function getDaysUntilBirthday(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [, month, day] = dateStr.split('-')
  let next = new Date(today.getFullYear(), Number(month) - 1, Number(day))
  if (next < today) {
    next = new Date(today.getFullYear() + 1, Number(month) - 1, Number(day))
  }
  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
  return diff
}

function pluralDays(n) {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return 'дней'
  if (last === 1) return 'день'
  if (last >= 2 && last <= 4) return 'дня'
  return 'дней'
}

export default function Birthdays({ id }) {
  const [birthdays, setBirthdays] = useState(INITIAL_BIRTHDAYS)
  const [activeModal, setActiveModal] = useState(null)
  const [newEntry, setNewEntry] = useState({ name: '', date: '', emoji: '🧑' })

  const addBirthday = () => {
    if (!newEntry.name.trim() || !newEntry.date) return
    setBirthdays([...birthdays, {
      id: Date.now(),
      name: newEntry.name.trim(),
      date: newEntry.date,
      emoji: newEntry.emoji || '🧑',
    }])
    setNewEntry({ name: '', date: '', emoji: '🧑' })
    setActiveModal(null)
  }

  const removeBirthday = (entryId) => {
    setBirthdays(birthdays.filter(b => b.id !== entryId))
  }

  const sorted = [...birthdays].sort((a, b) => getDaysUntilBirthday(a.date) - getDaysUntilBirthday(b.date))

  const nearest = sorted[0]
  const nearestDays = nearest ? getDaysUntilBirthday(nearest.date) : null

  const byMonth = {}
  sorted.forEach(b => {
    const month = Number(b.date.split('-')[1]) - 1
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(b)
  })

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id="add-birthday"
        header={
          <ModalPageHeader
            before={<PanelHeaderButton onClick={() => setActiveModal(null)}><Icon24Dismiss /></PanelHeaderButton>}
          >
            Добавить день рождения
          </ModalPageHeader>
        }
      >
        <FormItem top="Имя">
          <Input
            value={newEntry.name}
            onChange={e => setNewEntry({ ...newEntry, name: e.target.value })}
            placeholder="Введите имя"
          />
        </FormItem>
        <FormItem top="Дата рождения">
          <Input
            type="date"
            value={newEntry.date}
            onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
          />
        </FormItem>
        <FormItem top="Эмодзи (необязательно)">
          <Input
            value={newEntry.emoji}
            onChange={e => setNewEntry({ ...newEntry, emoji: e.target.value })}
            placeholder="🧑"
            maxLength={2}
          />
        </FormItem>
        <Div>
          <Button size="l" stretched onClick={addBirthday}>
            Добавить
          </Button>
        </Div>
      </ModalPage>
    </ModalRoot>
  )

  return (
    <Panel id={id} modal={modal}>
      <PanelHeader>Дни рождения</PanelHeader>

      {nearest && (
        <Div>
          <div className="nearest-birthday">
            <div className="nearest-emoji">🎂</div>
            <div className="nearest-info">
              <div className="nearest-name">Ближайший: {nearest.emoji} {nearest.name}</div>
              <div className="nearest-date">
                {nearestDays === 0
                  ? '🎉 Сегодня!'
                  : `Через ${nearestDays} ${pluralDays(nearestDays)}`
                }
              </div>
            </div>
          </div>
        </Div>
      )}

      <Div>
        <Button
          size="l"
          stretched
          before={<Icon24Add />}
          onClick={() => setActiveModal('add-birthday')}
        >
          Добавить день рождения
        </Button>
      </Div>

      {Object.keys(byMonth)
        .sort((a, b) => Number(a) - Number(b))
        .map(month => (
          <Group key={month} header={<Header mode="secondary">{MONTHS[month]}</Header>}>
            {byMonth[month].map(entry => {
              const days = getDaysUntilBirthday(entry.date)
              return (
                <SimpleCell
                  key={entry.id}
                  before={<div className="birthday-emoji">{entry.emoji}</div>}
                  subtitle={`${formatDate(entry.date)} · ${getAge(entry.date)} лет`}
                  after={
                    <div className="birthday-after">
                      <span className={`days-badge ${days === 0 ? 'today' : days <= 7 ? 'soon' : ''}`}>
                        {days === 0 ? '🎉 Сегодня' : `${days} ${pluralDays(days)}`}
                      </span>
                      <button
                        className="birthday-remove"
                        onClick={(e) => { e.stopPropagation(); removeBirthday(entry.id); }}
                      >
                        ✕
                      </button>
                    </div>
                  }
                >
                  {entry.name}
                </SimpleCell>
              )
            })}
          </Group>
        ))
      }

      {birthdays.length === 0 && (
        <Div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          <Icon28GiftOutline width={64} height={64} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>Добавьте первый день рождения</div>
        </Div>
      )}
    </Panel>
  )
}
