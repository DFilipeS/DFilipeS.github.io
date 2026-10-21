# Personal website — design direction

Audience: fellow engineers and people with shared interests. A business card and a personal publishing space; room for linked notes later.

References supplied by Daniel: Earendil's system theme article, Armin Ronacher's Codemode article, and Amp's Shared Runners announcement. Simple pages with deliberate details.

Daniel also explicitly likes Every's design style:
- https://every.to/p/how-codex-happened
- https://every.to/playtesting/we-caught-an-ai-cheating-by-watching-it-play-starcraft

Reference inspection: large editorial headlines, near-black text on very light backgrounds, restrained interface typography, generous space, and comfortable reading columns. The standard article uses Signifier serif headings and body text; the bespoke Codex feature mixes Signifier headlines, sans-serif section headings, and Georgia prose. Daniel confirmed that the typography itself is what he likes about Every. The current pass uses locally served Source Serif 4 (an open-source alternative, not Every's proprietary Signifier) for headlines and reading text, with IBM Plex Sans for navigation and metadata. Keep the current cool palette; the original brown/Charter treatment remains rejected.

## Feedback guiding this revision

- The first prototype was a useful starting point.
- Daniel disliked its brown/rust palette and serif typography.
- The article table of contents should not be hidden behind an “In this article” disclosure.

## Current experiment

Cool neutral backgrounds, charcoal text, blue links. Daniel likes Source Serif 4 for titles and wants a more compact font for text. Keep all title typography unchanged; use IBM Plex Sans for article prose (18px with 1.6 line height), homepage introduction, interface text and metadata. Paragraph spacing is slightly tighter. Monospace is reserved for code.

Article contents stay visible: sticky right-hand navigation on wide screens; a fully expanded index before the article body on narrower screens. No disclosure control.

Daniel also requested explicit Light, Dark, and System choices. The text-based segmented control felt unattractive; the current revision uses sun, moon, and monitor icons with tooltips, accessible labels, and a subtle selected background. Show only the opposite-appearance icon plus System: sun and monitor in effective dark mode; moon and monitor in effective light mode. This also applies when System is selected. The header control remembers the choice locally; System responds automatically to OS appearance changes.

Daniel requested a more fun introduction, but rejected the oversized interactive “void” experiment as too much. Daniel also rejected the “Screaming into the void.” line itself. After exploring alternatives, he chose “Daniel Silva, with a few notes.” Keep it a normal-sized, monochrome static heading, with “with a few notes.” in subtle italics. No asterisk, forced line break, interaction hint, joke replies, or animation. Article typography and content remain unchanged.

These are design experiments, not final preferences for every project. Homepage copy, public contact details, hosting and launch metadata remain open decisions.

## Implementation decision

Daniel approved migration to Astro. The site now builds static HTML with Astro content collections and shared layouts, without React. This is a stack migration, not another design pass: preserve the current CSS, fonts, icon-based appearance control, visible contents index, social footer and exact approved homepage heading. Keep the article bodies unchanged; frontmatter replaces the separate metadata index. A production domain, RSS and canonical/social launch metadata remain deliberately unconfigured until the domain is agreed.
