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
