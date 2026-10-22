"""Outgoing email (account confirmation, magic links, password resets).

Supabase's built-in mailer is limited to a few emails per hour, so the backend
asks Supabase to *generate* auth links (Admin API) and delivers them itself via,
in order of preference: the Google Apps Script web app (email/apps-script),
SMTP (e.g. Gmail with an app password), or the Resend HTTP API.
"""

import asyncio
import html
import json
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, parseaddr

import httpx
from fastapi import HTTPException, status

from app.config import get_settings


def email_configured() -> bool:
    s = get_settings()
    return bool(
        (s.apps_script_url and s.apps_script_secret)
        or (s.smtp_host and s.smtp_username and s.smtp_password)
        or s.resend_api_key
    )


async def _apps_script_send(to: str, subject: str, html_body: str, text_body: str) -> None:
    s = get_settings()
    try:
        # Apps Script answers POSTs with a 302 to script.googleusercontent.com.
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            res = await client.post(
                s.apps_script_url,  # type: ignore[arg-type]
                content=json.dumps({"secret": s.apps_script_secret, "to": to, "subject": subject,
                                    "html": html_body, "text": text_body}),
                headers={"Content-Type": "text/plain;charset=utf-8"},
            )
        data = res.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not send email; please try again") from exc
    if not data.get("ok"):
        err = data.get("error")
        if err == "quota_exceeded":
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "We've hit today's email limit — please try again tomorrow")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Email service error ({err or 'unknown'})")


def _smtp_send(msg: EmailMessage) -> None:
    s = get_settings()
    ctx = ssl.create_default_context()
    if s.smtp_port == 465:
        with smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, context=ctx, timeout=20) as server:
            server.login(s.smtp_username, s.smtp_password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=20) as server:
            server.starttls(context=ctx)
            server.login(s.smtp_username, s.smtp_password)
            server.send_message(msg)


async def send_email(to: str, subject: str, html_body: str, text_body: str) -> None:
    s = get_settings()
    if s.apps_script_url and s.apps_script_secret:
        await _apps_script_send(to, subject, html_body, text_body)
        return
    sender = s.email_from or (s.smtp_username and formataddr(("Mirava", s.smtp_username))) or ""
    if not email_configured() or not parseaddr(sender)[1]:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Email is not configured on this server")

    if s.smtp_host and s.smtp_username and s.smtp_password:
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = sender, to, subject
        msg.set_content(text_body)
        msg.add_alternative(html_body, subtype="html")
        try:
            await asyncio.to_thread(_smtp_send, msg)
        except (smtplib.SMTPException, OSError) as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not send email; please try again") from exc
        return

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {s.resend_api_key}"},
                json={"from": sender, "to": [to], "subject": subject, "html": html_body, "text": text_body},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not send email; please try again") from exc
    if res.status_code >= 300:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Email provider error ({res.status_code})")


def auth_email(*, heading: str, intro: str, button: str, link: str, footer: str) -> tuple[str, str]:
    """Branded HTML + plain-text versions of an auth email."""
    h, i, b, f, url = (html.escape(x) for x in (heading, intro, button, footer, link))
    html_body = f"""<!doctype html><html><body style="margin:0;background:#f5ede2;font-family:Arial,Helvetica,sans-serif;color:#24151a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff8ee;border:1px solid #dfd0c2;border-radius:18px">
<tr><td style="padding:28px 32px 8px;font:italic 700 30px Georgia,serif;color:#24151a">mira<span style="color:#e5562f">va</span></td></tr>
<tr><td style="padding:8px 32px 0;font:700 22px Georgia,serif">{h}</td></tr>
<tr><td style="padding:12px 32px 4px;font-size:15px;line-height:1.6;color:#4a3a3e">{i}</td></tr>
<tr><td style="padding:20px 32px"><a href="{url}" style="display:inline-block;background:#792d3c;color:#fff;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:999px">{b}</a></td></tr>
<tr><td style="padding:0 32px 8px;font-size:12px;color:#765f64;word-break:break-all">Or paste this link into your browser:<br>{url}</td></tr>
<tr><td style="padding:12px 32px 28px;font-size:12px;color:#765f64">{f}</td></tr>
</table></td></tr></table></body></html>"""
    text_body = f"{heading}\n\n{intro}\n\n{button}: {link}\n\n{footer}\n"
    return html_body, text_body
