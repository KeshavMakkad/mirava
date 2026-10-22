import random
from datetime import date
from types import SimpleNamespace

from app.services import quiz as engine


def test_points():
    assert engine.points_for(False, 1, 3) == 0
    assert engine.points_for(True, 0, 0) == 10 + 5 + 0
    assert engine.points_for(True, 14.5, 9) == 10 + 1 + 4
    assert engine.points_for(True, 30, 2) == 10 + 0 + 2


def test_streak():
    d = date(2026, 10, 17)
    assert engine.next_streak(None, 0, d) == 1
    assert engine.next_streak(date(2026, 10, 16), 4, d) == 5
    assert engine.next_streak(date(2026, 10, 10), 4, d) == 1
    assert engine.next_streak(d, 4, d) == 4


def test_badges():
    assert engine.badges_earned(10, 10, 60, 7, 5) == [
        "heritage_scholar", "perfect_explorer", "swift_scholar", "seven_day_streak", "five_perfects"]
    assert engine.badges_earned(5, 10, 200, 1, 0) == []


def test_question_set_keeps_correct_answer():
    qs = [SimpleNamespace(id=f"Q{i}", options=[f"a{i}", f"b{i}", f"c{i}"], answer=i % 3) for i in range(30)]
    picked = engine.build_question_set(qs, random.Random(1))
    assert len(picked) == 10
    by_id = {q.id: q for q in qs}
    for p in picked:
        src = by_id[p["id"]]
        assert p["options"][p["answer"]] == src.options[src.answer]


def test_daily_rotation_has_no_repeats_within_cycle():
    from datetime import timedelta

    qs = [SimpleNamespace(id=f"Q{i:04d}", options=["a", "b", "c"], answer=0, is_active=True) for i in range(100)]

    class FakeDB:
        def scalars(self, _):
            return SimpleNamespace(all=lambda: qs)

    days_per_cycle = 10
    start = date(2026, 1, 1)
    start = start - timedelta(days=start.toordinal() % days_per_cycle)  # align to a cycle boundary
    seen = []
    for d in range(days_per_cycle):
        seen += [q["id"] for q in engine.daily_question_set(FakeDB(), start + timedelta(days=d))]
    assert len(seen) == 100 and len(set(seen)) == 100
    assert engine.daily_question_set(FakeDB(), start) == engine.daily_question_set(FakeDB(), start)
