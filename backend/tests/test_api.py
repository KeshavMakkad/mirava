from datetime import UTC, datetime, timedelta

from sqlalchemy import text


def test_auth_required(client):
    assert client.get("/api/me").status_code == 401
    bad = {"Authorization": "Bearer not-a-jwt"}
    assert client.get("/api/me", headers=bad).status_code == 401


def test_me_and_profile_update(client, make_user):
    _, h = make_user("ravi", role="teacher")
    me = client.get("/api/me", headers=h).json()
    assert me["profile"]["username"] == "ravi"
    assert me["profile"]["role"] == "teacher"
    assert me["rank"] == 1

    r = client.patch("/api/me", headers=h, json={"display_name": "Ravi K", "username": "ravi_k"})
    assert r.status_code == 200 and r.json()["username"] == "ravi_k"
    # Admin can't be self-assigned.
    assert client.patch("/api/me", headers=h, json={"role": "admin"}).status_code == 422


def test_user_state_roundtrip(client, make_user):
    _, h = make_user("asha")
    assert client.get("/api/me/state/langProgress", headers=h).json()["value"] is None
    client.put("/api/me/state/langProgress", headers=h, json={"value": {"tamil": 3}})
    assert client.get("/api/me/state/langProgress", headers=h).json()["value"] == {"tamil": 3}
    assert client.get("/api/me/state", headers=h).json() == {"langProgress": {"tamil": 3}}
    assert client.put("/api/me/state/bad key!", headers=h, json={"value": 1}).status_code in (400, 404)


def _play_daily(client, h):
    """Answer every question with option 0 and return the session id."""
    s = client.post("/api/quiz/daily/start", headers=h).json()
    sid, total = s["session_id"], s["total"]
    assert "answer" not in s["question"]
    for i in range(total):
        if i > 0:
            s = client.post(f"/api/quiz/sessions/{sid}/next", headers=h).json()
        assert s["question"] is not None and s["index"] == i
        res = client.post(f"/api/quiz/sessions/{sid}/answer", headers=h, json={"index": i, "selected": 0}).json()
        assert res["correct_index"] in range(len(s["question"]["options"]))
        # Re-answering the same question is rejected.
        assert client.post(f"/api/quiz/sessions/{sid}/answer", headers=h, json={"index": i, "selected": 1}).status_code == 409
    return sid


def test_daily_quiz_flow(client, make_user, engine):
    uid, h = make_user("player1")
    status = client.get("/api/quiz/daily/status", headers=h).json()
    assert status["attempt"] is None and status["total"] == 10

    sid = _play_daily(client, h)
    fin = client.post(f"/api/quiz/sessions/{sid}/finish", headers=h)
    assert fin.status_code == 200, fin.text
    body = fin.json()
    assert body["total_questions"] == 10 and body["streak"] == 1
    assert body["score"] == sum(a["points"] for a in body["answers"])

    # One attempt per day.
    assert client.post("/api/quiz/daily/start", headers=h).status_code == 409
    assert client.post(f"/api/quiz/sessions/{sid}/finish", headers=h).status_code == 409
    status = client.get("/api/quiz/daily/status", headers=h).json()
    assert status["attempt"]["score"] == body["score"]

    board = client.get("/api/leaderboard/daily", headers=h).json()
    assert board["me"]["player_id"] == str(uid)


def test_daily_quiz_same_questions_for_everyone(client, make_user):
    _, h1 = make_user("a1")
    _, h2 = make_user("a2")
    q1 = client.post("/api/quiz/daily/start", headers=h1).json()["question"]
    q2 = client.post("/api/quiz/daily/start", headers=h2).json()["question"]
    assert q1 == q2


def test_resume_keeps_timer(client, make_user, engine):
    _, h = make_user("resumer")
    s1 = client.post("/api/quiz/daily/start", headers=h).json()
    with engine.begin() as conn:
        conn.execute(text("update quiz_sessions set question_started_at = now() - interval '20 seconds' where id = :id"),
                     {"id": s1["session_id"]})
    s2 = client.post("/api/quiz/daily/start", headers=h).json()
    assert s2["session_id"] == s1["session_id"] and s2["time_left"] == 0
    # A late answer counts as a timeout, whatever was selected.
    res = client.post(f"/api/quiz/sessions/{s1['session_id']}/answer", headers=h, json={"index": 0, "selected": 0}).json()
    assert res["selected"] is None and res["points"] == 0


def test_cannot_touch_other_players_session(client, make_user):
    _, h1 = make_user("own")
    _, h2 = make_user("thief")
    sid = client.post("/api/quiz/daily/start", headers=h1).json()["session_id"]
    assert client.get(f"/api/quiz/sessions/{sid}", headers=h2).status_code == 404


def test_practice_quiz(client, make_user):
    _, h = make_user("learner")
    topics = client.get("/api/quiz/topics").json()
    assert len(topics) == 10
    s = client.post("/api/quiz/practice/start", headers=h, json={"topic": topics[0]["topic"], "count": 3}).json()
    assert s["kind"] == "practice" and s["total"] == 3
    sid = s["session_id"]
    for i in range(3):
        if i:
            client.post(f"/api/quiz/sessions/{sid}/next", headers=h)
        client.post(f"/api/quiz/sessions/{sid}/answer", headers=h, json={"index": i, "selected": None})
    fin = client.post(f"/api/quiz/sessions/{sid}/finish", headers=h).json()
    assert fin["kind"] == "practice" and fin["streak"] is None and fin["xp_earned"] == 0


def test_guest_excluded_from_global_board(client, make_user):
    _, hg = make_user(anonymous=True)
    _, hu = make_user("real")
    client.post("/api/games/shivaji/scores", headers=hg, json={"score": 900})
    board = client.get("/api/leaderboard/global").json()
    assert [e["username"] for e in board["entries"]] == ["real"]
    assert client.get("/api/leaderboard/global", headers=hg).json()["me"] is None


def test_game_scores_and_badges(client, make_user):
    _, h = make_user("gamer")
    r = client.post("/api/games/shivaji/scores", headers=h, json={"score": 1200, "time_taken_seconds": 90, "completed": True})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["xp_earned"] == 120
    assert [b["badge_key"] for b in body["new_badges"]] == ["shivaji_warrior"]
    assert body["total_xp"] == 120 + 100  # score XP + badge reward
    # Badge only once.
    again = client.post("/api/games/shivaji/scores", headers=h, json={"score": 10, "completed": True}).json()
    assert again["new_badges"] == [] and again["best_score"] == 1200

    assert client.post("/api/games/nope/scores", headers=h, json={"score": 1}).status_code == 404
    assert client.post("/api/games/shivaji/scores", headers=h, json={"score": 10**9}).status_code == 422
    board = client.get("/api/leaderboard/games/shivaji").json()
    assert board["entries"][0]["score"] == 1200


def test_classroom_flow(client, make_user):
    _, teacher = make_user("guru", role="teacher")
    sid, student = make_user("shishya", role="student")
    _, outsider = make_user("outsider")
    _, guest = make_user(anonymous=True)

    assert client.post("/api/classrooms", headers=student, json={"class_name": "x"}).status_code == 403
    c = client.post("/api/classrooms", headers=teacher, json={"class_name": "Class 8B"}).json()
    code = c["class_code"]

    assert client.post("/api/classrooms/join", headers=guest, json={"class_code": code}).status_code == 403
    assert client.post("/api/classrooms/join", headers=student, json={"class_code": code.lower()}).status_code == 200
    detail = client.get(f"/api/classrooms/{c['id']}", headers=teacher).json()
    assert [m["username"] for m in detail["members"]] == ["shishya"]

    qs = client.get("/api/questions", headers=teacher, params={"limit": 3}).json()["items"]
    assert client.get("/api/questions", headers=student).status_code == 403
    a = client.post(f"/api/classrooms/{c['id']}/assignments", headers=teacher,
                    json={"title": "Indus quiz", "question_ids": [q["id"] for q in qs]})
    assert a.status_code == 201, a.text
    aid = a.json()["id"]

    hw = client.get("/api/assignments", headers=student).json()
    assert [x["id"] for x in hw] == [aid] and hw[0]["status"] == "assigned"
    assert client.get("/api/assignments", headers=outsider).json() == []
    assert client.get(f"/api/assignments/{aid}/questions", headers=outsider).status_code == 404

    questions = client.get(f"/api/assignments/{aid}/questions", headers=student).json()
    assert all("answer" not in q for q in questions)
    answers = [q["answer"] for q in qs]
    answers[0] = (answers[0] + 1) % len(qs[0]["options"])  # get one wrong
    sub = client.post(f"/api/assignments/{aid}/submit", headers=student, json={"answers": answers}).json()
    assert sub["correct_answers"] == 2 and sub["score"] == 20
    assert client.post(f"/api/assignments/{aid}/submit", headers=student, json={"answers": answers}).status_code == 409

    teacher_view = client.get(f"/api/classrooms/{c['id']}/assignments", headers=teacher).json()
    assert teacher_view[0]["results"][0]["score"] == 20
    assert client.get("/api/assignments", headers=student).json()[0]["status"] == "completed"


def test_assignment_daily_limit(client, make_user):
    _, teacher = make_user("busy", role="teacher")
    c = client.post("/api/classrooms", headers=teacher, json={"class_name": "C"}).json()
    q = client.get("/api/questions", headers=teacher, params={"limit": 1}).json()["items"][0]["id"]
    for _ in range(10):
        assert client.post(f"/api/classrooms/{c['id']}/assignments", headers=teacher,
                           json={"title": "t", "question_ids": [q]}).status_code == 201
    assert client.post(f"/api/classrooms/{c['id']}/assignments", headers=teacher,
                       json={"title": "t", "question_ids": [q]}).status_code == 429


def test_admin_cms(client, make_user):
    _, admin = make_user("boss", admin=True)
    uid, user = make_user("pleb")
    assert client.get("/api/admin/stats", headers=user).status_code == 403

    n = client.post("/api/admin/news", headers=admin, json={
        "title": "Keeladi excavation", "summary": "New finds", "category": "Archaeology",
        "image_url": "https://example.com/a.jpg",
    })
    assert n.status_code == 201, n.text
    draft = client.post("/api/admin/news", headers=admin, json={"title": "Draft", "summary": "s", "is_published": False})
    assert draft.status_code == 201
    public = client.get("/api/news").json()
    assert [x["title"] for x in public] == ["Keeladi excavation"]

    q = client.post("/api/admin/questions", headers=admin, json={
        "topic": "Chola", "question": "Who built Brihadeeswarar?", "options": ["Raja Raja I", "Ashoka"], "answer": 0})
    assert q.status_code == 201, q.text
    bad = client.post("/api/admin/questions", headers=admin, json={
        "topic": "x", "question": "Bad question?", "options": ["a", "b"], "answer": 5})
    assert bad.status_code == 422
    assert client.get("/api/admin/stats", headers=admin).json()["questions_admin"] == 1

    r = client.patch(f"/api/admin/users/{uid}/role", headers=admin, json={"role": "teacher"})
    assert r.json()["role"] == "teacher"


def test_expired_assignment(client, make_user, engine):
    _, teacher = make_user("t2", role="teacher")
    _, student = make_user("s2", role="student")
    c = client.post("/api/classrooms", headers=teacher, json={"class_name": "C"}).json()
    client.post("/api/classrooms/join", headers=student, json={"class_code": c["class_code"]})
    q = client.get("/api/questions", headers=teacher, params={"limit": 1}).json()["items"][0]["id"]
    aid = client.post(f"/api/classrooms/{c['id']}/assignments", headers=teacher,
                      json={"title": "t", "question_ids": [q]}).json()["id"]
    with engine.begin() as conn:
        conn.execute(text("update assignments set due_at = :d where id = :id"),
                     {"d": datetime.now(UTC) - timedelta(hours=1), "id": aid})
    assert client.get("/api/assignments", headers=student).json()[0]["status"] == "expired"
    assert client.post(f"/api/assignments/{aid}/submit", headers=student, json={"answers": [0]}).status_code == 409


def test_ai_not_configured(client, make_user):
    _, h = make_user("curious")
    r = client.post("/api/ai/chat", headers=h, json={"messages": [{"role": "user", "content": "Hi"}]})
    assert r.status_code == 503
