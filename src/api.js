const API_URL = 'https://script.google.com/macros/s/AKfycbxGTjVI7A11pvIRatRb1cTd-WcEOHvDlMIPjmIEa0GJXHlMogiTlSPBdNCTpejqvf-lGA/exec'

const CACHE_TREE = 'family_tree_cache'
const CACHE_BIRTHDAYS = 'birthdays_cache'

export async function fetchAll() {
  if (!API_URL) {
    return {
      tree: JSON.parse(localStorage.getItem(CACHE_TREE) || '[]'),
      birthdays: JSON.parse(localStorage.getItem(CACHE_BIRTHDAYS) || '[]'),
    }
  }

  try {
    const res = await fetch(`${API_URL}?action=getAll`)
    const data = await res.json()

    const tree = (data.tree || []).map(row => ({
      id: String(row.id),
      name: row.name,
      relation: row.relation,
      emoji: row.emoji || '🧑',
      parentId: row.parentId ? String(row.parentId) : null,
      generation: Number(row.generation) || 0,
    }))

    const birthdays = (data.birthdays || []).map(row => ({
      id: String(row.id),
      name: row.name,
      date: formatDateFromSheet(row.date),
      emoji: row.emoji || '🧑',
    }))

    localStorage.setItem(CACHE_TREE, JSON.stringify(tree))
    localStorage.setItem(CACHE_BIRTHDAYS, JSON.stringify(birthdays))

    return { tree, birthdays }
  } catch (err) {
    console.error('Ошибка загрузки данных:', err)
    return {
      tree: JSON.parse(localStorage.getItem(CACHE_TREE) || '[]'),
      birthdays: JSON.parse(localStorage.getItem(CACHE_BIRTHDAYS) || '[]'),
    }
  }
}

async function postData(body) {
  if (!API_URL) return { success: true, id: String(Date.now()) }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
    })
    return await res.json()
  } catch (err) {
    console.error('Ошибка отправки:', err)
    return { success: false, error: err.message }
  }
}

export async function addMember({ name, relation, emoji, parentId, generation }) {
  return postData({ action: 'addMember', name, relation, emoji, parentId, generation })
}

export async function removeMember(id) {
  return postData({ action: 'removeMember', id })
}

export async function addBirthday({ name, date, emoji }) {
  return postData({ action: 'addBirthday', name, date, emoji })
}

export async function removeBirthday(id) {
  return postData({ action: 'removeBirthday', id })
}

function formatDateFromSheet(date) {
  if (!date) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  try {
    const d = new Date(date)
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
  } catch (e) {}
  return String(date)
}
