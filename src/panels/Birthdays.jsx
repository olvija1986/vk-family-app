import { useState } from 'react'
import { removeBirthday as apiRemoveBirthday } from '../api'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

function formatDate(d) {
  if (!d) return ''
  const [, m, day] = d.split('-')
  const names = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
  return `${Number(day)} ${names[Number(m) - 1]}`
}

function getAge(d) {
  if (!d) return 0
  const t = new Date(), b = new Date(d)
  let a = t.getFullYear() - b.getFullYear()
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--
  return a
}

function daysUntil(d) {
  if (!d) return 999
  const t = new Date(); t.setHours(0,0,0,0)
  const [, m, day] = d.split('-')
  let n = new Date(t.getFullYear(), Number(m)-1, Number(day))
  if (n < t) n = new Date(t.getFullYear()+1, Number(m)-1, Number(day))
  return Math.ceil((n - t) / 86400000)
}

function plural(n) {
  const a = Math.abs(n) % 100, l = a % 10
  if (a > 10 && a < 20) return 'дней'
  if (l === 1) return 'день'
  if (l >= 2 && l <= 4) return 'дня'
  return 'дней'
}

export default function Birthdays({ birthdays, onRefresh, loading, onAddClick }) {
  const [msg, setMsg] = useState(null)

  const showMsg = (text) => { setMsg(text); setTimeout(() => setMsg(null), 2000) }

  const handleRemove = async (id) => {
    const r = await apiRemoveBirthday(id)
    if (r.success) { showMsg('🗑 Удалено'); onRefresh() }
    else { showMsg('❌ Ошибка') }
  }

  const sorted = [...birthdays].sort((a, b) => daysUntil(a.date) - daysUntil(b.date))
  const nearest = sorted[0]
  const nearestDays = nearest ? daysUntil(nearest.date) : null

  const byMonth = {}
  sorted.forEach(b => {
    if (!b.date) return
    const m = Number(b.date.split('-')[1]) - 1
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(b)
  })

  return (
    <div>
      <div className="panel-header">🎂 Дни рождения</div>
      <div className="panel-content">
        {!loading && nearest && (
          <div className="nearest-birthday">
            <div className="nearest-emoji">🎂</div>
            <div className="nearest-info">
              <div className="nearest-name">Ближайший: {nearest.emoji} {nearest.name}</div>
              <div className="nearest-date">
                {nearestDays === 0 ? '🎉 Сегодня!' : `Через ${nearestDays} ${plural(nearestDays)}`}
              </div>
            </div>
          </div>
        )}

        <button className="add-btn" onClick={onAddClick}>＋ Добавить день рождения</button>

        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            {Object.keys(byMonth).sort((a,b) => Number(a)-Number(b)).map(month => (
              <div key={month}>
                <div className="section-title">{MONTHS[month]}</div>
                {byMonth[month].map(entry => {
                  const d = daysUntil(entry.date)
                  return (
                    <div key={entry.id} className="birthday-row">
                      <div className="birthday-emoji">{entry.emoji}</div>
                      <div className="birthday-info">
                        <div className="birthday-name">{entry.name}</div>
                        <div className="birthday-date">{formatDate(entry.date)} · {getAge(entry.date)} лет</div>
                      </div>
                      <div className="birthday-after">
                        <span className={`days-badge ${d===0?'today':d<=7?'soon':''}`}>
                          {d===0?'🎉 Сегодня':`${d} ${plural(d)}`}
                        </span>
                        <button className="birthday-remove" onClick={() => handleRemove(entry.id)}>✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {birthdays.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🎁</div>
                <div>Добавьте первый день рождения</div>
              </div>
            )}
          </>
        )}
      </div>
      {msg && <div className="snackbar">{msg}</div>}
    </div>
  )
}
