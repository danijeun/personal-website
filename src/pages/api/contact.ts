import type { APIRoute } from "astro";

export const prerender = false;

const FROM = "Daniel Jeun website <onboarding@resend.dev>";
const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_MESSAGE = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ipHits = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 3;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.reset < now) {
    ipHits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_PER_WINDOW) return false;
  entry.count += 1;
  return true;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c];
  });
}

function fail(status: number, msg: string, redirect: string | null) {
  if (redirect) {
    return new Response(null, {
      status: 303,
      headers: { Location: `${redirect}?error=${encodeURIComponent(msg)}` },
    });
  }
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const apiKey = import.meta.env.RESEND_API_KEY;
  const to = import.meta.env.CONTACT_TO_EMAIL || "danijeun@gmail.com";

  const ct = request.headers.get("content-type") || "";
  const isForm = ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data");
  const accept = request.headers.get("accept") || "";
  const wantsJson = accept.includes("application/json") && !isForm;
  const redirectBase = wantsJson ? null : "/contact";

  let name = "";
  let email = "";
  let message = "";
  let honeypot = "";

  try {
    if (isForm) {
      const data = await request.formData();
      name = String(data.get("name") || "").trim();
      email = String(data.get("email") || "").trim();
      message = String(data.get("message") || "").trim();
      honeypot = String(data.get("company") || "").trim();
    } else {
      const data = await request.json();
      name = String(data.name || "").trim();
      email = String(data.email || "").trim();
      message = String(data.message || "").trim();
      honeypot = String(data.company || "").trim();
    }
  } catch {
    return fail(400, "Bad request body.", redirectBase);
  }

  if (honeypot) {
    return wantsJson
      ? new Response(JSON.stringify({ ok: true }), { status: 200 })
      : new Response(null, { status: 303, headers: { Location: "/contact?sent=1" } });
  }

  if (!name || name.length > MAX_NAME) return fail(400, "Name is missing or too long.", redirectBase);
  if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email))
    return fail(400, "Email looks off.", redirectBase);
  if (!message || message.length < 5 || message.length > MAX_MESSAGE)
    return fail(400, "Message is too short or too long.", redirectBase);

  const ip = clientAddress || "unknown";
  if (!rateLimit(ip)) return fail(429, "Too many submissions. Try again later.", redirectBase);

  if (!apiKey) {
    console.error("RESEND_API_KEY missing");
    return fail(500, "Mail is not configured.", redirectBase);
  }

  const subject = `Website message from ${name}`;
  const html = `<p><strong>From:</strong> ${escape(name)} &lt;${escape(email)}&gt;</p>
<p><strong>IP:</strong> ${escape(ip)}</p>
<hr />
<p style="white-space:pre-wrap">${escape(message)}</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html,
      reply_to: email,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Resend error", res.status, text);
    return fail(502, "Mail provider rejected the message.", redirectBase);
  }

  if (wantsJson) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(null, { status: 303, headers: { Location: "/contact?sent=1" } });
};

export const GET: APIRoute = () =>
  new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
