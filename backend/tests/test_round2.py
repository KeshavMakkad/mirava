"""Profile fields, Hindi news, Rasoi Rescue vault/sharing/media, Sentinel vision.
AI (OpenRouter) and Supabase Storage are replaced with in-memory fakes."""

import json

import pytest
from fastapi import HTTPException

from app.routers import rasoi, sentinel


def _recipe(**over):
    base = {
        "id": "dal-001", "name": "Dal Tadka", "by": "Nani", "ingredients": ["toor dal", "ghee", "jeera"],
        "steps": ["Boil dal", "Temper with jeera in ghee"], "visibility": "private", "consent": False,
    }
    return {**base, **over}


@pytest.fixture
def fake_ai(monkeypatch):
    calls = []

    async def chat(messages, **kw):
        calls.append((messages, kw))
        if kw.get("json_mode"):
            name = json.loads(messages[-1]["content"])["name"]
            return json.dumps({"decision": "review" if "poison" in name.lower() else "approve", "reason": "unsafe"})
        return "Looks plausible."

    monkeypatch.setattr(rasoi, "openrouter_chat", chat)
    monkeypatch.setattr(sentinel, "openrouter_chat", chat)
    monkeypatch.setattr(rasoi, "require_ai", lambda *a, **k: "key")
    monkeypatch.setattr(sentinel, "require_ai", lambda *a, **k: "key")
    return calls


@pytest.fixture
def fake_storage(monkeypatch):
    store: dict[str, bytes] = {}

    class FakeResponse:
        def __init__(self, data):
            self.data, self.extensions = data, {"mirava_client": self}

        async def aiter_bytes(self):
            yield self.data

        async def aclose(self):
            pass

    class Fake:
        async def put(self, path, data, ct):
            store[path] = data

        async def get(self, path):
            return FakeResponse(store[path]) if path in store else None

        async def delete(self, path):
            store.pop(path, None)

    monkeypatch.setattr(rasoi, "_storage", lambda: Fake())
    return store


def test_profile_fields(client, make_user):
    _, h = make_user("meera")
    me = client.get("/api/me", headers=h).json()["profile"]
    assert me["avatar"] == "lotus" and me["preferred_language"] == "en" and me["bio"] == ""
    r = client.patch("/api/me", headers=h, json={"bio": "Loves temples", "location": "Pune", "preferred_language": "hi", "avatar": "peacock"})
    assert r.status_code == 200, r.text
    assert r.json()["avatar"] == "peacock" and r.json()["preferred_language"] == "hi"
    assert client.patch("/api/me", headers=h, json={"avatar": "dragon"}).status_code == 422
    assert client.patch("/api/me", headers=h, json={"bio": "x" * 601}).status_code == 422


def test_news_hindi_fields(client, make_user):
    _, admin = make_user("boss2", admin=True)
    r = client.post("/api/admin/news", headers=admin, json={
        "title": "Konark restored", "summary": "Sun temple work", "title_hi": "कोणार्क", "summary_hi": "  ", })
    assert r.status_code == 201, r.text
    item = client.get("/api/news").json()[0]
    assert item["title_hi"] == "कोणार्क" and item["summary_hi"] is None


def test_recipe_vault_and_sharing(client, make_user, fake_ai):
    _, h = make_user("cook")
    _, other = make_user("other")
    assert client.get("/api/rasoi/recipes").status_code == 401
    r = client.post("/api/rasoi/recipes", headers=h, json=_recipe())
    assert r.status_code == 200, r.text
    assert r.json()["recipe"]["region"] == "Family kitchen"
    assert len(fake_ai) == 0  # private saves are never screened
    assert [x["id"] for x in client.get("/api/rasoi/recipes", headers=h).json()["recipes"]] == ["dal-001"]
    assert client.get("/api/rasoi/recipes", headers=other).json()["recipes"] == []
    assert client.get("/api/rasoi/public").json()["recipes"] == []

    # Sharing needs consent, then passes the AI screen.
    assert client.post("/api/rasoi/recipes", headers=h, json=_recipe(visibility="shared")).status_code == 422
    r = client.post("/api/rasoi/recipes", headers=h, json=_recipe(visibility="shared", consent=True))
    assert r.status_code == 200, r.text
    pub = client.get("/api/rasoi/public").json()["recipes"]
    assert [x["name"] for x in pub] == ["Dal Tadka"] and "story" not in pub[0]
    # Unchanged re-save of a shared recipe is not re-screened.
    n = len(fake_ai)
    client.post("/api/rasoi/recipes", headers=h, json=_recipe(visibility="shared", consent=True, story="new story"))
    assert len(fake_ai) == n

    bad = client.post("/api/rasoi/recipes", headers=h, json=_recipe(id="x2", name="Poison curry", visibility="shared", consent=True))
    assert bad.status_code == 422 and "needs review" in bad.json()["detail"]

    assert client.delete("/api/rasoi/recipes/dal-001", headers=other).status_code == 404
    assert client.delete("/api/rasoi/recipes/dal-001", headers=h).json() == {"ok": True}
    assert client.get("/api/rasoi/public").json()["recipes"] == []


def test_recipe_validation(client, make_user):
    _, h = make_user("cook2")
    assert client.post("/api/rasoi/recipes", headers=h, json=_recipe(id="bad id!")).status_code == 422
    assert client.post("/api/rasoi/recipes", headers=h, json=_recipe(ingredients=[])).status_code == 422
    assert client.post("/api/rasoi/recipes", headers=h, json=_recipe(mins=0)).status_code == 422


def test_sharing_without_ai_is_refused(client, make_user, monkeypatch):
    def no_ai(msg="x", *a, **k):
        raise HTTPException(503, msg)

    monkeypatch.setattr(rasoi, "require_ai", no_ai)
    _, h = make_user("cook3")
    r = client.post("/api/rasoi/recipes", headers=h, json=_recipe(visibility="shared", consent=True))
    assert r.status_code == 503 and "Save privately" in r.json()["detail"]
    assert client.post("/api/rasoi/recipes", headers=h, json=_recipe()).status_code == 200


def test_recipe_review(client, make_user, fake_ai):
    _, h = make_user("cook4")
    r = client.post("/api/rasoi/review", headers=h, json={"name": "Dal", "ingredients": ["dal"], "steps": ["boil"]})
    assert r.status_code == 200 and r.json()["review"] == "Looks plausible."


def test_recipe_media(client, make_user, fake_storage):
    _, h = make_user("cook5")
    _, other = make_user("cook6")
    client.post("/api/rasoi/recipes", headers=h, json=_recipe())
    url = "/api/rasoi/recipes/dal-001/media/photo1?type=photo"
    assert client.put(url, headers={**h, "Content-Type": "text/plain"}, content=b"x").status_code == 415
    r = client.put(url, headers={**h, "Content-Type": "image/jpeg"}, content=b"\xff\xd8jpegbytes")
    assert r.status_code == 200, r.text
    assert r.json()["media"]["size"] == 11
    assert client.put(url, headers={**other, "Content-Type": "image/jpeg"}, content=b"x").status_code == 404
    listed = client.get("/api/rasoi/recipes/dal-001/media", headers=h).json()["media"]
    assert [m["mediaId"] for m in listed] == ["photo1"]
    got = client.get("/api/rasoi/recipes/dal-001/media/photo1", headers=h)
    assert got.status_code == 200 and got.content == b"\xff\xd8jpegbytes" and got.headers["content-type"] == "image/jpeg"
    big = b"0" * (5 * 1024 * 1024 + 1)
    assert client.put(url, headers={**h, "Content-Type": "image/png"}, content=big).status_code == 413
    # Deleting the recipe removes stored objects too.
    client.delete("/api/rasoi/recipes/dal-001", headers=h)
    assert fake_storage == {}


def test_media_without_storage_configured(client, make_user):
    _, h = make_user("cook7")
    client.post("/api/rasoi/recipes", headers=h, json=_recipe())
    r = client.put("/api/rasoi/recipes/dal-001/media/p?type=photo", headers={**h, "Content-Type": "image/jpeg"}, content=b"x")
    assert r.status_code == 503


def test_sentinel_vision(client, make_user, fake_ai):
    _, h = make_user("inspector")
    assert client.post("/api/sentinel/vision", headers=h, json={"image": "not-an-image"}).status_code == 400
    r = client.post("/api/sentinel/vision", headers=h, json={"image": "data:image/png;base64,iVBORw0KGgo="})
    assert r.status_code == 200 and r.json()["assessment"] == "Looks plausible." and "AI screening only" in r.json()["advisory"]
    msgs, kw = fake_ai[-1]
    assert msgs[1]["content"][1]["image_url"]["url"].startswith("data:image/png")



class _FakeResp:
    def __init__(self, status, body):
        self.status_code, self._body = status, body

    def json(self):
        return self._body


@pytest.fixture
def mailer(monkeypatch):
    """Fakes Supabase's /admin/generate_link (creating the auth row like GoTrue) and captures sent mail."""
    import json as _json

    from sqlalchemy import text as sql

    from app.config import get_settings
    from app.db import engine
    from app.routers import accounts

    settings = get_settings()
    monkeypatch.setattr(settings, "supabase_secret_key", "sb_secret_test")
    monkeypatch.setattr(settings, "resend_api_key", "re_test")
    monkeypatch.setattr(settings, "email_from", "Mirava <hello@mirava.test>")
    sent, links = [], []

    async def post(self, url, json=None, headers=None):
        assert url.endswith("/auth/v1/admin/generate_link") and headers["apikey"] == "sb_secret_test"
        links.append(json)
        with engine.connect() as conn:
            exists = conn.execute(sql("select 1 from auth.users where email = :e"), {"e": json["email"]}).first()
        if json["type"] == "signup":
            if exists:
                return _FakeResp(422, {"error_code": "email_exists", "msg": "already registered"})
            with engine.begin() as conn:
                conn.execute(sql("insert into auth.users (email, raw_user_meta_data) values (:e, cast(:m as jsonb))"),
                             {"e": json["email"], "m": _json.dumps(json["data"])})
        elif not exists:
            return _FakeResp(404, {"error_code": "user_not_found", "msg": "User not found"})
        return _FakeResp(200, {"properties": {"hashed_token": "hash123", "verification_type": json["type"]}})

    async def send(to, subject, html_body, text_body):
        sent.append({"to": to, "subject": subject, "html": html_body, "text": text_body})

    monkeypatch.setattr("httpx.AsyncClient.post", post)
    monkeypatch.setattr(accounts, "send_email", send)
    return {"sent": sent, "links": links}


def test_signup_sends_our_own_confirmation_email(client, mailer):
    body = {"email": "New.User@Example.com", "password": "a-long-password-123", "username": "NewUser",
            "display_name": "New User", "next": "/explore"}
    r = client.post("/api/auth/signup", json=body, headers={"Origin": "http://localhost:5173"})
    assert r.status_code == 201, r.text
    link = mailer["links"][0]
    assert link["type"] == "signup" and link["email"] == "new.user@example.com"
    assert link["data"] == {"username": "newuser", "display_name": "New User"}
    mail = mailer["sent"][0]
    assert mail["to"] == "new.user@example.com" and "Confirm" in mail["subject"]
    assert "http://localhost:5173/auth/confirm?token_hash=hash123&amp;type=signup&amp;next=%2Fexplore" in mail["html"]
    assert "http://localhost:5173/auth/confirm?token_hash=hash123&type=signup&next=%2Fexplore" in mail["text"]

    # Duplicate email / username; validation.
    assert client.post("/api/auth/signup", json={**body, "username": "other"}).status_code == 409
    r = client.post("/api/auth/signup", json={**body, "email": "x@example.com"})
    assert r.status_code == 409 and "username" in r.json()["detail"]
    assert client.post("/api/auth/signup", json={**body, "password": "short"}).status_code == 422


def test_reset_and_magic_link_do_not_leak_accounts(client, mailer, make_user):
    make_user("known")
    r = client.post("/api/auth/password-reset", json={"email": "known@example.com"})
    assert r.status_code == 200 and mailer["sent"][-1]["to"] == "known@example.com"
    assert "type=recovery" in mailer["sent"][-1]["text"] and "next=%2Freset-password" in mailer["sent"][-1]["text"]
    n = len(mailer["sent"])
    r = client.post("/api/auth/password-reset", json={"email": "nobody@example.com"})
    assert r.status_code == 200 and r.json() == client.post("/api/auth/magic-link", json={"email": "nobody2@example.com"}).json()
    assert len(mailer["sent"]) == n  # nothing sent, same response
    r = client.post("/api/auth/magic-link", json={"email": "known@example.com", "next": "//evil.com"})
    assert r.status_code == 200 and "next=" not in mailer["sent"][-1]["text"]


def test_auth_email_requires_configuration(client):
    r = client.post("/api/auth/signup", json={"email": "a@b.com", "password": "a-long-password-123", "username": "abc"})
    assert r.status_code == 503



def test_apps_script_transport(monkeypatch):
    """send_email posts {secret,to,subject,html,text} to the web app and maps its errors."""
    import asyncio
    import json as _json

    from fastapi import HTTPException

    from app.config import get_settings
    from app.services import email

    s = get_settings()
    monkeypatch.setattr(s, "apps_script_url", "https://script.google.com/macros/s/X/exec")
    monkeypatch.setattr(s, "apps_script_secret", "shh")
    calls, replies = [], [{"ok": True, "remaining": 99}, {"ok": False, "error": "quota_exceeded"}, {"ok": False, "error": "unauthorized"}]

    async def post(self, url, content=None, headers=None):
        calls.append((url, _json.loads(content), self.follow_redirects))
        return _FakeResp(200, replies[len(calls) - 1])

    monkeypatch.setattr("httpx.AsyncClient.post", post)
    asyncio.run(email.send_email("a@b.com", "Hi", "<b>x</b>", "x"))
    url, body, follows = calls[0]
    assert url.endswith("/exec") and follows is True
    assert body == {"secret": "shh", "to": "a@b.com", "subject": "Hi", "html": "<b>x</b>", "text": "x"}
    with pytest.raises(HTTPException) as e:
        asyncio.run(email.send_email("a@b.com", "Hi", "x", "x"))
    assert e.value.status_code == 503
    with pytest.raises(HTTPException) as e:
        asyncio.run(email.send_email("a@b.com", "Hi", "x", "x"))
    assert e.value.status_code == 502
