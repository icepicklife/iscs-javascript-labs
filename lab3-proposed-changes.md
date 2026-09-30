# Lab 3 — Proposed Code Changes (Features 1, 2, 4 → A tier)

> [!IMPORTANT]
> To reach **A tier** you need **3 of 4** items done. The plan below implements **items 1, 2, and 4**.
> All changes are inside `index.html`.

---

## Feature 1 — Persist the last search with `localStorage`

When the page loads, read the last keyword from `localStorage` and auto-trigger a search with it. Save the keyword each time a real search runs.

### 1a. Save the keyword on every search — after **line 213**

Current line 213:
```js
            const keyword = searchInput.value.trim();
```

Insert these lines **after** line 213 (before line 214):
```js
            // Feature 1 — save keyword before searching
            if (keyword !== '') {
                localStorage.setItem('lastSearch', keyword);
            }
```

### 1b. Restore the keyword and run the search on page load — after **line 496**

Current line 496 is the closing `}` of `clearOutput()`. Insert this block after it (before line 497 which is blank, then line 498 `</script>`):

```js
        // Feature 1 — restore last search on page load
        (function restoreLastSearch() {
            const saved = localStorage.getItem('lastSearch');
            if (saved) {
                searchInput.value = saved;
                runSearch();
            }
        })();
```

---

## Feature 2 — Play an MP3 for 5 seconds when a search is triggered

Place your MP3 file (e.g. `music.mp3`) in the **same folder** as `index.html`.

### 2a. Add a module-level Audio object — after **line 150**

Current line 150:
```js
        const MAX_RELATED = 3;
```

Insert these lines **after** line 150 (before line 151 which is blank):
```js
        // Feature 2 — audio player for search music
        const searchAudio = new Audio("music.mp3");  // replace with your actual filename
        searchAudio.volume = 0.7;                    // optional: adjust volume (0.0 – 1.0)
```

### 2b. Add the helper function — after **line 489**

Current line 489 is the closing `}` of `setStatus()`. Insert the new function after it (before line 490 which is blank, then line 491 `function clearOutput()`):

```js
        // Feature 2 — play the MP3 for exactly 5 seconds
        function playSearchTone() {
            searchAudio.pause();            // stop any previous playback
            searchAudio.currentTime = 0;    // rewind to the beginning
            searchAudio.play();

            setTimeout(function () {
                searchAudio.pause();
                searchAudio.currentTime = 0;
            }, 5000);                       // stop after 5 000 ms = 5 seconds
        }
```

### 2c. Call the function inside `runSearch()` — after **line 216**

Current line 216:
```js
            clearOutput();
```

Insert this line **after** line 216 (before line 217 which is blank):
```js
            // Feature 2 — play music on every search trigger
            playSearchTone();
```

> [!NOTE]
> Browsers require a user gesture before audio can play. Because `runSearch` is always triggered by a button click or Enter key, this is already satisfied — no extra workaround needed.

> [!IMPORTANT]
> The MP3 file **must be in the same folder** as `index.html`, or update the path in `new Audio("music.mp3")` to match where you put it (e.g. `"audio/music.mp3"`).

---

## Feature 4 — "Copy Details" button

Add a **Copy Details** button next to **Show Details**. When clicked, it builds the same text the `showDetails` panel would show and writes it to the clipboard via the [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API).

### 4a. Add the button in `renderProducts()` — after **line 288**

Current line 288:
```js
                actions.appendChild(actionButton("Show Details", "details"));
```

Insert this line **after** line 288 (before line 289 `section.appendChild(actions)`):
```js
                actions.appendChild(actionButton("Copy Details", "copy"));   // Feature 4
```

### 4b. Handle the `"copy"` action in `onResultsClick()` — replace **lines 201–207**

Current lines 201–207:
```js
            if (button.dataset.action === "reviews") {
                showReviews(section, product);
            } else {
                showDetails(section, product);
            }

            button.disabled = true;
```

Replace them with:
```js
            if (button.dataset.action === "reviews") {
                showReviews(section, product);
                button.disabled = true;
            } else if (button.dataset.action === "details") {
                showDetails(section, product);
                button.disabled = true;
            } else if (button.dataset.action === "copy") {
                copyDetails(product, button);   // Feature 4 — do NOT disable the copy button
            }
```

> [!NOTE]
> The Copy Details button is intentionally **not disabled** after clicking so the user can copy again if needed. Only Show Details/Reviews are one-shot disables.

### 4c. Add the `copyDetails()` helper function — after **line 496**

Current line 496 is the closing `}` of `clearOutput()`. Insert the new function after it (alongside the 1b block; place this either before or after the `restoreLastSearch` IIFE):

```js
        // Feature 4 — copy product details to the system clipboard
        function copyDetails(product, button) {
            const lines = DETAIL_FIELDS.map(function (entry) {
                const label = entry[0];
                const value = product[entry[1]];
                return label + ": " + (hasValue(value) ? value : "No details available");
            });

            const text = [product.title].concat(lines).join("\n");

            navigator.clipboard.writeText(text).then(function () {
                const original = button.textContent;
                button.textContent = "Copied!";
                setTimeout(function () {
                    button.textContent = original;
                }, 1500);
            }).catch(function (err) {
                console.error("Clipboard write failed:", err);
                alert("Could not copy to clipboard. Please try again.");
            });
        }
```

---

## Summary of all insertion points

| Feature | Edit type | Target line(s) in `index.html` |
|---------|-----------|-------------------------------|
| 1a — save keyword | Insert after | Line **213** (`const keyword = ...`) |
| 1b — restore on load IIFE | Insert after | Line **496** (closing `}` of `clearOutput`) |
| 2a — `searchAudio` constant | Insert after | Line **150** (`const MAX_RELATED = 3`) |
| 2b — `playSearchTone()` function | Insert after | Line **489** (closing `}` of `setStatus`) |
| 2c — call `playSearchTone()` | Insert after | Line **216** (`clearOutput()`) |
| 4a — Copy Details button | Insert after | Line **288** (`actionButton("Show Details", ...)`) |
| 4b — handle copy action | Replace | Lines **201–207** (the if/else + `button.disabled`) |
| 4c — `copyDetails()` function | Insert after | Line **496** (closing `}` of `clearOutput`) |
