import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { FullPageSpinner, RedirectIfAuthed, RequireAuth, RequireRole } from './auth/guards'

const Landing = lazy(() => import('./pages/landing'))
const Login = lazy(() => import('./pages/auth/Login'))
const Signup = lazy(() => import('./pages/auth/Signup'))
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const Explore = lazy(() => import('./pages/explore'))
const QuizArena = lazy(() => import('./pages/quiz-arena'))
const Classroom = lazy(() => import('./pages/classroom'))
const Profile = lazy(() => import('./pages/profile'))
const Admin = lazy(() => import('./pages/admin'))
const LostLegends = lazy(() => import('./pages/lost-legends'))
const Sentinel = lazy(() => import('./pages/sentinel'))
const RasoiRescue = lazy(() => import('./pages/rasoi-rescue'))
const VedicMaths = lazy(() => import('./pages/vedic-maths'))
const Bhasha = lazy(() => import('./pages/bhasha'))
const JalParampara = lazy(() => import('./pages/jal-parampara'))
const ClassicGame = lazy(() => import('./pages/classic-game'))

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
        {/* Guests may reach signup to upgrade their account. */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/explore" element={<RequireAuth><Explore /></RequireAuth>} />
        <Route path="/quiz" element={<RequireAuth><QuizArena /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/classroom" element={<RequireAuth registered><Classroom /></RequireAuth>} />
        <Route path="/admin" element={<RequireRole roles={['admin']}><Admin /></RequireRole>} />

        <Route path="/apps/lost-legends" element={<RequireAuth><LostLegends /></RequireAuth>} />
        <Route path="/apps/sentinel" element={<RequireAuth><Sentinel /></RequireAuth>} />
        <Route path="/apps/rasoi-rescue" element={<RequireAuth><RasoiRescue /></RequireAuth>} />
        <Route path="/apps/vedic-maths" element={<RequireAuth><VedicMaths /></RequireAuth>} />
        <Route path="/apps/bhasha" element={<RequireAuth><Bhasha /></RequireAuth>} />
        <Route path="/apps/jal-parampara" element={<RequireAuth><JalParampara /></RequireAuth>} />
        <Route path="/apps/classic-game" element={<RequireAuth><ClassicGame /></RequireAuth>} />

        {/* Legacy .html URLs keep working. */}
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/login.html" element={<Navigate to="/login" replace />} />
        <Route path="/signup.html" element={<Navigate to="/signup" replace />} />
        <Route path="/explore.html" element={<Navigate to="/explore" replace />} />
        <Route path="/classroom.html" element={<Navigate to="/classroom" replace />} />
        <Route path="/quiz.html" element={<Navigate to="/quiz" replace />} />
        <Route path="/administrator.html" element={<Navigate to="/admin" replace />} />
        <Route path="/game.html" element={<Navigate to="/apps/lost-legends" replace />} />
        <Route path="/Sentinel.html" element={<Navigate to="/apps/sentinel" replace />} />
        <Route path="/rasoi-rescue.html" element={<Navigate to="/apps/rasoi-rescue" replace />} />
        <Route path="/vedicmaths.html" element={<Navigate to="/apps/vedic-maths" replace />} />
        <Route path="/Bhasha.html" element={<Navigate to="/apps/bhasha" replace />} />
        <Route path="/jalparampara.html" element={<Navigate to="/apps/jal-parampara" replace />} />
        <Route path="/classic-game.html" element={<Navigate to="/apps/classic-game" replace />} />
        <Route path="/profile.html" element={<Navigate to="/profile" replace />} />
        <Route path="/admin.html" element={<Navigate to="/admin" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
