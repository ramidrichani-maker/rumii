# AGENTS.md

- Card grids wrap each card in `CurtainReveal` (not `ScrollReveal`) so a loading card sits under a grey panel that slides down and off. Why: the curtain is the site's card-loading language, and its left-to-right stagger is measured from real column position.
- The curtain's `clip-path` lives on an absolutely positioned overlay panel inside the reveal wrapper, never `overflow: hidden` on the card itself. Why: clipping the card would also clip its hover scale and any child overlay.
- Loading skeletons are a single flat grey block sized to the real card. Why: matching height keeps the page from jumping when data arrives.
- The page-loading mark measures the first half of the visible navbar wordmark before flying into it, then reveals the remaining letters. Why: the artwork starts with the same mark, so the handoff stays aligned across mobile and desktop layouts without a duplicate symbol.
- The navbar controls and page shell stay concealed until the loading mark lands and the navbar wordmark finishes; controls reveal first, then the page fades in. Why: the brand handoff must complete before anything else appears, with the navbar leading the page.
