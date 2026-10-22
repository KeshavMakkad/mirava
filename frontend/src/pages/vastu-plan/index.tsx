import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageScope } from '../../components/PageScope'
import { useLegacyPage, type LegacyContext } from '../../lib/legacy'
import { initVastuPlan } from './engine.js'
import { VastuMarkup } from './Markup'
import './vastu-plan.page.css'

export default function VastuPlanPage() {
  const { me, user } = useAuth()
  const navigate = useNavigate()
  const ref = useLegacyPage((root: HTMLElement, ctx: LegacyContext) => initVastuPlan(root, ctx), { me, navigate })
  const who = me?.profile.display_name || me?.profile.username || user?.email?.split('@')[0] || null
  return (
    <PageScope name="vastu-plan" title="VastuPlan AI — Ancient Town Planning Simulator · Mirava">
      <div ref={ref}>
        <VastuMarkup who={who} />
      </div>
    </PageScope>
  )
}
