// =============================================
// API для работы с Google Sheets
// =============================================

const API_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || ''

const CACHE_TREE = 'family_tree_cache'
const CACHE_BIRTHDAYS = 'birthdays_cache'

const REQUEST_TIMEOUT_MS = 10000

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timer)
  }
}


export async function fetchAll() {
  if (!API_URL) {
    return {
      tree: JSON.parse(localStorage.getItem(CACHE_TREE) || '[]'),
      birthdays: JSON.parse(localStorage.getItem(CACHE_BIRTHDAYS) || '[]'),
    }
  }

  try {
    const res = await fetchWithTimeout(`${API_URL}?action=getAll`)
    const data = await res.json()

    const tree = (data.tree || []).map(row => ({
      id: String(row.id),
      name: row.name || '',
      relation: row.relation || '',
      emoji: row.emoji || '🧑',
      parent1Id: row.parent1Id ? String(row.parent1Id) : '',
      parent2Id: row.parent2Id ? String(row.parent2Id) : '',
      spouseId: row.spouseId ? String(row.spouseId) : '',
      generation: Number(row.generation) || 0,
    }))

    const birthdays = (data.birthdays || []).map(row => ({
      id: String(row.id),
      name: row.name || '',
      date: formatDateFromSheet(row.date),
      emoji: row.emoji || '🧑',
    }))

    localStorage.setItem(CACHE_TREE, JSON.stringify(tree))
    localStorage.setItem(CACHE_BIRTHDAYS, JSON.stringify(birthdays))
    return { tree, birthdays }
  } catch (err) {
    console.error('Ошибка загрузки:', err)
    return {
      tree: JSON.parse(localStorage.getItem(CACHE_TREE) || '[]'),
      birthdays: JSON.parse(localStorage.getItem(CACHE_BIRTHDAYS) || '[]'),
    }
  }
}

async function postData(body) {
  if (!API_URL) {
    console.warn('API_URL не задан — сохраняем локально')
    return { success: true, id: String(Date.now()) }
  }
  try {
    const res = await fetchWithTimeout(API_URL, {
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

export async function addMember(data) {
  return postData({ action: 'addMember', ...data })
}

export async function updateMember(data) {
  return postData({ action: 'updateMember', ...data })
}

export async function removeMember(id) {
  return postData({ action: 'removeMember', id })
}

export async function addBirthday(data) {
  return postData({ action: 'addBirthday', ...data })
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
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    }
  } catch {
    return String(date)
  }
  return String(date)
}
