import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { getImageEmbedding } from "../lib/embeddings.js";
import ListingCard from "../components/ListingCard.jsx";

const CATEGORY_OPTIONS = ["Clothing", "Vinyl", "CD", "Jewelry", "Other"];
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "Numeric"];
const GENDER_OPTIONS = ["", "men", "women", "unisex"];

export default function ImageSearch() {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [matches, setMatches] = useState([]);
  const [searchAttempted, setSearchAttempted] = useState(false);

  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [minPriceFilter, setMinPriceFilter] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState("");
  const [brandInput, setBrandInput] = useState("");

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(selectedImage);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  function selectFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
    setError("");
    setSelectedImage(file);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    selectFile(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    selectFile(file);
  }

  async function handleSearch() {
    if (!selectedImage) return;

    setError("");
    setLoading(true);
    setSearchAttempted(true);
    setStage("Generating fingerprint...");
    setMatches([]);

    try {
      const embedding = await getImageEmbedding(selectedImage);
      if (!embedding) {
        setError("Could not analyze image, please try another");
        return;
      }

      setStage("Finding matches...");
      const { data: rpcData, error: rpcError } = await supabase.rpc("match_listings", {
        query_embedding: embedding,
        match_count: 30,
      });

      if (rpcError) {
        console.error(rpcError);
        setError("Unable to find matches right now, please try again.");
        return;
      }

      if (!rpcData || rpcData.length === 0) {
        setMatches([]);
        return;
      }

      const ids = rpcData.map((item) => item.id).filter(Boolean);
      const similarityMap = new Map(rpcData.map((item) => [item.id, item.similarity]));

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("*, listing_images(*)")
        .in("id", ids);

      if (listingError) {
        console.error(listingError);
        setError("Unable to load listing details.");
        return;
      }

      const listingMap = new Map(
        (listingData || []).map((listing) => [listing.id, {
          ...listing,
          image_url: listing.listing_images?.[0]?.url,
        }])
      );

      const orderedMatches = ids
        .filter((id) => listingMap.has(id))
        .map((id) => ({
          similarity: similarityMap.get(id),
          listing: listingMap.get(id),
        }));

      setMatches(orderedMatches);
    } finally {
      setLoading(false);
      setStage("");
    }
  }

  const availableBrands = useMemo(() => {
    return Array.from(new Set(matches.map((item) => item.listing.brand).filter(Boolean))).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter(({ listing }) => {
      if (brandFilter && listing.brand?.toLowerCase() !== brandFilter.toLowerCase()) {
        return false;
      }
      if (categoryFilter && listing.category !== categoryFilter) {
        return false;
      }
      if (sizeFilter && listing.size !== sizeFilter) {
        return false;
      }
      if (genderFilter && listing.gender !== genderFilter) {
        return false;
      }
      if (minPriceFilter) {
        const minCents = Math.round(Number(minPriceFilter) * 100);
        if (!Number.isNaN(minCents) && listing.price_cents < minCents) {
          return false;
        }
      }
      if (maxPriceFilter) {
        const maxCents = Math.round(Number(maxPriceFilter) * 100);
        if (!Number.isNaN(maxCents) && listing.price_cents > maxCents) {
          return false;
        }
      }
      return true;
    });
  }, [matches, brandFilter, categoryFilter, sizeFilter, genderFilter, minPriceFilter, maxPriceFilter]);

  const foundResults = filteredMatches.filter((item) => item.similarity > 0.75);
  const similarResults = filteredMatches.filter((item) => item.similarity >= 0.55 && item.similarity <= 0.75);

  const hasNoResults = searchAttempted && !loading && filteredMatches.length === 0;

  function clearFilters() {
    setBrandFilter("");
    setBrandInput("");
    setCategoryFilter("");
    setSizeFilter("");
    setGenderFilter("");
    setMinPriceFilter("");
    setMaxPriceFilter("");
  }

  const filterPanel = (
    <div className="bg-white/5 border border-red-600/20 rounded-3xl p-4 text-sm text-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        <button onClick={clearFilters} className="text-red-400 hover:text-red-300 text-sm">
          Clear
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-2 font-medium">Category</div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((category) => {
              const active = categoryFilter === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(active ? "" : category)}
                  className={`px-3 py-1 rounded-full text-sm ${active ? "bg-red-600 text-white" : "bg-gray-800 text-slate-200"}`}>
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 font-medium">Gender</div>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map((gender) => {
              const label = gender === "" ? "Any" : gender.charAt(0).toUpperCase() + gender.slice(1);
              const active = genderFilter === gender;
              return (
                <button
                  key={gender}
                  type="button"
                  onClick={() => setGenderFilter(active ? "" : gender)}
                  className={`px-3 py-1 rounded-full text-sm ${active ? "bg-red-600 text-white" : "bg-gray-800 text-slate-200"}`}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 font-medium">Brand</div>
          <input
            value={brandInput}
            onChange={(event) => {
              setBrandInput(event.target.value);
              setBrandFilter(event.target.value);
            }}
            placeholder="Filter by brand"
            className="w-full rounded-xl border border-red-600/20 bg-[#111] px-3 py-2 text-white placeholder:text-slate-500"
          />
          {brandInput && availableBrands.length > 0 && (
            <div className="mt-2 space-y-1 rounded-xl border border-red-600/20 bg-[#111] p-2">
              {availableBrands.map((brand) => (
                <button
                  type="button"
                  key={brand}
                  onClick={() => {
                    setBrandFilter(brand);
                    setBrandInput(brand);
                  }}
                  className="block w-full text-left rounded px-2 py-1 hover:bg-gray-800"
                >
                  {brand}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 font-medium">Size</div>
          <div className="flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((size) => {
              const active = sizeFilter === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSizeFilter(active ? "" : size)}
                  className={`px-3 py-1 rounded-full text-sm ${active ? "bg-red-600 text-white" : "bg-gray-800 text-slate-200"}`}>
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 font-medium">Price range</div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="0"
              step="1"
              value={minPriceFilter}
              onChange={(event) => setMinPriceFilter(event.target.value)}
              placeholder="Min"
              className="w-full rounded-xl border border-red-600/20 bg-[#111] px-3 py-2 text-white"
            />
            <input
              type="number"
              min="0"
              step="1"
              value={maxPriceFilter}
              onChange={(event) => setMaxPriceFilter(event.target.value)}
              placeholder="Max"
              className="w-full rounded-xl border border-red-600/20 bg-[#111] px-3 py-2 text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex-1">
          <div className="mb-8 space-y-3">
            <h1 className="text-4xl font-semibold">Find by photo</h1>
            <p className="max-w-2xl text-slate-400">Upload an image to search listings by visual similarity and refine the results with filters.</p>
          </div>

          <div className="rounded-3xl border border-red-600/20 bg-white/5 p-6 shadow-[0_0_60px_rgba(225,16,0,0.12)]">
            <div
              className={`relative rounded-3xl border-2 border-dashed transition ${dragActive ? "border-red-500 bg-red-500/10" : "border-red-600/30 bg-white/5"}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-3xl p-10 text-center text-slate-300">
                <div className="text-5xl">📷</div>
                <div>
                  <p className="text-lg font-semibold text-white">Drag and drop an image</p>
                  <p className="text-sm text-slate-400">or click to select a file</p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="rounded-full border border-red-600/70 bg-red-600/10 px-5 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-600/20"
                >
                  Take a photo
                </button>
              </div>
            </div>

            {previewUrl && (
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl bg-[#111] p-4">
                  <img
                    src={previewUrl}
                    alt="Selected preview"
                    className="mx-auto h-[300px] max-h-[300px] w-auto rounded-3xl object-contain"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-400">Image ready for search. Tap Search to find visually similar listings.</p>
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={!selectedImage || loading}
                    className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-600/40"
                  >
                    Search
                  </button>
                </div>
              </div>
            )}

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            {loading && (
              <p className="mt-4 text-sm text-slate-300">{stage}</p>
            )}
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-semibold">Results</h2>
                <p className="text-sm text-slate-400">Filter the current results without re-querying the database.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFiltersMobile((current) => !current)}
                className="md:hidden rounded-full border border-red-600/30 bg-red-600/10 px-4 py-2 text-sm text-red-200"
              >
                {showFiltersMobile ? "Hide filters" : "Show filters"}
              </button>
            </div>

            <div className={`${showFiltersMobile ? "block" : "hidden"} md:hidden mb-6`}>{filterPanel}</div>

            {hasNoResults && (
              <div className="rounded-3xl border border-red-600/20 bg-white/5 p-8 text-center text-slate-300">
                No similar items found yet
              </div>
            )}

            {foundResults.length > 0 && (
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">Found results</h3>
                    <p className="text-sm text-slate-400">Visually very similar items.</p>
                  </div>
                  <div className="text-sm text-slate-400">{foundResults.length} item(s)</div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {foundResults.map((item) => (
                    <ListingCard key={`${item.listing.id}-${item.similarity}`} listing={item.listing} />
                  ))}
                </div>
              </section>
            )}

            {similarResults.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">Similar items</h3>
                    <p className="text-sm text-slate-400">Related listings with lower similarity scores.</p>
                  </div>
                  <div className="text-sm text-slate-400">{similarResults.length} item(s)</div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {similarResults.map((item) => (
                    <ListingCard key={`${item.listing.id}-${item.similarity}`} listing={item.listing} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        <aside className="hidden w-80 shrink-0 lg:block">{filterPanel}</aside>
      </div>
    </div>
  );
}
