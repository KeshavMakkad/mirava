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
