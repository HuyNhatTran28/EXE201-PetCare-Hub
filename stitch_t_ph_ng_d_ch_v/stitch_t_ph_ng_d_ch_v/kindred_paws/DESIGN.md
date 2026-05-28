```markdown
# Design System Document: The Pet Sanctuary

## 1. Overview & Creative North Star
**Creative North Star: "The Tactile Sanctuary"**

This design system moves away from the sterile, grid-locked nature of traditional "booking" platforms. Instead, it embraces an editorial, lifestyle-first approach that feels like a high-end boutique hotel for pets. We achieve this through **Organic Asymmetry** and **Tonal Depth**. By breaking the rigid 12-column expectations and using overlapping "floating" elements, we create a sense of playfulness and comfort. The goal is to make the user feel the warmth of a sun-drenched living room through their screen.

- **Intentional Asymmetry:** Hero images should bleed off-edge or overlap with floating cards.
- **Organic Fluidity:** High-quality pet imagery should be housed in soft, organic shapes (blobs) or high-rounded containers (`xl` / `3rem`).
- **Signature Editorial Touch:** Large, airy typography headers paired with significant whitespace to convey "premium care."

---

## 2. Colors: Tonal Harmony
The palette is rooted in nature and warmth, moving away from high-contrast blacks to a sophisticated "Off-Black" (`#303330`) and soft, earthy foundations.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders to define sections.
- **Transitioning:** Use background color shifts. A section using `surface-container-low` should sit directly against a `surface` background to define its boundary.
- **Glass & Gradient Rule:** For prominent CTAs and the primary Chatbot interface, use a linear gradient from `primary` (#a43e24) to `primary_container` (#ffac98) at a 135-degree angle. This adds a "glow" that flat colors lack.
- **Signature Textures:** Floating elements (like price badges or "Quick Book" buttons) should use **Glassmorphism**: `surface` color at 70% opacity with a `20px` backdrop-blur.

---

## 3. Typography: Approachable Authority
We use a duo of **Plus Jakarta Sans** for characterful headlines and **Be Vietnam Pro** for highly legible, modern body copy.

*   **Display (Plus Jakarta Sans):** Used for "Brand Moments." The `display-lg` (3.5rem) should be used sparingly for emotive headlines.
*   **Headline (Plus Jakarta Sans):** Use `headline-md` (1.75rem) for service titles. Its rounded terminals mirror the `xl` corner radius of our UI components.
*   **Body (Be Vietnam Pro):** `body-lg` (1rem) is the workhorse. Ensure a line-height of 1.6 to maintain the "Airy" feel of the Sanctuary.
*   **Labels (Be Vietnam Pro):** `label-md` (0.75rem) in `secondary` (#44683b) color is used for pet categories (e.g., "Cats Only," "Deluxe Suite").

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "tech." We use the physical layering of paper and light.

*   **The Layering Principle:** 
    1.  **Base:** `background` (#faf9f6)
    2.  **Sectioning:** `surface-container-low` (#f4f4f0)
    3.  **Floating Cards:** `surface-container-lowest` (#ffffff)
*   **Ambient Shadows:** For the Chatbot and Booking Modals, use a "Sunlight Shadow": `on-surface` color at 6% opacity, Blur: 40px, Y-Offset: 20px. It should look like a soft glow, not a dark edge.
*   **The Ghost Border:** If high-contrast accessibility is required, use `outline-variant` (#b1b2af) at 15% opacity. Never use 100% opacity for lines.

---

## 5. Components

### Cards (Rooms & Services)
*   **Style:** No borders. `xl` (3rem) corner radius. 
*   **Layout:** Image on top with a subtle `primary_container` overlay on hover. 
*   **Separation:** Use `Spacing 6` (2rem) between cards. Do not use dividers. Title uses `title-lg`, Price uses `title-md` in `primary`.

### Buttons (The "Pebble" State)
*   **Primary:** Background `primary` (#a43e24), text `on_primary` (#fff7f6). Radius: `full`.
*   **Secondary:** Background `secondary_container` (#d0fac0), text `on_secondary_container` (#3e6135).
*   **States:** On hover, primary buttons should shift to `primary_dim` and scale 102%.

### Input Fields (Booking & Search)
*   **Base:** `surface_container_high` (#e8e8e4). 
*   **Shape:** `md` (1.5rem) corner radius.
*   **Interaction:** Focus state shifts background to `surface_container_lowest` (#ffffff) with a 2px `secondary` ghost-border (20% opacity).

### The "Nurture" Chatbot
*   **Visuals:** A floating circle (`full` radius) in the bottom right. Use the `primary` gradient. 
*   **Typography:** Inside the chat, use `body-sm` for the "Bot" and `surface_container` for the speech bubbles to create a soft, non-intimidating dialog.

---

## 6. Do's and Don'ts

### Do:
*   **Overlap Elements:** Let a pet’s paw or an organic shape bleed from one `surface-container` into another. It creates "life."
*   **Use the Spacing Scale:** Stick strictly to the scale (e.g., `Spacing 10` for section margins) to maintain a rhythmic "breathable" layout.
*   **High-End Imagery:** Only use photos with natural lighting. Avoid "studio" shots with harsh white backgrounds.

### Don't:
*   **Don't use 1px Dividers:** Use `Spacing 8` (2.75rem) of white space or a background color shift instead.
*   **Don't use Sharp Corners:** Nothing in this system should have a radius smaller than `sm` (0.5rem). The pet hotel is a soft environment; the UI must reflect that.
*   **Don't Overuse Primary Red:** The `primary` (#a43e24) is an "Earth Red/Orange." Use it for focus points only. For general warmth, lean on `secondary` (green) and `tertiary` (beige).