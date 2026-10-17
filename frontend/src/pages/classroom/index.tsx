import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AccountMenu } from '../../components/AccountMenu'
import { PageScope } from '../../components/PageScope'
import { useAuth } from '../../auth/AuthProvider'
import { api } from '../../lib/api'
import './classroom.page.css'
import { JoinForm, StudentView } from './StudentView'
import { TeacherView } from './TeacherView'
import { errorMessage, useToast } from './util'

function TouristView({ toast }: { toast: (m: string) => void }) {
  const { refreshMe } = useAuth()
  const becomeTeacher = useMutation({
    mutationFn: () => api.me.update({ role: 'teacher' }),
    onSuccess: async () => {
      await refreshMe()
      toast('Welcome, teacher! Create your first classroom.')
    },
  })
  return (
    <div className="cls-card tourist-card">
      <h3>Teachers and students, together</h3>
      <p className="hint">
        Mirava Classroom lets teachers build homework from our heritage question bank and lets students complete it
        before it expires. You&apos;re currently exploring as a visitor — choose how you&apos;d like to take part.
      </p>
      <div className="choices">
        <div className="mirava-classroom-dashboard" style={{ padding: '22px 24px' }}>
          <div className="welcome" style={{ fontSize: 22 }}>👩‍🏫 I&apos;m a teacher</div>
          <p className="hint" style={{ margin: '6px 0 14px' }}>
            Create classrooms, share a join code and assign up to 10 homework sets a day.
          </p>
          <button className="pill" style={{ padding: '10px 24px' }} disabled={becomeTeacher.isPending} onClick={() => becomeTeacher.mutate()}>
            {becomeTeacher.isPending ? 'Setting up…' : "I'm a teacher →"}
          </button>
          {becomeTeacher.error && <div className="cls-error">{errorMessage(becomeTeacher.error)}</div>}
        </div>
        <div className="mirava-classroom-dashboard" style={{ padding: '22px 24px' }}>
          <div className="welcome" style={{ fontSize: 22 }}>🎒 I&apos;m a student</div>
          <p className="hint" style={{ margin: '6px 0 14px' }}>Got a class code from your teacher? Enter it to join.</p>
          <JoinForm onJoined={(name) => toast(`Welcome to ${name}!`)} />
        </div>
      </div>
    </div>
  )
}

export default function ClassroomPage() {
  const { me, role } = useAuth()
  const [toastMsg, toast] = useToast()
  const isTeacher = role === 'teacher' || role === 'admin'

  return (
    <PageScope name="classroom" title="Mirava Classroom — Learn. Teach. Pass it on.">
      <div className="noise" />
      <header className="cls-top">
        <Link className="brand" to="/explore">
          mira<i>va</i>
        </Link>
        <nav>
          <Link to="/explore">← Explore</Link>
          <Link to="/quiz" className="hide-sm">
            Quiz
          </Link>
          <span className="active">🏫 Classroom</span>
        </nav>
        <AccountMenu />
      </header>

      <section className="mirava-classroom-section">
        <div className="eyebrow">🏫 Mirava Classroom</div>
        <h2>
          Learn. Teach.
          <br />
          <em>Pass it on.</em>
        </h2>
        <p className="subtitle">
          A dedicated space for teachers and students to explore India&apos;s heritage through assignments and quizzes.
        </p>
        {!me ? (
          <div className="mv-spinner-page" style={{ minHeight: 240 }}>
            <div className="mv-spinner" />
          </div>
        ) : isTeacher ? (
          <TeacherView toast={toast} />
        ) : role === 'student' ? (
          <StudentView toast={toast} />
        ) : (
          <TouristView toast={toast} />
        )}
      </section>

      {toastMsg && (
        <div className="cls-toast" role="status">
          {toastMsg}
        </div>
      )}
    </PageScope>
  )
}
