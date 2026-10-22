import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageScope } from '../../components/PageScope'
import { useLegacyPage } from '../../lib/legacy'
import { init } from './engine.js'
import { AharaMarkup } from './Markup'
import './ahara-matrix.page.css'

/** Ahara Matrix — Traditional Food Knowledge Explorer (port of the new ahara-matrix.html). */
export default function AharaMatrixPage() {
  const { me } = useAuth()
  const navigate = useNavigate()
  const ref = useLegacyPage(init, { me, navigate })
  return (
    <PageScope name="ahara-matrix" title="Ahara Matrix — Traditional Food Knowledge Explorer · Mirava">
      <div ref={ref}>
        <AharaMarkup />
      </div>
    </PageScope>
  )
}
