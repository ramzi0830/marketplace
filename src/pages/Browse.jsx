import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import ListingCard from "../components/ListingCard.jsx";

const CATEGORY_OPTIONS = ["Clothing", "Vinyl", "CD", "VHS", "Other"];
const SUBCATEGORY_OPTIONS = ["Shirt", "Pants", "Shoes", "Jacket", "Hat", "Other"];
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "Numeric"];

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [brands, setBrands] = useState([]);
  const [brandInput, setBrandInput] = useState("");
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Read filters from URL
  const q = searchParams.get("q") || "";
  const categories = searchParams.getAll("category").map((c) => c);
  const subcategories = searchParams.getAll("subcategory");
  const gender = searchParams.get("gender") || "";
  const brand = searchParams.get("brand") || "";
  const sizes = searchParams.getAll("size");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  const requestedCount = 24 + 24 * pageCount;

  // Helpers to update URL params
  function updateParamsFromState(newParamsObj) {
    const params = new URLSearchParams();
    Object.entries(newParamsObj).forEach(([key, value]) => {
      if (value == null) return;
      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v != null && v !== "") params.append(key, v);
        });
      } else if (value !== "") {
        params.set(key, String(value));
      }
    });
    setSearchParams(params);
  }

  function setArrayParam(key, arr) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    arr.forEach((v) => params.append(key, v));
    // reset pagination when filters change
    params.delete("page");
    setSearchParams(params);
    setPageCount(0);
  }

  function setSingleParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    if (value !== null && value !== "") params.set(key, value);
    setSearchParams(params);
    setPageCount(0);
  }

  // Fetch distinct brands for autocomplete
  useEffect(() => {
    let mounted = true;
    async function loadBrands() {
      const { data, error } = await supabase
        .from("listings")
        .select("brand")
        .not("brand", "is", null);
      if (error) return;
      if (!mounted) return;
      const uniq = Array.from(new Set((data || []).map((r) => r.brand).filter(Boolean)));
      setBrands(uniq.sort((a, b) => a.localeCompare(b)));
    }
    loadBrands();
    return () => (mounted = false);
  }, []);

  // Build and run query
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    async function fetchListings() {
      let query = supabase
        .from("listings")
        .select("*, listing_images(url)")
        .eq("status", "active");

      if (q) query = query.textSearch("search_tsv", q);
      if (categories && categories.length > 0) query = query.in("category", categories);
      if (subcategories && subcategories.length > 0) query = query.in("subcategory", subcategories);
      if (gender) query = query.eq("gender", gender);
      if (brand) query = query.ilike("brand", `%${brand}%`);
      if (sizes && sizes.length > 0) query = query.in("size", sizes);
      if (minPrice) {
        const cents = Math.round(Number(minPrice) * 100);
        if (!Number.isNaN(cents)) query = query.gte("price_cents", cents);
      }
      if (maxPrice) {
        const cents = Math.round(Number(maxPrice) * 100);
        if (!Number.isNaN(cents)) query = query.lte("price_cents", cents);
      }

      query = query.order("created_at", { ascending: false }).range(0, requestedCount - 1);

      const { data, error } = await query;
      if (!mounted) return;
      setLoading(false);
      if (error) {
        console.error(error);
        return;
      }
      const rows = (data || []).map((r) => ({ ...r, image_url: r.listing_images?.[0]?.url }));
      setListings(rows);
      setHasMore((data || []).length >= requestedCount);
    }

    fetchListings();
    return () => (mounted = false);
  }, [searchParams.toString(), pageCount]);

  // Derived UI state
  const resultsCount = listings.length;

  function toggleCategory(cat) {
    const next = new Set(categories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setArrayParam("category", Array.from(next));
  }

  function toggleSubcategory(sub) {
    const next = new Set(subcategories);
    if (next.has(sub)) next.delete(sub);
    else next.add(sub);
    setArrayParam("subcategory", Array.from(next));
  }

  function toggleSize(sz) {
    const next = new Set(sizes);
    if (next.has(sz)) next.delete(sz);
    else next.add(sz);
    setArrayParam("size", Array.from(next));
  }

  function clearAll() {
    setSearchParams(new URLSearchParams());
    setPageCount(0);
  }

  const brandSuggestions = useMemo(() => {
    if (!brandInput) return brands.slice(0, 8);
    return brands.filter((b) => b.toLowerCase().includes(brandInput.toLowerCase())).slice(0, 8);
  }, [brandInput, brands]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Browse</h2>
        <div className="text-sm text-slate-300">{resultsCount} results</div>
      </div>

      <div className="md:flex md:gap-6">
        {/* Sidebar - desktop */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="bg-white/3 p-4 rounded-md border border-red-600/20">
            <h3 className="font-semibold mb-2">Filters</h3>

            <div className="mb-3">
              <div className="text-sm mb-1">Category</div>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((c) => {
                  const on = categories.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggleCategory(c)}
                      className={`px-3 py-1 rounded-full text-sm ${on ? "bg-red-600 text-white" : "bg-gray-700 text-white/90"}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {categories.includes("Clothing") && (
              <div className="mb-3">
                <div className="text-sm mb-1">Gender</div>
                <div className="flex gap-2">
                  {['', 'men', 'women', 'unisex'].map((g) => (
                    <label key={g} className="text-sm">
                      <input
                        type="radio"
                        name="gender"
                        checked={(g === '' && gender === '') || gender === g}
                        onChange={() => setSingleParam('gender', g === '' ? '' : g)}
                        className="mr-2"
                      />
                      {g === '' ? 'Any' : g.charAt(0).toUpperCase() + g.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {categories.includes("Clothing") && (
              <div className="mb-3">
                <div className="text-sm mb-1">Subcategory</div>
                <div className="flex flex-wrap gap-2">
                  {SUBCATEGORY_OPTIONS.map((s) => {
                    const on = subcategories.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSubcategory(s)}
                        className={`px-3 py-1 rounded-full text-sm ${on ? "bg-red-600 text-white" : "bg-gray-700 text-white/90"}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-3">
              <div className="text-sm mb-1">Brand</div>
              <input
                value={brand}
                onChange={(e) => setSingleParam('brand', e.target.value)}
                placeholder="Brand"
                className="w-full p-2 rounded bg-gray-800 text-white text-sm"
              />
              <div className="mt-2">
                {brand && brandSuggestions.length > 0 && (
                  <div className="bg-gray-900 p-2 rounded">
                    {brandSuggestions.map((b) => (
                      <button key={b} onClick={() => setSingleParam('brand', b)} className="block text-left w-full text-sm p-1 hover:bg-gray-700 rounded">
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-3">
              <div className="text-sm mb-1">Size</div>
              <div className="flex flex-wrap gap-2">
                {SIZE_OPTIONS.map((s) => {
                  const on = sizes.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSize(s)}
                      className={`px-3 py-1 rounded-full text-sm ${on ? "bg-red-600 text-white" : "bg-gray-700 text-white/90"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-3">
              <div className="text-sm mb-1">Price</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minPrice || ""}
                  onChange={(e) => setSingleParam('minPrice', e.target.value)}
                  placeholder="Min $"
                  className="w-1/2 p-2 rounded bg-gray-800 text-white text-sm"
                />
                <input
                  type="number"
                  value={maxPrice || ""}
                  onChange={(e) => setSingleParam('maxPrice', e.target.value)}
                  placeholder="Max $"
                  className="w-1/2 p-2 rounded bg-gray-800 text-white text-sm"
                />
              </div>
            </div>

            <div className="mt-4">
              <button onClick={clearAll} className="px-4 py-2 bg-gray-700 rounded text-sm">
                Clear all
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Filters button */}
        <div className="md:hidden mb-4">
          <button onClick={() => setShowFiltersMobile(true)} className="px-4 py-2 bg-gray-800 rounded">
            Filters
          </button>
        </div>

        {/* Filters slide-in for mobile */}
        {showFiltersMobile && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowFiltersMobile(false)} />
            <div className="absolute right-0 top-0 h-full w-80 bg-[#0a0a0a] p-4 overflow-auto">
              <button className="mb-4" onClick={() => setShowFiltersMobile(false)}>Close</button>
              <div className="space-y-4">
                <div>
                  <div className="text-sm mb-1">Category</div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((c) => {
                      const on = categories.includes(c);
                      return (
                        <button
                          key={c}
                          onClick={() => toggleCategory(c)}
                          className={`px-3 py-1 rounded-full text-sm ${on ? "bg-red-600 text-white" : "bg-gray-700 text-white/90"}`}>
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {categories.includes("Clothing") && (
                  <div>
                    <div className="text-sm mb-1">Gender</div>
                    <div className="flex gap-2">
                      {['', 'men', 'women', 'unisex'].map((g) => (
                        <label key={g} className="text-sm">
                          <input
                            type="radio"
                            name="gender_mobile"
                            checked={(g === '' && gender === '') || gender === g}
                            onChange={() => setSingleParam('gender', g === '' ? '' : g)}
                            className="mr-2"
                          />
                          {g === '' ? 'Any' : g.charAt(0).toUpperCase() + g.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {categories.includes("Clothing") && (
                  <div>
                    <div className="text-sm mb-1">Subcategory</div>
                    <div className="flex flex-wrap gap-2">
                      {SUBCATEGORY_OPTIONS.map((s) => {
                        const on = subcategories.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() => toggleSubcategory(s)}
                            className={`px-3 py-1 rounded-full text-sm ${on ? "bg-red-600 text-white" : "bg-gray-700 text-white/90"}`}>
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm mb-1">Brand</div>
                  <input value={brand} onChange={(e) => setSingleParam('brand', e.target.value)} placeholder="Brand" className="w-full p-2 rounded bg-gray-800 text-white text-sm" />
                </div>
                <div>
                  <div className="text-sm mb-1">Size</div>
                  <div className="flex flex-wrap gap-2">
                    {SIZE_OPTIONS.map((s) => {
                      const on = sizes.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() => toggleSize(s)}
                          className={`px-3 py-1 rounded-full text-sm ${on ? "bg-red-600 text-white" : "bg-gray-700 text-white/90"}`}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm mb-1">Price</div>
                  <div className="flex gap-2">
                    <input type="number" value={minPrice || ""} onChange={(e) => setSingleParam('minPrice', e.target.value)} placeholder="Min $" className="w-1/2 p-2 rounded bg-gray-800 text-white text-sm" />
                    <input type="number" value={maxPrice || ""} onChange={(e) => setSingleParam('maxPrice', e.target.value)} placeholder="Max $" className="w-1/2 p-2 rounded bg-gray-800 text-white text-sm" />
                  </div>
                </div>
                <div>
                  <button onClick={clearAll} className="px-4 py-2 bg-gray-700 rounded text-sm">Clear all</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1">
          {loading ? (
            <div className="py-12 text-center">Loading...</div>
          ) : resultsCount === 0 ? (
            <div className="py-12 text-center text-slate-300">No results</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}

          {!loading && resultsCount > 0 && hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setPageCount((p) => p + 1)}
                className="px-6 py-2 bg-red-600 rounded text-white"
              >
                Load more
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
