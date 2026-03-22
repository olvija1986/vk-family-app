import { useState, useEffect, useCallback } from 'react'
import {
  SplitLayout,
  SplitCol,
  View,
  Epic,
  Tabbar,
  TabbarItem,
} from '@vkontakte/vkui'
import {
  Icon28Users3Outline,
  Icon28GiftOutline,
} from '@vkontakte/icons'
import { fetchAll } from './api'
import FamilyTree from './panels/FamilyTree'
import Birthdays from './panels/Birthdays'

export default function App() {
  const [activeStory, setActiveStory] = useState('tree')
  const [members, setMembers] = useState([])
  const [birthdays, setBirthdays] = useState([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <SplitLayout>
      <SplitCol>
        <Epic
          activeStory={activeStory}
          tabbar={
            <Tabbar>
              <TabbarItem
                onClick={() => setActiveStory('tree')}
                selected={activeStory === 'tree'}
                text="Семейное дерево"
              >
                <Icon28Users3Outline />
              </TabbarItem>
              <TabbarItem
                onClick={() => setActiveStory('birthdays')}
                selected={activeStory === 'birthdays'}
                text="Дни рождения"
              >
                <Icon28GiftOutline />
              </TabbarItem>
            </Tabbar>
          }
        >
          <View id="tree" activePanel="tree-panel">
            <FamilyTree
              id="tree-panel"
              members={members}
              onRefresh={loadData}
              loading={loading}
            />
          </View>
          <View id="birthdays" activePanel="birthdays-panel">
            <Birthdays
              id="birthdays-panel"
              birthdays={birthdays}
              onRefresh={loadData}
              loading={loading}
            />
          </View>
        </Epic>
      </SplitCol>
    </SplitLayout>
  )
}
