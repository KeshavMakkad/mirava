import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageScope } from '../../components/PageScope'
import { useLegacyPage } from '../../lib/legacy'
import { init } from './engine.js'
import { VedicMarkup } from './Markup'
import './vedic.page.css'

/** Mirava Gaṇita — Vedic Maths Lab & The Ancient Heist (port of legacy/vedicmaths.html). */
export default function VedicMathsPage() {
  const { me } = useAuth()
  const navigate = useNavigate()
  const ref = useLegacyPage(init, { me, navigate })
  return (
    <PageScope name="vedic-maths" title="Mirava Gaṇita — Vedic Maths Lab & The Ancient Heist">
      <div ref={ref}>
        <VedicMarkup />
      </div>
    </PageScope>
  )
}
