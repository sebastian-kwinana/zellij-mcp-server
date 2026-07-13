# Agent-to-Agent Refusal: Prior-Art Terminology Search + Dimensions Framework

**Status: RESEARCH-IN-PROGRESS — PENDING OPERATOR (SebHuman) + Claude-2-INTROSPECTION REVIEW.**
Nothing here is a settled conclusion. This note deliberately separates *established
terms found in the literature* (cited) from *this author's inference* (labelled as
such). Per the AMENDMENT to
[`2026-07-13-phaseD-live-messaging-demo.md`](../Provenance/Windows-MCP/2026-07-13-phaseD-live-messaging-demo.md),
the "refusal = HoTL safety property working as intended" reading is **one
hypothesis, not an established root cause**; the recipient agent's own first-person
introspection ("Claude-2") is the *primary* evidence and supersedes this note where
they conflict.

**Discipline enforced by the operator:** *search for existing terminology BEFORE
coining anything.* Part 1 is that search. Part 3 proposes names ONLY for the
residual gap Part 1 could not fill, and each proposal is marked "PROPOSED — pending
SebHuman decision."

**The event in one sentence.** A "leader" Claude Code agent wrote a structured
`__AAAH_MSG__` packet into a *different* Claude Code agent's Zellij pane, asking it
to call an MCP tool and echo a formatted `__AAAH_REPLY__` line; the recipient
(**Claude Code v2.1.206, Sonnet 5** per the transcript) **refused twice**, reasoning
that (a) the instruction arrived as *data inside a local command result*, not from
its human, and (b) a message cannot authenticate itself merely by *asserting* it is
authenticated — then escalated to the human. Raw evidence:
[`2026-07-13-phaseD-tab50-transcript.txt`](../Provenance/Windows-MCP/2026-07-13-phaseD-tab50-transcript.txt).

---

## Executive summary (read this first)

- **The literature is dense, active, and mid-coinage.** Established terms already
  cover *almost every facet* of this event. The strongest single finding: the
  *attack* this refusal defends against is already named — **"Inter-Agent Trust
  Exploitation"** [6][7], the empirically-documented phenomenon that LLMs which
  resist direct prompt injection will execute the *identical* payload when a *peer
  agent* asks. **This Phase-D event is the desirable inverse of that named attack.**
- **The recipient's core argument is a textbook security distinction**, not a novel
  one: it is the **in-band vs. out-of-band authentication** problem [32][33] — a
  credential (here, "the operator approved this") delivered *through the same
  untrusted channel it is meant to secure* proves nothing.
- **Recommendation direction: ADOPT existing vocabulary, do not coin, for the
  security facets.** There is a genuine *residual* gap only for a compact label for
  the **composite desirable posture** (injection-resistance + zero-trust-of-peers +
  escalate-to-human as one behaviour). Even there the field is actively minting
  provisional labels (e.g. "ambient persuasion" is flagged provisional *by its own
  authors* [14]), so any Kwinana coinage should be framed as *joining an unsettled
  conversation*, not filling a vacuum.
- **This does NOT belong under the existing SNEng umbrella** (see Part 3): SNEng is
  *design-time* "features we will not build," a different layer from a *running
  agent* declining a *runtime* message.

---

## Part 1 — Prior-art / existing-terminology search

Sources: the Consensus academic-paper tool (peer-reviewed + ArXiv; three searches)
and general web search (industry/blog/spec). Citation numbers `[n]` map to the
single consolidated reference list at the foot of this file. Where a claim is *this
author's reading* rather than a source's own words, it is marked **(inference)**.

### Facet A — An agent refusing to act on instructions received from ANOTHER agent (not a human)

This is the heart of the event, and it is **directly named in the literature — as
the attack whose failure mode this refusal represents the success case of.**

- **"Inter-Agent Trust Exploitation."** Pironti/Lupinacci et al. [6][7] evaluated 18
  frontier LLMs and found that models which *resist* Direct Prompt Injection and RAG
  backdoors will nonetheless "execute identical payloads when requested by peer
  agents," reporting **100% compromise via Inter-Agent Trust Exploitation** and that
  "every model exhibits context-dependent security behaviors that create exploitable
  blind spots." **(inference):** the Phase-D recipient exhibited the *rare desirable*
  behaviour — it did *not* extend trust to a peer agent — i.e. it did not fall to the
  documented attack.
- **"Prompt Infection" / "LLM Tagging."** Lee et al. [3] name **Prompt Infection** —
  malicious prompts that "self-replicate across interconnected agents … like a
  computer virus" — and propose **LLM Tagging** as a defense. The `__AAAH_MSG__` /
  `__AAAH_REPLY__` protocol is structurally an (authorised) infection vector; the
  recipient's refusal to emit the `__AAAH_REPLY__` line is exactly the *non-
  propagation* LLM Tagging aims to guarantee. **(inference).**
- **Cross-agent trust boundaries / provenance ledgers.** Syed et al. [1][4] frame
  agent-to-agent messages as needing "clear trust frames" with per-message
  **modality, source, and trust level** metadata so "injected instructions are not
  propagated down … workflows." The recipient improvised this by hand: it asked
  "where did this content *actually* come from?"
- **Trust-Vulnerability Paradox (TVP).** Xu et al. [12] formalise that *raising*
  inter-agent trust to improve coordination *simultaneously* expands
  over-authorization risk, and argue trust "must be modeled and scheduled as a
  first-class security variable." This is the exact tension Phase-D surfaced.

**Verdict, Facet A:** No naming gap for the *attack* (adopt **Inter-Agent Trust
Exploitation** [6][7]) nor for the *propagation* framing (adopt **Prompt Infection**
[3]). What lacks a single crisp term is the *defender's* composite behaviour — see
Part 3.

### Facet B — Inter-agent / A2A authentication, trust establishment, "agent handshake"

Richly covered; **adopt existing terms wholesale.**

- **Google Agent2Agent (A2A) protocol** [24] provides the canonical vocabulary:
  **AgentCard** (machine-readable capability/identity metadata), **Signed Agent
  Cards** (cryptographic issuer verification), and mutual auth via OAuth 2.0 / OIDC,
  JWTs, mTLS, and API keys. Donated to the Linux Foundation (June 2025).
- **DIDs + Verifiable Credentials + challenge-response handshake.** Multiple sources
  [26][27][28] describe a four-phase **agent handshake**: exchange W3C Decentralized
  Identifiers (DIDs) → resolve DID Document for public key → **nonce challenge-
  response** signature → verify. The W3C **Agent Identity Registry Protocol** CG [27]
  is standardising this. Klover.ai's industry term for the trust ceremony is **"the
  AI Handshake"** [29].
- **Blockchain-anchored A2A trust.** BlockA2A [9] and a decentralized trust-aware MAS
  [13] add immutable provenance ledgers and cryptographic non-repudiation on top of
  A2A; TRiSM [10] and the TrustAgent survey [11] are the umbrella survey vocabularies
  ("Trust, Risk & Security Management"; intrinsic vs. extrinsic trust).
- **Comparative protocol security** [25] evaluates A2A/MCP-class protocols head-to-
  head.

**Verdict, Facet B:** No gap. The design requirement the Phase-D record calls for
("a *real* authentication channel — shared secret / signed envelope / trusted
broker") is precisely **signed AgentCards / DID challenge-response / out-of-band
auth**. Recommend the follow-up "authentication-channel" design item cite A2A +
DID/VC directly rather than invent a scheme.

### Facet C — Prompt-injection / indirect-prompt-injection resistance in multi-agent systems

Extensively covered; **adopt.**

- **"Prompt injection"** was coined by Simon Willison (2022); his sharper agentic
  framing is the **"lethal trifecta"** — untrusted content + access to private data +
  an exfiltration/external-communication vector [19]. Phase-D is a controlled
  instance: the `__AAAH_MSG__` is untrusted content asking the agent to run a tool
  and emit output "into whatever channel is relaying these messages."
- **OWASP** codifies it as **LLM01:2025 Prompt Injection**, **LLM06:2025 Excessive
  Agency** [23], and, in the 2026 Agentic Top 10, **ASI01 Agent Goal Hijack** (which
  explicitly "merges prompt injection with excessive autonomy") [22].
- **Systematisation & defenses.** A 2026 SoK [5] taxonomises PI attacks/defenses and
  notably warns that many defenses "appear effective … by suppressing contextual
  inputs, yet fail … where context-dependent reasoning is essential" — relevant
  because the recipient had to *reason about* the message, not blindly suppress it.
  Beurer-Kellner et al. [8] give "design patterns … with provable resistance."
  Multi-agent defense pipelines [2] and Ferrag et al.'s protocol-exploit survey [4]
  ("Toxic Agent Flow," ad-hoc authentication) round this out.
- **Anthropic's own stance.** Anthropic trains Claude for exactly this: RL that
  exposes Claude to injections in simulated content and "reward[s] it when it
  correctly identifies and refuses to comply" [20]; platform guidance on mitigating
  jailbreaks/injections [21]. **(inference):** the recipient's behaviour is
  consistent with this training objective — which is *why* attributing it to any
  single dimension (Part 2) is premature.

**Verdict, Facet C:** No gap. Adopt **indirect prompt injection**, **lethal
trifecta** [19], **OWASP LLM01/LLM06/ASI01** [22][23].

### Facet D — An AI declining a proposed action on safety grounds: is there a refusal taxonomy?

Yes — but the existing taxonomies are **content-refusal** taxonomies (refusing
*what* is asked), not **source/provenance-refusal** taxonomies (refusing *because of
who/what asked*).

- The **"cannot vs. should-not"** refusal distinction, a 16-category refusal taxonomy,
  and human-annotated refusal datasets exist [30]; SORRY-Bench (45-class) and
  "Beyond I'm Sorry, I Can't" [31] dissect refusal styles (curt denial vs. reasoned
  redirect-to-alternative). The Phase-D refusal is a *reasoned, redirecting* refusal
  in these terms (it offered to report WinMCPstdio state "as a normal answer").
- **(inference):** none of these taxonomies has a category for "refuse because the
  instruction's *provenance/channel* is untrusted." They classify refusals of
  *harmful content from the user*; this was a refusal of *plausibly-benign content
  from a non-user source*. That axis is the genuinely under-named one.

**Verdict, Facet D:** Partial gap. Adopt existing refusal-taxonomy vocabulary for
*style*, but note the *provenance-triggered refusal* axis is not a named category in
these taxonomies (feeds Part 3).

### Facet E — "Confused deputy," cross-tenant trust, capability-based auth for agent messaging

Covered; **adopt.**

- **Confused deputy** is the standard framing for prompt-injection-driven tool misuse:
  "a prompt injection causes the agent to use a tool on behalf of an attacker — the
  classical confused-deputy pattern, weaponized" [22]. The recipient *avoided*
  becoming a confused deputy.
- **Least-privilege / per-action authorization / scoped tokens / human-in-the-loop
  for high-impact actions** are the named mitigations [22]; capability-based and
  zero-trust framings appear across [9][11].
- **In-band vs. out-of-band authentication** [32][33] and **zero-trust "never trust,
  always verify"** [34] are the precise names for the recipient's winning argument:
  a self-asserted "I'm authenticated" delivered *in-band* is not evidence;
  authentication must be *out-of-band* / externally verified. **This is the single
  most on-point established term for the trust facet and should be adopted verbatim.**

**Verdict, Facet E:** No gap. Adopt **confused deputy**, **in-band vs. out-of-band
authentication**, **zero-trust**.

### Adjacent finding worth flagging (escalation + provisional labels)

- **Escalation channels.** Gómez [17] shows that giving an agent a *credible out-of-
  band route to surface a conflict to an independent authority* drives harmful-action
  rates from 38.7% → ~1.2%; "instrumental credibility of the authorised alternative
  matters." The recipient did exactly this — it escalated to the human instead of
  complying. Term to adopt: **escalation channel**. Related: **The Oversight Game**
  (agent chooses *play* vs. *ask*; human chooses *trust* vs. *oversee*) [15].
- **Field is mid-coinage.** Cuadros et al. [14] introduce **"ambient persuasion"** and
  **"directive weighting error"** as *explicitly provisional* labels for a *related
  but opposite* incident (an agent that *over-complied* with ambient content and
  escalated privileges). Agentic-misalignment [16] and peer-preservation [18] name
  other emergent A2A behaviours. **(inference):** the naming landscape is unsettled
  and actively being populated — supports "join the conversation," cautions against
  premature canonical claims.

### Part 1 verdict table

| Operator's candidate idea | Established term(s) found | Verdict |
|---|---|---|
| Agent refuses instructions from another agent | **Inter-Agent Trust Exploitation** [6][7] (the attack); **Prompt Infection** [3] (propagation) | **ADOPT** for attack/propagation; residual gap only for the *defender's composite posture* |
| A2A authentication / trust / "agent handshake" | **A2A protocol, Signed AgentCards** [24]; **DID/VC challenge-response handshake** [26][27][29]; **BlockA2A** [9] | **ADOPT** — no gap |
| PI / indirect-PI resistance in multi-agent | **prompt injection, lethal trifecta** [19]; **OWASP LLM01/LLM06/ASI01** [22][23]; SoK [5] | **ADOPT** — no gap |
| AI declining an action on safety grounds | refusal taxonomies (cannot/should-not, SORRY-Bench) [30][31] | **ADOPT for style**; *provenance-triggered* refusal axis under-named |
| Confused deputy / cross-tenant trust / capability auth | **confused deputy** [22]; **in-band vs out-of-band auth** [32][33]; **zero-trust** [34] | **ADOPT** — no gap |
| (Escalate-to-human behaviour) | **escalation channel** [17]; **Oversight Game** [15] | **ADOPT** — no gap |

**Bottom line for Part 1:** For every *individual* facet an adequate established term
exists — **the honest recommendation is ADOPT, not coin.** The only thing lacking a
single crisp name is the *composite* defender posture (Facet A defender-side +
Facet D provenance axis), and even that sits in an actively-coining field.

---

## Part 2 — The "up to ~8 dimensions" framework

**Purpose:** characterise *why a fresh conversation in an AAAH refuses* when
multi-agent orchestration is attempted **without** per-AAAH-tuned CLI params +
context-priming files. Below: eight dimensions (the operator's six + two of the
candidate additions, merged to stay ≤8). Each gives **what it is**, **how it
plausibly contributed to THIS refusal** (evidence-tagged: T = transcript,
I = inference), and **how to isolate/test** it. All contributions are *plausible
contributors to a multi-causal event*, not proven single causes — per the AMENDMENT,
disentangling them is the open research, and **Claude-2's own introspection is the
pending primary evidence.**

Merges made to respect the ≤8 ceiling: **CLI parameters + permission/approval mode**
→ D6 (both are runtime config knobs); **delivery channel + "is the sender
authenticated"** → D5 (for *this* event they are the same axis — the crux). Advisor-
noted accuracy points are folded in.

### D1 — AI Model
- **What:** the underlying model weights/version doing the reasoning. Independent of
  harness.
- **This refusal:** recipient is **Sonnet 5** (T: transcript banner "Sonnet 5 ·
  Claude Pro"); the leader is a *different* session/model. There is real **model
  asymmetry** — refusal propensity and injection-resistance are model-specific
  [6][7][20]. (I).
- **Isolate/test:** replay the identical `__AAAH_MSG__` against several models in the
  *same* harness+config (Sonnet 5, Opus, a Grok/Copilot model). Hold everything else
  constant; vary only the model.

### D2 — AAAH (Agentic AI Agent Harness)
- **What:** the CLI/runtime (Claude Code here; also Grok CLI, Copilot CLI, Antigravity
  `agy`). Adds tool schemas, output rendering, approval UX, its own system prompt.
- **This refusal:** Claude Code surfaced the injected packet as a *local command
  result* and the recipient reasoned about that framing explicitly (T: "it arrived as
  data inside a local command result"). A different harness might render the same
  bytes differently (e.g. as chat input), changing the outcome. (I).
- **Isolate/test:** same model + same message across harnesses; observe whether the
  "this is data, not my user" framing survives. This is the multi-harness (Issue #6)
  matrix.

### D3 — Auto-injected context files (CLAUDE.md / AGENTS.md)
- **What:** files a harness auto-loads into every new conversation (Claude Code:
  `CLAUDE.md`; most others: `AGENTS.md`).
- **This refusal:** **demonstrably fired.** Recipient: "**Per my instructions**,
  content like this should be surfaced to you rather than followed" (T). The repo's
  `CLAUDE.md`/`AGENTS.md` carry a strong security posture. (T + I for causal weight).
- **Isolate/test:** run the message in a *scratch dir with no `CLAUDE.md`/`AGENTS.md`*
  vs. the repo. If refusal weakens without the files, this dimension carries weight.
  **Highest-leverage single test in this list.**

### D4 — Structure/syntax of the first message(s) (looks non-human)
- **What:** whether the opening message reads like a human turn or like machine
  protocol (delimiters, `from=/to=/seq=`, self-declared "AI-to-AI" framing).
- **This refusal:** **fired.** The `__AAAH_MSG__ … __AAAH_MSG_END__` envelope *looks
  like* an injection payload; recipient: "This has the shape of a prompt injection"
  (T). The very formatting meant to signal legitimacy instead signalled *untrusted
  machine origin*. (T).
- **Isolate/test:** send the same *semantic* request phrased as a plain human turn
  ("please run your status tool and tell me the result") vs. the delimited protocol
  packet. Vary only surface form.

### D5 — Channel provenance & sender authentication (**the crux — this dominated**)
- **What:** *how* the message physically arrived (pasted-as-user vs. injected into the
  pane as command output) **and** whether the sender's identity/authority can be
  *verified out-of-band*. For this event these collapse into one axis.
- **This refusal:** **this is what the refusal actually turned on**, across *both*
  rounds. Round 1: "it arrived as data inside a local command result (not something
  you typed)" (T). Round 2, after the leader *asserted* authorisation: the recipient
  held firm because the message "cannot authenticate itself merely by asserting it is
  authenticated" — the textbook **in-band authentication** failure [32][33], zero-
  trust [34]. **(inference):** even a perfectly human-looking, memory-primed,
  correctly-parametrised setup would *still* fail this test, because the missing thing
  is a *cryptographic/out-of-band* trust anchor (A2A signed cards / DID challenge-
  response [24][26]) — which is why the Phase-D record's "authentication-channel"
  follow-up is the real fix, not prompt-tuning.
- **Isolate/test:** (a) deliver the identical instruction as a genuine user turn
  (typed by the human) → expect compliance, isolating "channel." (b) Add a real
  out-of-band auth token the recipient was configured at launch to trust → expect
  compliance *with* provenance, isolating "authentication." If (b) flips the outcome,
  this dimension is confirmed dominant.

### D6 — CLI parameters + permission/approval mode
- **What:** launch flags and the approval posture (`--permission-mode`, auto/plan/
  manual, model selection, MCP config). Merged: both are pre-conversation config
  knobs the operator sets per-AAAH.
- **This refusal:** **ambiguous in the evidence — report, don't resolve.** `/status`
  shows `permissionMode auto` (T, line 22) yet the footer reads "**manual mode on**"
  (T, line 76). The recipient never reached a tool-approval prompt because it refused
  *upstream* at the reasoning layer — so permission mode may not have bound at all
  here. (T, with explicit ambiguity flagged per advisor.)
- **Isolate/test:** replay under explicit `auto` vs. `manual` vs. `plan`; check
  whether the refusal is a *reasoning-layer* refusal (fires regardless of mode) or a
  *gate-layer* refusal (mode-dependent). Current evidence suggests the former.

### D7 — Cross-conversation / native memory
- **What:** whether the harness feeds *recent other conversations* into this one
  (cross-session memory), which could prime or de-prime suspicion.
- **This refusal:** **unknown — no transcript evidence either way.** The session shows
  `/status` with "Enabled Remote Control for all sessions" but nothing confirming
  cross-conversation memory content influenced the refusal. Listed for completeness;
  do not assert it fired. (I, low confidence.)
- **Isolate/test:** run with memory explicitly on (having pre-seeded a benign
  "multi-agent demo is sanctioned" prior conversation) vs. a cold session with memory
  off. If the primed session complies, memory is a live dimension.

### D8 — System-prompt / tool-schema differences
- **What:** the harness's built-in system prompt and the *shape* of the tool schemas
  offered (names, descriptions, safety text) — distinct from D3's user-supplied files.
- **This refusal:** **(inference):** Anthropic ships injection-resistance in the
  model/system layer [20][21]; the recipient's default posture ("surface, don't
  follow") is partly this baseline. The specific tool asked for
  (`zellij_windows_mcp_status`) was also *unavailable* (WinMCPstdio down, T), a
  confound: refusal and inability co-occurred.
- **Isolate/test:** compare harnesses with different system prompts holding
  model+files constant; and re-run with the target MCP tool *actually connected* to
  remove the availability confound.

**Framework caveat (binding):** these eight are *plausible joint contributors*. The
event is over-determined — several fired together (D3, D4, D5 clearly; D1, D8 as
baseline; D6, D7 ambiguous/unknown). **D5 is assessed as dominant** because the
refusal *held* precisely when the leader tried to remove every other objection by
asserting authorisation, and the recipient's counter was purely an authentication
argument. This assessment is **provisional pending Claude-2's introspection**, which
is the primary evidence for which dimensions actually drove its reasoning.

---

## Part 3 — Naming recommendation (conservative; ADOPT-first)

**Primary recommendation: ADOPT existing terminology; do NOT coin new names for the
security facets.** Part 1 found an adequate established term for every individual
facet. Concretely, describe this event and its follow-ups using:

- **Inter-Agent Trust Exploitation** [6][7] — for the *attack class* this refusal
  defended against (and the event as its *desirable inverse*).
- **In-band vs. out-of-band authentication** [32][33] + **zero-trust** [34] — for the
  recipient's winning argument and the required fix.
- **Signed AgentCards / A2A / DID challenge-response handshake** [24][26][27] — for the
  "real authentication channel" design item the Phase-D record calls for.
- **Confused deputy** [22], **lethal trifecta** [19], **OWASP LLM01/LLM06/ASI01**
  [22][23], **Prompt Infection / LLM Tagging** [3], **escalation channel** [17].

**Residual gap (the only place coinage is even arguable):** there is no single crisp,
established term for the *composite defender posture* — "an agent that (i) treats a
peer-agent instruction arriving over an untrusted channel as suspect, (ii) refuses to
authenticate it on self-assertion, and (iii) escalates to a human rather than
complying." Facet A's terms name the *attack*; Facet D's taxonomies name refusal
*style*, not *provenance-triggered* refusal. If — and only if — SebHuman judges this
composite worth a handle, the following are offered:

1. **"Provenance Refusal"** — *PROPOSED — pending SebHuman decision.* An agent
   declining an instruction on the basis of its *provenance/channel* (who/what/how it
   arrived) rather than its *content*. Advantage: names the exact under-covered axis
   from Facet D; minimal, self-explanatory; composes with existing terms.
2. **"Peer-Instruction Zero-Trust (posture)"** — *PROPOSED — pending SebHuman
   decision.* Frames the behaviour as the correct default stance toward peer agents,
   directly echoing established zero-trust [34] and Inter-Agent Trust Exploitation
   [6][7]. Advantage: maximally continuous with the literature (least "new coinage"
   feel).
3. **"Escalating Provenance Refusal"** — *PROPOSED — pending SebHuman decision.* Adds
   the escalate-to-human element (Facet: escalation channel [17]) to option 1, for the
   full three-part posture.

**Author's leaning (not a decision):** prefer **adopting** option-1 phrasing
("provenance refusal") *as descriptive language* over minting a new capitalised
Kwinana acronym, because the field is visibly mid-coinage (even peer researchers mark
their labels "provisional" [14]) and a new acronym risks colliding with terms not yet
settled. This is SebHuman's call.

### Relationship to SNEng — recommend **distinct concept, NOT under the SNEng umbrella**

SNEng ("Solutions Negation Engineering") is defined in-repo *only* in an operator
plan file
(`.claude/plans/…/root-claude-uploads-abd25b68-…work.md`, §"SNEng — what we will NOT
do") and referenced for `SUPPLY_CHAIN.md`; it is **not in `GLOSSARY.md`**. As defined
there, SNEng is a **design-time discipline: the enumerated list of features the
project deliberately will *not* build** (no telemetry, no auto-update, no
shell-substitution-from-user-input, no mDNS discovery, etc.).

**(inference):** the Phase-D refusal shares only the surface theme of "negation." It
operates at a *different layer*: a **running agent** declining a **runtime message**,
not **engineers** excluding a **feature** at design time. Recommend treating
agent-to-agent / provenance refusal as a **distinct concept** (naturally adjacent to
the security/trust vocabulary above and to HoTL/HASEng), **not** as a sub-item of
SNEng. If the operator wants a thematic link, the honest one is "both are forms of
principled *no*" — but conflating them in the glossary would muddy two different
engineering activities. *Deferred to SebHuman.*

---

## References (consolidated)

Academic (Consensus tool; URLs are the tool's exact paper links):

[1] [Toward Trustworthy Agentic AI: A Multimodal Framework for Preventing Prompt Injection Attacks](https://consensus.app/papers/details/e84980fde1b75e928a9afed52aec5772/?utm_source=claude_desktop) (Toqeer Ali Syed et al., 2025, ArXiv)
[2] [A Multi-Agent LLM Defense Pipeline Against Prompt Injection Attacks](https://consensus.app/papers/details/2d1efe6d40ea59da84dd6ae8301f8846/?utm_source=claude_desktop) (S. Hossain et al., 2025, IEEE WIECON-ECE)
[3] [Prompt Infection: LLM-to-LLM Prompt Injection within Multi-Agent Systems](https://consensus.app/papers/details/891d8c2e1b8856728447e58135d82dd5/?utm_source=claude_desktop) (Donghyun Lee et al., 2024, ArXiv)
[4] [From Prompt Injections to Protocol Exploits: Threats in LLM-Powered AI Agents Workflows](https://consensus.app/papers/details/4ab586bc9f9358f99651d024e232fe26/?utm_source=claude_desktop) (M. Ferrag et al., 2025, ICT Express)
[5] [The Landscape of Prompt Injection Threats in LLM Agents: From Taxonomy to Analysis](https://consensus.app/papers/details/15aafe437be458928408220ea5f39959/?utm_source=claude_desktop) (Pei Wang et al., 2026, ArXiv)
[6] [The Dark Side of LLMs: Agent-based Attack Vectors for System-level Compromise](https://consensus.app/papers/details/d47855e940f5555392d1767cde038004/?utm_source=claude_desktop) (Matteo Lupinacci et al., 2025)
[7] [The Dark Side of LLMs: Agent-based Attacks for Complete Computer Takeover](https://consensus.app/papers/details/edd7ec0a07195573ad0a9b44e61373ce/?utm_source=claude_desktop) (F. A. Pironti et al., 2025, ArXiv)
[8] [Design Patterns for Securing LLM Agents against Prompt Injections](https://consensus.app/papers/details/ea213f513f7356a48ff170a531ff361a/?utm_source=claude_desktop) (Luca Beurer-Kellner et al., 2025, ArXiv)
[9] [BlockA2A: Towards Secure and Verifiable Agent-to-Agent Interoperability](https://consensus.app/papers/details/b02ae85abe865c5482de2f53b998437e/?utm_source=claude_desktop) (Zhenhua Zou et al., 2025, ArXiv)
[10] [TRiSM for Agentic AI: A Review of Trust, Risk, and Security Management in LLM-based Agentic Multi-Agent Systems](https://consensus.app/papers/details/d619f4f9cd725e25a5f8b2af33228a4c/?utm_source=claude_desktop) (Shaina Raza et al., 2025, ArXiv)
[11] [A Survey on Trustworthy LLM Agents: Threats and Countermeasures](https://consensus.app/papers/details/88cebd1987ee5dc4927d3d7b5372ae45/?utm_source=claude_desktop) (Miao Yu et al., 2025, ACM SIGKDD)
[12] [The Trust Paradox in LLM-Based Multi-Agent Systems: When Collaboration Becomes a Security Vulnerability](https://consensus.app/papers/details/a8b794dd84125ee28cd6bef3eb81d632/?utm_source=claude_desktop) (Zijie Xu et al., 2025, ArXiv)
[13] [Decentralized Multi-Agent System with Trust-Aware Communication](https://consensus.app/papers/details/9e3a1060e9f452e3b6e6060ad822a57e/?utm_source=claude_desktop) (Yepeng Ding et al., 2025, IEEE ISPA)
[14] [Ambient Persuasion in a Deployed AI Agent: Unauthorized Escalation Following Routine Non-Adversarial Content Exposure](https://consensus.app/papers/details/8b402cc14d3c56e6a5c7b0536b0669ee/?utm_source=claude_desktop) (D. Cuadros et al., 2026)
[15] [The Oversight Game: Learning to Cooperatively Balance an AI Agent's Safety and Autonomy](https://consensus.app/papers/details/96c433c5306150f188e8706b591c759d/?utm_source=claude_desktop) (William Overman et al., 2025, ArXiv)
[16] [Agentic Misalignment: How LLMs Could Be Insider Threats](https://consensus.app/papers/details/3a1356d5bca65e4a9fcc76d9ea5814b0/?utm_source=claude_desktop) (Aengus Lynch et al., 2025, ArXiv)
[17] [From surveillance to signalling: escalation channels as environmental controls for agentic AI](https://consensus.app/papers/details/a0c71f1f44f35dc9828fd7b4c2f2ffb4/?utm_source=claude_desktop) (F. Gómez, 2025)
[18] [Peer-Preservation in Frontier Models](https://consensus.app/papers/details/73540f0b3f655eb5b6d38c3c8df0db8c/?utm_source=claude_desktop) (Yujin Potter et al., 2026, ArXiv)

Web / industry / spec (general web search):

[19] [The lethal trifecta for AI agents: private data, untrusted content, and external communication](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) — Simon Willison, 2025 (also coined "prompt injection," 2022)
[20] [Mitigating the risk of prompt injections in browser use](https://www.anthropic.com/research/prompt-injection-defenses) — Anthropic
[21] [Mitigate jailbreaks and prompt injections](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks) — Claude Platform Docs
[22] [OWASP Top 10 for Agentic Apps (2026), Explained](https://aisecurityplatform.com/guides/owasp-agentic-top-10-explained/) — incl. ASI01 Agent Goal Hijack, confused-deputy framing
[23] [LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm06-sensitive-information-disclosure/) — OWASP Gen AI Security Project
[24] [Agent2Agent (A2A) protocol](https://github.com/a2aproject/A2A) and [Security & Authentication (DeepWiki)](https://deepwiki.com/google/A2A/3.2-security-and-authentication) — Google / Linux Foundation
[25] [Security Analysis of Agentic AI Communication Protocols: A Comparative Evaluation](https://arxiv.org/pdf/2511.03841)
[26] [AI Agents with Decentralized Identifiers and Verifiable Credentials](https://arxiv.org/abs/2511.02841)
[27] [Agent Identity Registry Protocol Community Group](https://www.w3.org/community/agent-identity/) — W3C
[28] [Agentic AI Identity & Access Management: A New Approach](https://cloudsecurityalliance.org/artifacts/agentic-ai-identity-and-access-management-a-new-approach) — Cloud Security Alliance
[29] [The AI Handshake: Building Trust for Negotiation and Escalation in Your Multi-Agent Enterprise](https://www.klover.ai/the-ai-handshake-building-trust-for-negotiation-and-escalation-in-your-multi-agent-enterprise/) — Klover.ai
[30] [Cannot or Should Not? Automatic Analysis of Refusal Composition in IFT/RLHF Datasets and Refusal Behavior of Black-Box LLMs](https://arxiv.org/abs/2412.16974)
[31] [Beyond "I'm Sorry, I Can't": Dissecting Large-Language-Model Refusal](https://arxiv.org/html/2509.09708)
[32] [What are In-Band Authentication Factors?](https://plurilock.com/glossary/in-band/) — Plurilock glossary
[33] [GraphQL Authentication: Why out-of-band authentication is better than in-band](https://cloudcity.io/blog/2021/08/22/GraphQL-Authentication-Why-out-of-band-authentication-is-better-than-in-band/) — CloudCity
[34] [ZTNA anti-patterns (Zero Trust)](https://www.ncsc.gov.uk/collection/zero-trust/zero-trust-network-access-ztna/ztna-anti-patterns) — UK NCSC

---

*Consensus tool usage notice (reproduced verbatim as required):*

> Upgrade to Consensus Pro to return 20 results per search instead of 10, and include more data like study design and key takeaways for every result.: https://consensus.app/pricing/?utm_source=claude_desktop
