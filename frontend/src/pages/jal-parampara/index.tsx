import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageScope } from '../../components/PageScope'
import { useLegacyPage, type LegacyContext } from '../../lib/legacy'
import { initJalParampara } from './engine.js'
import { JalMarkup } from './Markup'
import './jal-parampara.page.css'

export default function JalParamparaPage() {
  const { me, isGuest, refreshMe } = useAuth()
  const navigate = useNavigate()
  const ref = useLegacyPage(
    (root: HTMLElement, ctx: LegacyContext) => initJalParampara(root, ctx, { onScore: () => refreshMe() }),
    { me, isGuest, navigate },
  )
  return (
    <PageScope name="jal-parampara" title="JalParampara — Yesterday's Wisdom. Tomorrow's Water. · MIRAVA">
      <div ref={ref}>
        <JalMarkup />
      </div>
    </PageScope>
  )
}
