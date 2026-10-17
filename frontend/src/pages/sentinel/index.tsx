import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageScope } from '../../components/PageScope'
import { useLegacyPage } from '../../lib/legacy'
import { init } from './engine.js'
import { SentinelMarkup } from './Markup'
import './sentinel.page.css'

/** Mirava Sentinel — Monument Health Scanner (port of legacy/Sentinel.html). */
export default function SentinelPage() {
  const { me, isGuest } = useAuth()
  const navigate = useNavigate()
  const ref = useLegacyPage(init, { me, isGuest, navigate })
  return (
    <PageScope name="sentinel" title="Mirava Sentinel — Monument Health Scanner">
      <div ref={ref}>
        <SentinelMarkup />
      </div>
    </PageScope>
  )
}
