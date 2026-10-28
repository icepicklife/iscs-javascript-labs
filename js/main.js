import { ProductAPI } from "./ProductAPI.js";
import { AudioPlayer } from "./AudioPlayer.js";
import { StorageService } from "./StorageService.js";
import { ClipboardService } from "./ClipboardService.js";

const MAX_RELATED = 3;

const searchAudio = new AudioPlayer("iphone_original.mp3", 0.7);

const DETAIL_FIELDS = [

    ["Brand", "brand"],
    ["Stock", "stock"],
    ["Warranty", "warrantyInformation"],
    ["Shipping", "shippingInformation"]

];

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const status_element = document.getElementById("status");
const results_element = document.getElementById("results");
const related_element = document.getElementById("related");

let matchedProducts = []; // storage array for products found
let latest_searchId = 0;  // guard for out-of-order search responses

// click to search
searchButton.addEventListener("click", runSearch);

// press enter to search
searchInput.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {
        runSearch();
    }
});


results_element.addEventListener("click", onResultsClick);

// event handlers for the specific buttons after results
function onResultsClick(event) {

    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const section = button.closest("section[data-product-id]");
    if (!section) return;

    const product = matchedProducts.find(function (item) {
        return String(item.id) === section.dataset.productId;
    });

    if (!product) return;

    if (button.dataset.action === "reviews") {
        showReviews(section, product);
        button.disabled = true;
    } else if (button.dataset.action === "details") {
        showDetails(section, product);
        button.disabled = true;
    } else if (button.dataset.action === "copy") {
        copyDetails(product, button);
    }

}

// overall logical flow when running a search
async function runSearch() {
    const keyword = searchInput.value.trim();

    if (keyword !== '') {
        StorageService.set('lastSearch', keyword);
    }
    const searchId = ++latest_searchId;

    clearOutput();
    searchAudio.play(5000);

    if (keyword === '') {
        setStatus("Enter a product keyword to search.");
        return;
    }

    setStatus("Searching...");
    searchButton.disabled = true;

    try {
        const products = await ProductAPI.searchProducts(keyword);

        if (searchId !== latest_searchId) return;

        if (products.length === 0) {
            setStatus("Product does not exist.");
            return;
        }

        const relatedSections = await buildRelatedSections(products);
        if (searchId !== latest_searchId) return;

        matchedProducts = products;
        setStatus("");
        renderProducts(products);
        renderRelated(relatedSections);
    } catch (error) {
        if (searchId !== latest_searchId) return;
        console.error(error);
        setStatus("Could not reach the product API. Check your connection and search again.");
    } finally {
        if (searchId === latest_searchId) {
            searchButton.disabled = false;
        }
    }
}

// for building the products being searched
function renderProducts(products) {

    products.forEach(function (product) {
        const section = document.createElement("section");
        section.className = "product";
        section.dataset.productId = String(product.id);

        const title = document.createElement("h2");
        title.textContent = product.title;
        section.appendChild(title);

        section.appendChild(field("Category", product.category));
        section.appendChild(field("Price", "$" + product.price));
        section.appendChild(field("Description", product.description));

        const actions = document.createElement("div");
        actions.className = "actions";
        actions.appendChild(actionButton("Show Reviews", "reviews"));
        actions.appendChild(actionButton("Show Details", "details"));
        actions.appendChild(actionButton("Copy Details", "copy"));
        section.appendChild(actions);

        section.appendChild(panel("reviews"));
        section.appendChild(panel("details"));

        results_element.appendChild(section);
    });
}

function actionButton(label, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.action = action;
    return button;
}

function panel(name) {
    const div = document.createElement("div");
    div.className = "panel";
    div.dataset.panel = name;
    return div;
}

function showReviews(section, product) {
    const box = section.querySelector('[data-panel="reviews"]');
    box.textContent = "";
    box.appendChild(heading("Reviews:"));

    const reviews = Array.isArray(product.reviews) ? product.reviews : [];

    if (reviews.length === 0) {
        box.appendChild(line("No reviews available."));
        return;
    }

    reviews.forEach(function (review) {
        box.appendChild(
            line(review.reviewerName + " (" + review.rating + "\u2605): " + review.comment)
        );
    });
}

function showDetails(section, product) {
    const box = section.querySelector('[data-panel="details"]');
    box.textContent = '';
    box.appendChild(heading("Details:"));

    DETAIL_FIELDS.forEach(function (entry) {
        const label = entry[0];
        const value = product[entry[1]];

        box.appendChild(
            line(label + ": " + (hasValue(value) ? value : "No details available"))
        );
    });
}

function hasValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
}

// for building the related sections
async function buildRelatedSections(products) {
    const shownIds = new Set(products.map(function (p) { return p.id; }));
    const categories = distinct(products.map(function (p) { return p.category; }));
    const brands = distinct(products.map(function (p) { return p.brand; }));

    const categoryRequests = categories.map(async function (category) {
        const categoryProducts = await ProductAPI.getCategoryProducts(category);
        return {
            kind: "category",
            label: category,
            titles: pickTitles(categoryProducts, shownIds)
        };
    });

    const brandRequest = brands.length === 0
        ? Promise.resolve([])
        : ProductAPI.loadBrandIndex().then(function (index) {
            return brands.map(function (brand) {
                const sameBrand = index.filter(function (item) {
                    return item.brand === brand;
                });
                return {
                    kind: "brand",
                    label: brand,
                    titles: pickTitles(sameBrand, shownIds)
                };
            });
        });

    const results = await Promise.all([
        Promise.all(categoryRequests),
        brandRequest
    ]);

    return results[0].concat(results[1]);
}

function distinct(values) {
    const cleaned = values.filter(function (value) {
        return typeof value === "string" && value.trim() !== "";
    });
    return Array.from(new Set(cleaned));
}

function pickTitles(products, shownIds) {
    return products
        .filter(function (p) { return !shownIds.has(p.id); })
        .slice(0, MAX_RELATED)
        .map(function (p) { return p.title; });
}

function renderRelated(sections) {
    const groups = [
        { kind: "category", heading: "More in this Category", prefix: "More in " },
        { kind: "brand", heading: "More from this Brand", prefix: "More from " }
    ];

    groups.forEach(function (group) {
        const items = sections.filter(function (s) { return s.kind === group.kind; });

        const wrapper = document.createElement("section");
        wrapper.className = "related-group";

        const groupHeading = document.createElement("h2");
        groupHeading.textContent = group.heading;
        wrapper.appendChild(groupHeading);

        if (items.length === 0) {
            wrapper.appendChild(line("No related products available."));
        } else {
            items.forEach(function (item) {
                const block = document.createElement("div");
                block.className = "related-block";

                const blockHeading = document.createElement("h3");
                blockHeading.textContent = group.prefix + item.label;
                block.appendChild(blockHeading);

                if (item.titles.length === 0) {
                    block.appendChild(line("No related products available."));
                } else {
                    item.titles.forEach(function (title) {
                        block.appendChild(line(title));
                    });
                }

                wrapper.appendChild(block);
            });
        }

        related_element.appendChild(wrapper);
    });
}

// helper functions in creating the lines, headings, and fields
function field(label, value) {
    const p = document.createElement("p");
    p.className = "field";

    const label_element = document.createElement("span");
    label_element.className = "label";
    label_element.textContent = label + ": ";

    p.appendChild(label_element);
    p.appendChild(document.createTextNode(String(value)));
    return p;
}

function heading(text) {
    const p = document.createElement("p");
    p.className = "panel-heading";
    p.textContent = text;
    return p;
}

function line(text) {
    const p = document.createElement("p");
    p.className = "line";
    p.textContent = text;
    return p;
}

function copyDetails(product, button) {
    const lines = DETAIL_FIELDS.map(function (entry) {
        const label = entry[0];
        const value = product[entry[1]];
        return label + ": " + (hasValue(value) ? value : "No details available");
    });

    const text = [product.title].concat(lines).join("\n");

    ClipboardService.copy(text).then(function () {
        const original = button.textContent;
        button.textContent = "Content Copied!";
        setTimeout(function () {
            button.textContent = original;
        }, 1500);
    }).catch(function (err) {
        console.error("Clipboard write failed:", err);
        alert("Could not copy to clipboard. Please try again.");
    });
}

function setStatus(text) {
    status_element.textContent = text;
}

function clearOutput() {
    related_element.textContent = "";
    results_element.textContent = "";
    status_element.textContent = "";
    matchedProducts = [];
}

(function restoreLastSearch() {
    const saved = StorageService.get('lastSearch');
    if (saved) {
        searchInput.value = saved;
        runSearch();
    }
})();
