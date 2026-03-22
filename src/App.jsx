import { useState } from 'react'
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
import FamilyTree from './panels/FamilyTree'
import Birthdays from './panels/Birthdays'

export default function App() {
  const [activeStory, setActiveStory] = useState('tree')

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
            <FamilyTree id="tree-panel" />
          </View>
          <View id="birthdays" activePanel="birthdays-panel">
            <Birthdays id="birthdays-panel" />
          </View>
        </Epic>
      </SplitCol>
    </SplitLayout>
  )
}
