#!/usr/bin/env python3
"""Mock LaunchMail API for screenshotting the real UI.

Serves synthetic demo data only — no database, no .env, no real prospects.
Every name, address and company below is invented.
"""
import json, re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

USER = {
    "id": "u1", "fullName": "Jihang Li", "email": "jihang@launchpath.dev",
    "phone": "+1 555 0100", "emailVerified": True, "twoFactorEnabled": True,
    "pendingEmail": None, "timezone": "America/Los_Angeles", "role": "owner",
    "notificationPrefs": {},
}

SIGNATURES = [{"id": "9d1b4e88-4444-4d40-af04-0a1b2c3d7001", "name": "Default — Jihang", "htmlBody": "<p>Jihang Li · LaunchPath</p>"}]

GROUPS = [
    {"id": "5b2e7c44-2222-4b20-8d02-0a1b2c3d5001", "name": "Q3 inbound — SaaS", "description": "Trial signups, no demo yet", "memberCount": 412},
    {"id": "5b2e7c44-2222-4b20-8d02-0a1b2c3d5002", "name": "Hot leads", "description": "Replied positively", "memberCount": 68},
    {"id": "5b2e7c44-2222-4b20-8d02-0a1b2c3d5003", "name": "Conference — booth scans", "description": "SaaStr floor list", "memberCount": 233},
    {"id": "5b2e7c44-2222-4b20-8d02-0a1b2c3d5004", "name": "Dormant 90d", "description": "No touch in a quarter", "memberCount": 1074},
]

TEMPLATES = [
    {"id": "7c9a3d66-3333-4c30-9e03-0a1b2c3d6001", "name": "Intro — value first", "subject": "A faster path to {{company}}'s pipeline",
     "htmlBody": "<p>Hi {{first_name}},</p>", "textBody": "Hi {{first_name}},", "builtIn": False, "category": "Outbound"},
    {"id": "7c9a3d66-3333-4c30-9e03-0a1b2c3d6002", "name": "Follow-up — no reply", "subject": "Re: {{company}}",
     "htmlBody": "<p>Circling back.</p>", "textBody": "Circling back.", "builtIn": False, "category": "Outbound"},
    {"id": "7c9a3d66-3333-4c30-9e03-0a1b2c3d6003", "name": "Meeting confirm", "subject": "Confirmed — {{date}}",
     "htmlBody": "<p>Locked in.</p>", "textBody": "Locked in.", "builtIn": True, "category": "Scheduling"},
]

DOCS = [
    {"id": "a2c5f0aa-5555-4e50-b005-0a1b2c3d8001", "title": "Product one-pager.pdf", "filename": "product-one-pager.pdf"},
    {"id": "a2c5f0aa-5555-4e50-b005-0a1b2c3d8002", "title": "Pricing & packaging.md", "filename": "pricing.md"},
    {"id": "a2c5f0aa-5555-4e50-b005-0a1b2c3d8003", "title": "Security overview.pdf", "filename": "security.pdf"},
]

ACCOUNTS = [
    {"id": "b3d6a1cc-6666-4f60-c106-0a1b2c3d9001", "address": "jihang@launchpath.dev", "provider": "gmail", "status": "connected",
     "dailyCap": 220, "sentToday": 96, "warmup": True},
    {"id": "b3d6a1cc-6666-4f60-c106-0a1b2c3d9002", "address": "hello@launchpath.dev", "provider": "outlook", "status": "connected",
     "dailyCap": 180, "sentToday": 41, "warmup": False},
]

AGENTS = [
    {"id": "3f6c1a20-1111-4a10-9c01-0a1b2c3d4001", "dailyCap": 120, "minDelaySeconds": 45, "maxDelaySeconds": 300, "sendWindow": None, "aiProvider": "anthropic", "aiModel": "claude-sonnet-4", "trustLevel": 2, "capabilities": None, "createdAt": "2026-06-02T09:00:00Z", "updatedAt": "2026-08-05T12:00:00Z", "followUpMaxNudges": 2, "followUpSpacingDays": 3, "followUpGiveUp": "hand_off",  "name": "Inbound triage", "status": "active", "onBehalfOf": "Jihang Li",
     "tone": "direct, warm", "signatureId": "9d1b4e88-4444-4d40-af04-0a1b2c3d7001", "goal": "Qualify trial signups and book demos",
     "brief": "Answer product questions from the docs. Book a 30-minute demo when intent is clear.",
     "documentIds": ["a2c5f0aa-5555-4e50-b005-0a1b2c3d8001", "a2c5f0aa-5555-4e50-b005-0a1b2c3d8002"], "groupIds": ["5b2e7c44-2222-4b20-8d02-0a1b2c3d5001"], "inboxPoolId": None,
     "sendingAccountId": "b3d6a1cc-6666-4f60-c106-0a1b2c3d9001", "maxTouchesPerContact": 4, "maxActionsPerDay": 120},
    {"id": "3f6c1a20-1111-4a10-9c01-0a1b2c3d4002", "dailyCap": 80, "minDelaySeconds": 45, "maxDelaySeconds": 300, "sendWindow": None, "aiProvider": "anthropic", "aiModel": "claude-sonnet-4", "trustLevel": 1, "capabilities": None, "createdAt": "2026-06-02T09:00:00Z", "updatedAt": "2026-08-05T12:00:00Z", "followUpMaxNudges": 2, "followUpSpacingDays": 3, "followUpGiveUp": "hand_off",  "name": "Conference follow-up", "status": "active", "onBehalfOf": "Jihang Li",
     "tone": "brief", "signatureId": "9d1b4e88-4444-4d40-af04-0a1b2c3d7001", "goal": "Re-engage booth scans within 48h",
     "brief": "Reference the conference. One value line, one ask.",
     "documentIds": ["a2c5f0aa-5555-4e50-b005-0a1b2c3d8001"], "groupIds": ["5b2e7c44-2222-4b20-8d02-0a1b2c3d5003"], "inboxPoolId": None,
     "sendingAccountId": "b3d6a1cc-6666-4f60-c106-0a1b2c3d9002", "maxTouchesPerContact": 3, "maxActionsPerDay": 80},
    {"id": "3f6c1a20-1111-4a10-9c01-0a1b2c3d4003", "dailyCap": 40, "minDelaySeconds": 45, "maxDelaySeconds": 300, "sendWindow": None, "aiProvider": "anthropic", "aiModel": "claude-sonnet-4", "trustLevel": 1, "capabilities": None, "createdAt": "2026-06-02T09:00:00Z", "updatedAt": "2026-08-05T12:00:00Z", "followUpMaxNudges": 2, "followUpSpacingDays": 3, "followUpGiveUp": "hand_off",  "name": "Dormant re-activation", "status": "paused", "onBehalfOf": "Jihang Li",
     "tone": "curious", "signatureId": "9d1b4e88-4444-4d40-af04-0a1b2c3d7001", "goal": "Wake 90-day dormant accounts",
     "brief": "Lead with what shipped since they left.",
     "documentIds": ["a2c5f0aa-5555-4e50-b005-0a1b2c3d8001", "a2c5f0aa-5555-4e50-b005-0a1b2c3d8003"], "groupIds": ["5b2e7c44-2222-4b20-8d02-0a1b2c3d5004"], "inboxPoolId": None,
     "sendingAccountId": "b3d6a1cc-6666-4f60-c106-0a1b2c3d9001", "maxTouchesPerContact": 2, "maxActionsPerDay": 40},
]

# A real-shaped playbook using only node types the canvas knows.
WF_NODES = [
    {"id": "n1", "type": "trigger",       "position": {"x": 40,  "y": 200}, "config": {"on": "manual", "groupIds": ["5b2e7c44-2222-4b20-8d02-0a1b2c3d5001"]}},
    {"id": "n2", "type": "run_mission",   "position": {"x": 300, "y": 200}, "config": {"agentId": "3f6c1a20-1111-4a10-9c01-0a1b2c3d4001", "subject": "", "templateId": "7c9a3d66-3333-4c30-9e03-0a1b2c3d6001", "signatureId": "9d1b4e88-4444-4d40-af04-0a1b2c3d7001"}},
    {"id": "n3", "type": "ai_classify",   "position": {"x": 580, "y": 200}, "config": {"question": "Is the reply interested, not interested, or opting out?", "branches": ["interested", "not_interested", "opt_out"]}},
    {"id": "n4", "type": "book_meeting",  "position": {"x": 880, "y": 40},  "config": {"mode": "auto", "proposedTime": "2026-08-12T17:00", "durationMinutes": 30, "templateId": "7c9a3d66-3333-4c30-9e03-0a1b2c3d6003"}},
    {"id": "n5", "type": "add_to_group",  "position": {"x": 1160,"y": 40},  "config": {"groupId": "5b2e7c44-2222-4b20-8d02-0a1b2c3d5002"}},
    {"id": "n6", "type": "delay",         "position": {"x": 880, "y": 230}, "config": {"hours": 72}},
    {"id": "n7", "type": "cohort_filter", "position": {"x": 1140,"y": 230}, "config": {"condition": "opened", "withinDays": 7}},
    {"id": "n8", "type": "run_mission",   "position": {"x": 1420,"y": 170}, "config": {"agentId": "3f6c1a20-1111-4a10-9c01-0a1b2c3d4001", "templateId": "7c9a3d66-3333-4c30-9e03-0a1b2c3d6002", "signatureId": "9d1b4e88-4444-4d40-af04-0a1b2c3d7001"}},
    {"id": "n9", "type": "suppress_contact","position": {"x": 880,"y": 430},"config": {"removeFromGroups": True, "deleteContact": False}},
    {"id": "n10","type": "end",           "position": {"x": 1700,"y": 170}, "config": {}},
    {"id": "n11","type": "end",           "position": {"x": 1420,"y": 40},  "config": {}},
    {"id": "n12","type": "end",           "position": {"x": 1140,"y": 430}, "config": {}},
]
WF_EDGES = [
    {"id": "e1", "source": "n1", "target": "n2"},
    {"id": "e2", "source": "n2", "target": "n3"},
    {"id": "e3", "source": "n3", "target": "n4",  "branch": "interested"},
    {"id": "e4", "source": "n3", "target": "n6",  "branch": "not_interested"},
    {"id": "e5", "source": "n3", "target": "n9",  "branch": "opt_out"},
    {"id": "e6", "source": "n4", "target": "n5"},
    {"id": "e7", "source": "n5", "target": "n11"},
    {"id": "e8", "source": "n6", "target": "n7"},
    {"id": "e9", "source": "n7", "target": "n8",  "branch": "true"},
    {"id": "e10","source": "n7", "target": "n10", "branch": "false"},
    {"id": "e11","source": "n8", "target": "n10"},
    {"id": "e12","source": "n9", "target": "n12"},
]

WORKFLOWS = [
    {"id": "w1", "name": "Inbound trial → demo", "description": "Qualify, branch on intent, book or nurture",
     "definition": {"nodes": WF_NODES, "edges": WF_EDGES}, "agentId": None, "active": True, "runCount": 1284},
    {"id": "w2", "name": "Conference 48h follow-up", "description": "Booth scans, two touches max",
     "definition": {"nodes": WF_NODES[:4], "edges": WF_EDGES[:3]}, "agentId": None, "active": True, "runCount": 233},
    {"id": "w3", "name": "Dormant re-activation", "description": "Paused pending new positioning",
     "definition": {"nodes": WF_NODES[:3], "edges": WF_EDGES[:2]}, "agentId": None, "active": False, "runCount": 96},
]

STATS = {
    "needsFollowUp": 23, "unreadCount": 12, "scheduledCount": 7, "activeCampaigns": 3,
    "activeWorkflows": 2, "openOpportunities": 41, "tasksDueToday": 5, "pendingsOpen": 9,
    "agentEmailsToday": 137, "pendingsOverdue": 2,
    "upcomingEvents": [
        {"id": "ev1", "title": "Demo — Northwind Systems", "description": None,
         "startsAt": "2026-08-07T17:00:00Z", "endsAt": "2026-08-07T17:30:00Z", "allDay": False,
         "contactId": "c1", "source": "agent", "recurrence": None, "status": "confirmed",
         "apptType": "meeting", "outcomeNote": None, "rescheduledFrom": None},
        {"id": "ev2", "title": "Intro call — Acme Robotics", "description": None,
         "startsAt": "2026-08-08T20:00:00Z", "endsAt": "2026-08-08T20:30:00Z", "allDay": False,
         "contactId": "c2", "source": "agent", "recurrence": None, "status": "scheduled",
         "apptType": "meeting", "outcomeNote": None, "rescheduledFrom": None},
    ],
    "accountHealth": [
        {"accountId": "b3d6a1cc-6666-4f60-c106-0a1b2c3d9001", "address": "jihang@launchpath.dev", "sentToday": 96, "dailyCap": 220},
        {"accountId": "b3d6a1cc-6666-4f60-c106-0a1b2c3d9002", "address": "hello@launchpath.dev", "sentToday": 41, "dailyCap": 180},
    ],
}

OPPS = [
    {"id": "o1", "title": "Northwind Systems — 40 seats", "stage": "demo", "amount": 24000,
     "currency": "USD", "contactId": "c1", "ownerId": "u1", "status": "open",
     "createdAt": "2026-07-20T10:00:00Z", "updatedAt": "2026-08-05T10:00:00Z"},
    {"id": "o2", "title": "Acme Robotics — pilot", "stage": "qualified", "amount": 8000,
     "currency": "USD", "contactId": "c2", "ownerId": "u1", "status": "open",
     "createdAt": "2026-07-28T10:00:00Z", "updatedAt": "2026-08-04T10:00:00Z"},
]

THREADS = [
    {"id": "th1", "threadId": "th1", "subject": "Re: A faster path to Northwind's pipeline",
     "snippet": "This looks useful — can you do Thursday afternoon?", "from": "dana@northwind.example",
     "fromName": "Dana Whitfield", "unread": True, "receivedAt": "2026-08-05T18:22:00Z", "accountId": "b3d6a1cc-6666-4f60-c106-0a1b2c3d9001"},
    {"id": "th2", "threadId": "th2", "subject": "Re: Acme Robotics",
     "snippet": "Forwarding to our ops lead.", "from": "sam@acme.example",
     "fromName": "Sam Okafor", "unread": True, "receivedAt": "2026-08-05T16:04:00Z", "accountId": "b3d6a1cc-6666-4f60-c106-0a1b2c3d9001"},
    {"id": "th3", "threadId": "th3", "subject": "Re: SaaStr follow-up",
     "snippet": "Not right now, revisit in Q4.", "from": "lee@vertex.example",
     "fromName": "Lee Marchetti", "unread": False, "receivedAt": "2026-08-05T14:41:00Z", "accountId": "b3d6a1cc-6666-4f60-c106-0a1b2c3d9002"},
]

ROUTES = {
    "/users/me": USER,
    "/agents": AGENTS,
    "/agents/handoff-counts": [{"agentId": "3f6c1a20-1111-4a10-9c01-0a1b2c3d4001", "count": 4}, {"agentId": "3f6c1a20-1111-4a10-9c01-0a1b2c3d4002", "count": 1}],
    "/workflows": WORKFLOWS,
    "/contact-groups": GROUPS,
    "/templates": TEMPLATES,
    "/signatures": SIGNATURES,
    "/documents": DOCS,
    "/email-accounts": ACCOUNTS,
    "/dashboard/stats": STATS,
    "/dashboard/onboarding/checklist": [],
    "/messages/unread-counts": [{"accountId": "b3d6a1cc-6666-4f60-c106-0a1b2c3d9001", "unread": 9}, {"accountId": "b3d6a1cc-6666-4f60-c106-0a1b2c3d9002", "unread": 3}],
    "/messages/latest-threads": THREADS,
    "/opportunities": OPPS,
    "/pendings": [],
    "/tasks": [],
    "/task-transfers": [],
    "/notifications": [],
    "/contacts": [],
}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):  # quiet
        pass

    def _send(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _route(self):
        path = self.path.split("?")[0]
        path = re.sub(r"^/api/v1", "", path)
        if path in ROUTES:
            return ROUTES[path]
        # Paged endpoints must answer with the Page envelope — components read
        # `.content.length` directly, so a bare [] crashes them.
        if any(path.endswith(sfx) for sfx in ("/missions", "/runs", "/actions", "/messages")):
            return {"page": 0, "size": 20, "totalElements": 0, "totalPages": 0, "content": []}
        if path.endswith("/stats"):
            return {"sentTotal": 4820, "sentToday": 96, "queued": 14, "missions": 7,
                    "approvalRatePct": 94, "optOutRatePct": 0.4}
        return []

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "*")
        self.end_headers()

    def do_GET(self):
        self._send(self._route())

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n:
            self.rfile.read(n)
        p = self.path.split("?")[0]
        if p.endswith("/messages/batch"):
            return self._send([])
        self._send({})

    do_PATCH = do_PUT = do_POST


if __name__ == "__main__":
    print("mock LaunchMail API on :9090 — synthetic data only")
    ThreadingHTTPServer(("127.0.0.1", 9090), H).serve_forever()
