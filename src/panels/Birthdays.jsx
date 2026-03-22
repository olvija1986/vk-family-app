import { useState } from 'react'
import {
  Panel, PanelHeader, Group, Header, SimpleCell, Button, FormItem, Input,
  Div, ModalRoot, ModalPage, ModalPageHeader, PanelHeaderButton, Spinner, Snackbar,
} from '@vkontakte/vkui'
import { Icon24Dismiss, Icon24Add, Icon28GiftOutline } from '@vkontakte/icons'
import { addBirthday as apiAddBirthday, removeBirthday as apiRemoveBirthday } from '../api'
import './Birthdays.css'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [, month, day] = dateStr.split('-')
  const names = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
  return `${Number(day)} ${names[Number(month) - 1]}`
}

function getAge(dateStr) {
  if (!dateStr) return 0
  const today = new Date(), birth = new Date(dateStr)
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
  return age
}

function getDaysUntil(dateStr) {
  if (!dateStr) return 999
  const today = new Date(); today.setHours(0,0,0,0)
  const [, month, day] = dateStr.split('-')
  let next = new Date(today.getFullYear(), Number(month)-1, Number(day))
  if (next < today) next = new Date(today.getFullYear()+1, Number(month)-1, Number(day))
  return Math.ceil((next - today) / 86400000)
}

function pluralDays(n) {
  const abs = Math.abs(n) % 100, last = abs % 10
  if (abs > 10 && abs < 20) return 'дней'
  if (last === 1) return 'день'
  if (last >= 2 && last <= 4) return 'дня'
  return 'дней'
}

export default function Birthdays({ id, birthdays, onRefresh, loading }) {
  const [activeModal, setActiveModal] = useState(null)
  const [newEntry, setNewEntry] = useState({ name: '', date: '', emoji: '🧑' })
  const [saving, setSaving] = useState(false)
  const [snackbar, setSnackbar] = useState(null)

  const showMessage = (text) => {
    setSnackbar(<Snackbar onClose={() => setSnackbar(null)} duration={2000}>{text}</Snackbar>)
  }

  const handleAdd = async () => {
    if (!newEntry.name.trim() || !newEntry.date) return
    setSaving(true)
    const result = await apiAddBirthday({ name: newEntry.name.trim(), date: newEntry.date, emoji: newEntry.emoji || '🧑' })
    setSaving(false)
    if (result.success || result.id) {
      setNewEntry({ name: '', date: '', emoji: '🧑' }); setActiveModal(null)
      showMessage('✅ Добавлено!'); onRefresh()
    } else { showMessage('❌ Ошибка при добавлении') }
  }

  const handleRemove = async (entryId) => {
    const result = await apiRemoveBirthday(entryId)
    if (result.success) { showMessage('🗑 Удалено'); onRefresh() }
    else { showMessage('❌ Ошибка при удалении') }
  }

  const sorted = [...birthdays].sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date))
  const nearest = sorted[0], nearestDays = nearest ? getDaysUntil(nearest.date) : null

  const byMonth = {}
  sorted.forEach(b => { if (!b.date) return; const m = Number(b.date.split('-')[1])-1; if (!byMonth[m]) byMonth[m]=[]; byMonth[m].push(b) })

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage id="add-birthday" header={
        <ModalPageHeader before={<PanelHeaderButton onClick={() => setActiveModal(null)}><Icon24Dismiss /></PanelHeaderButton>}>
          Добавить день рождения
        </ModalPageHeader>
      }>
        <FormItem top="Имя"><Input value={newEntry.name} onChange={e => setNewEntry({ ...newEntry, name: e.target.value })} placeholder="Введите имя" /></FormItem>
        <FormItem top="Дата рождения"><Input type="date" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })} /></FormItem>
        <FormItem top="Эмодзи (необязательно)"><Input value={newEntry.emoji} onChange={e => setNewEntry({ ...newEntry, emoji: e.target.value })} placeholder="🧑" maxLength={2} /></FormItem>
        <Div><Button size="l" stretched onClick={handleAdd} loading={saving}>Добавить</Button></Div>
      </ModalPage>
    </ModalRoot>
  )

  return (
    <Panel id={id} modal={modal}>
      <PanelHeader>Дни рождения</PanelHeader>
      {!loading && nearest && (
        <Div>
          <div className="nearest-birthday">
            <div className="nearest-emoji">🎂</div>
            <div className="nearest-info">
              <div className="nearest-name">Ближайший: {nearest.emoji} {nearest.name}</div>
              <div className="nearest-date">{nearestDays === 0 ? '🎉 Сегодня!' : `Через ${nearestDays} ${pluralDays(nearestDays)}`}</div>
            </div>
          </div>
        </Div>
      )}
      <Div><Button size="l" stretched before={<Icon24Add />} onClick={() => setActiveModal('add-birthday')}>Добавить день рождения</Button></Div>
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Spinner size="large" /></Div>
      ) : (
        <>
          {Object.keys(byMonth).sort((a,b) => Number(a)-Number(b)).map(month => (
            <Group key={month} header={<Header mode="secondary">{MONTHS[month]}</Header>}>
              {byMonth[month].map(entry => {
                const days = getDaysUntil(entry.date)
                return (
                  <SimpleCell key={entry.id} before={<div className="birthday-emoji">{entry.emoji}</div>}
                    subtitle={`${formatDate(entry.date)} · ${getAge(entry.date)} лет`}
                    after={<div className="birthday-after">
                      <span className={`days-badge ${days===0?'today':days<=7?'soon':''}`}>{days===0?'🎉 Сегодня':`${days} ${pluralDays(days)}`}</span>
                      <button className="birthday-remove" onClick={e => { e.stopPropagation(); handleRemove(entry.id) }}>✕</button>
                    </div>}
                  >{entry.name}</SimpleCell>
                )
              })}
            </Group>
          ))}
          {birthdays.length === 0 && (
            <Div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <Icon28GiftOutline width={64} height={64} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div>Добавьте первый день рождения</div>
            </Div>
          )}
        </>
      )}
      {snackbar}
    </Panel>
  )
}
