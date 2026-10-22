"""Stop daily-quiz questions giving away their answer.

990 of the 1,000 seeded questions contained the correct option verbatim
("Quick history check: The Tungabhadra River is associated with Hampi").
Replace the answer inside the question with a blank ("_____"). Hindi
versions are added to frontend/public/locales/hi.json.

Revision ID: 0006
Revises: 0005
"""

import re
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | Sequence[str] | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BLANK = "_____"


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text("select id, question, options, answer from public.questions where source = 'bank'")).all()
    updates = []
    for qid, question, options, answer in rows:
        pattern = re.compile(re.escape(options[answer]), re.IGNORECASE)
        if pattern.search(question):
            updates.append({"q": pattern.sub(BLANK, question), "id": qid})
    if updates:  # one batched executemany instead of a round trip per row
        conn.execute(sa.text("update public.questions set question = :q where id = :id"), updates)


def downgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text(
        "select id, question, options, answer from public.questions where source = 'bank' and question like '%_____%'"
    )).all()
    updates = [{"q": question.replace(BLANK, options[answer]), "id": qid} for qid, question, options, answer in rows]
    if updates:
        conn.execute(sa.text("update public.questions set question = :q where id = :id"), updates)
