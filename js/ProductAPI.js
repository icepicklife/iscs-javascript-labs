export class ProductAPI {

    static BASE_LINK = "https://dummyjson.com";
    static #brandIndexCache = null;

    static async fetchJson(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Request failed (" + response.status + "): " + url);
        }
        return response.json();
    }

    static async searchProducts(keyword) {
        const data = await ProductAPI.fetchJson(
            ProductAPI.BASE_LINK + "/products/search?q=" + encodeURIComponent(keyword)
        );
        return data.products || [];
    }

    static async getCategoryProducts(category) {
        const data = await ProductAPI.fetchJson(
            ProductAPI.BASE_LINK + "/products/category/" +
            encodeURIComponent(category) + "?limit=0&select=title"
        );
        return data.products || [];
    }

    static async loadBrandIndex() {
        if (!ProductAPI.#brandIndexCache) {
            const data = await ProductAPI.fetchJson(
                ProductAPI.BASE_LINK + "/products?limit=0&select=title,brand"
            );
            ProductAPI.#brandIndexCache = data.products || [];
        }
        return ProductAPI.#brandIndexCache;
    }
}