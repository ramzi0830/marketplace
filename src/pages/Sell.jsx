import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getImageEmbedding } from "../lib/embeddings";
import { useAuth } from "../context/AuthContext.jsx";

const categories = ["Clothing", "Vinyl", "CD", "VHS", "Other"];
const clothingGenders = ["men", "women", "unisex"];
const clothingSubcategories = ["shirt", "pants", "shoes", "jacket", "hat", "other"];
const clothingConditions = [
  "New with tags",
  "New without tags",
  "Used - Excellent",
  "Used - Good",
  "Used - Fair",
];
const mediaConditions = ["Mint", "Near Mint", "VG+", "VG", "G"];

const measurementFields = {
  shirt: [
    { key: "pitToPit", label: "Pit-to-pit (in)" },
    { key: "length", label: "Length (in)" },
    { key: "sleeve", label: "Sleeve (in)" },
  ],
  pants: [
    { key: "waist", label: "Waist (in)" },
    { key: "inseam", label: "Inseam (in)" },
    { key: "rise", label: "Rise (in)" },
  ],
  shoes: [
    { key: "usSize", label: "US size" },
    { key: "lengthCm", label: "Length (cm)" },
  ],
  jacket: [
    { key: "pitToPit", label: "Pit-to-pit (in)" },
    { key: "length", label: "Length (in)" },
    { key: "sleeve", label: "Sleeve (in)" },
  ],
};

export default function Sell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [category, setCategory] = useState("Clothing");
  const [gender, setGender] = useState("men");
  const [subcategory, setSubcategory] = useState("shirt");
  const [size, setSize] = useState("");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("New with tags");
  const [measurements, setMeasurements] = useState({});
  const [artistTitle, setArtistTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [genre, setGenre] = useState("");
  const [editionNotes, setEditionNotes] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [embeddingStatus, setEmbeddingStatus] = useState("");

  const measurementsForSubcategory = useMemo(() => {
    if (category !== "Clothing") return [];
    return measurementFields[subcategory] || [];
  }, [category, subcategory]);

  const canSubmit = title.trim().length > 0 && Number(price) > 0 && photos.length >= 1;

  function handleCategoryChange(value) {
    setCategory(value);
    setCondition(value === "Clothing" ? "New with tags" : "Mint");
    setMeasurements({});
    setArtistTitle("");
    setReleaseYear("");
    setGenre("");
    setEditionNotes("");

    if (value === "Clothing") {
      setGender("men");
      setSubcategory("shirt");
    }
  }

  function handleFiles(fileList) {
    const nextFiles = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/")
    );
    if (nextFiles.length === 0) {
      return;
    }

    setPhotos((current) => {
      const allowed = nextFiles.slice(0, 10 - current.length);
      return [...current, ...allowed].slice(0, 10);
    });
  }

  function handleRemovePhoto(index) {
    setPhotos((current) => current.filter((_, idx) => idx !== index));
  }

  function handleDragStart(index) {
    setDragIndex(index);
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function handleDropImage(index) {
    if (dragIndex === null || dragIndex === index) return;
    setPhotos((current) => {
      const updated = [...current];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    setDragIndex(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    if (!user?.id) {
      setError("You must be logged in to list an item.");
      navigate("/login");
      return;
    }

    setError("");
    setSubmitting(true);

    const priceCents = Math.round(parseFloat(price || "0") * 100);
    const listingPayload = {
      seller_id: user?.id,
      title: title.trim(),
      description: description.trim(),
      category: category.toLowerCase(),
      status: "active",
      price_cents: priceCents,
      subcategory: null,
      gender: null,
      brand: null,
      size: null,
      condition: null,
      measurements: {},
    };

    if (category === "Clothing") {
      listingPayload.subcategory = subcategory;
      listingPayload.gender = gender;
      listingPayload.brand = brand.trim() || null;
      listingPayload.size = size.trim() || null;
      listingPayload.condition = condition;
      listingPayload.measurements = measurementsForSubcategory.reduce(
        (acc, field) => {
          const value = measurements[field.key];
          if (value !== undefined && value !== "") {
            acc[field.key] = value;
          }
          return acc;
        },
        {}
      );
    } else if (["Vinyl", "CD", "VHS"].includes(category)) {
      listingPayload.condition = condition;
      listingPayload.measurements = {
        artist_title: artistTitle.trim() || null,
        release_year: releaseYear ? Number(releaseYear) : null,
        genre: genre.trim() || null,
        edition_notes: editionNotes.trim() || null,
      };
    }

    try {
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .insert(listingPayload)
        .select("id")
        .single();

      if (listingError) {
        throw listingError;
      }

      const listingId = listingData.id;
      const imagesToInsert = [];

      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        const path = `listings/${listingId}/${index}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(path, photo, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
          error: publicUrlError,
        } = supabase.storage.from("listing-photos").getPublicUrl(path);

        if (publicUrlError) {
          throw publicUrlError;
        }

        imagesToInsert.push({
          listing_id: listingId,
          url: publicUrl,
          position: index,
        });
      }

      const { error: imagesError } = await supabase
        .from("listing_images")
        .insert(imagesToInsert);

      if (imagesError) {
        throw imagesError;
      }

      if (imagesToInsert.length > 0) {
        setEmbeddingStatus("Adding to search index...");
        try {
          const firstImageUrl = imagesToInsert[0].url;
          const blob = await fetch(firstImageUrl).then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to fetch image blob: ${res.status}`);
            }
            return res.blob();
          });
          const embedding = await getImageEmbedding(blob);

          if (embedding !== null) {
            const { error: embeddingUpdateError } = await supabase
              .from("listings")
              .update({ image_embedding: embedding })
              .eq("id", listingId);

            if (embeddingUpdateError) {
              console.warn("Failed to save image embedding:", embeddingUpdateError);
            }
          }
        } catch (embeddingError) {
          console.warn("Failed to generate image embedding:", embeddingError);
        } finally {
          setEmbeddingStatus("");
        }
      }

      navigate(`/listing/${listingId}`);
    } catch (submissionError) {
      setError(submissionError.message || JSON.stringify(submissionError));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-10 px-4">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-[#111111] p-8 shadow-2xl shadow-black/40">
        <h1 className="mb-6 text-3xl font-semibold text-white">List an item for sale</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-5">
            <h2 className="mb-3 text-xl font-semibold text-white">Category</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {categories.map((item) => (
                <label
                  key={item}
                  className={`cursor-pointer rounded-2xl border px-4 py-3 text-sm transition ${
                    category === item
                      ? "border-red-600 bg-red-600/10 text-red-200"
                      : "border-white/10 bg-white/5 text-white/80 hover:border-red-600 hover:text-white"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name="category"
                    value={item}
                    checked={category === item}
                    onChange={() => handleCategoryChange(item)}
                  />
                  {item}
                </label>
              ))}
            </div>
          </section>

          {category === "Clothing" && (
            <section className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">Clothing details</h2>
              <div className="grid gap-6">
                <div>
                  <p className="mb-2 text-sm uppercase tracking-wide text-white/70">Gender</p>
                  <div className="flex flex-wrap gap-3">
                    {clothingGenders.map((item) => (
                      <label
                        key={item}
                        className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                          gender === item
                            ? "border-red-600 bg-red-600/10 text-red-200"
                            : "border-white/10 bg-white/5 text-white/80 hover:border-red-600 hover:text-white"
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name="gender"
                          value={item}
                          checked={gender === item}
                          onChange={() => setGender(item)}
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm uppercase tracking-wide text-white/70">Subcategory</p>
                  <div className="flex flex-wrap gap-3">
                    {clothingSubcategories.map((item) => (
                      <label
                        key={item}
                        className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                          subcategory === item
                            ? "border-red-600 bg-red-600/10 text-red-200"
                            : "border-white/10 bg-white/5 text-white/80 hover:border-red-600 hover:text-white"
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name="subcategory"
                          value={item}
                          checked={subcategory === item}
                          onChange={() => setSubcategory(item)}
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm text-white/80">
                    Size
                    <input
                      value={size}
                      onChange={(event) => setSize(event.target.value)}
                      placeholder="XS, S, M, L, XL or 8, 9, 10"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-[#121212] p-3 text-white outline-none focus:border-red-600"
                    />
                  </label>
                  <label className="block text-sm text-white/80">
                    Brand
                    <input
                      value={brand}
                      onChange={(event) => setBrand(event.target.value)}
                      placeholder="Brand name"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-[#121212] p-3 text-white outline-none focus:border-red-600"
                    />
                  </label>
                </div>
                <label className="block text-sm text-white/80">
                  Condition
                  <select
                    value={condition}
                    onChange={(event) => setCondition(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#121212] p-3 text-white outline-none focus:border-red-600"
                  >
                    {clothingConditions.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#0a0a0a] text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                {measurementsForSubcategory.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {measurementsForSubcategory.map((field) => (
                      <label key={field.key} className="block text-sm text-white/80">
                        {field.label}
                        <input
                          value={measurements[field.key] || ""}
                          onChange={(event) =>
                            setMeasurements((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          placeholder={field.label}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-[#121212] p-3 text-white outline-none focus:border-red-600"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {category !== "Clothing" && category !== "Other" && (
            <section className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">Media details</h2>
              <div className="grid gap-4">
                <label className="block text-sm text-white/80">
                  Artist / Title
                  <input
                    value={artistTitle}
                    onChange={(event) => setArtistTitle(event.target.value)}
                    placeholder="Artist – Title"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#121212] p-3 text-white outline-none focus:border-red-600"
                  />
                </label>
                <label className="block text-sm text-white/80">
                  Release year
                  <input
                    type="number"
                    value={releaseYear}
                    onChange={(event) => setReleaseYear(event.target.value)}
                    placeholder="e.g. 1998"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#121212] p-3 text-white outline-none focus:border-red-600"
                  />
                </label>
                <label className="block text-sm text-white/80">
                  Genre
                  <input
                    value={genre}
                    onChange={(event) => setGenre(event.target.value)}
                    placeholder="Genre"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#121212] p-3 text-white outline-none focus:border-red-600"
                  />
                </label>
                <label className="block text-sm text-white/80">
                  Condition
                  <select
                    value={condition}
                    onChange={(event) => setCondition(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#121212] p-3 text-white outline-none focus:border-red-600"
                  >
                    {mediaConditions.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#0a0a0a] text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-white/80">
                  Edition notes
                  <input
                    value={editionNotes}
                    onChange={(event) => setEditionNotes(event.target.value)}
                    placeholder="Limited edition, repress, sealed, etc."
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#121212] p-3 text-white outline-none focus:border-red-600"
                  />
                </label>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-5">
            <h2 className="mb-4 text-xl font-semibold text-white">Listing details</h2>
            <div className="grid gap-4">
              <label className="block text-sm text-white/80">
                Title <span className="text-red-500">*</span>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Item title"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#121212] p-3 text-white outline-none focus:border-red-600"
                />
              </label>
              <label className="block text-sm text-white/80">
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe what you're selling"
                  rows={5}
                  className="mt-2 w-full rounded-3xl border border-white/10 bg-[#121212] p-3 text-white outline-none focus:border-red-600"
                />
              </label>
              <label className="block text-sm text-white/80">
                Price (USD) <span className="text-red-500">*</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="25.50"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#121212] p-3 text-white outline-none focus:border-red-600"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-5">
            <h2 className="mb-4 text-xl font-semibold text-white">Photos</h2>
            <div
              className={`group relative flex min-h-[180px] w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center transition ${
                isDraggingOver
                  ? "border-red-500 bg-red-500/10"
                  : "border-white/20 bg-white/5 hover:border-red-500"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingOver(false);
                if (event.dataTransfer.files) {
                  handleFiles(event.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  if (event.target.files) {
                    handleFiles(event.target.files);
                    event.target.value = null;
                  }
                }}
              />
              <p className="text-sm text-white/70">
                Drag and drop images here or click to browse
              </p>
              <p className="mt-2 text-xs text-white/50">
                JPEG, PNG, GIF accepted · 1-10 images
              </p>
            </div>
            {photos.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo, index) => (
                  <div
                    key={`${photo.name}-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDropImage(index)}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#121212]"
                  >
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Upload preview ${index + 1}`}
                      className="h-48 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute right-3 top-3 rounded-full bg-[#0a0a0a]/90 px-2 py-1 text-sm font-semibold text-white transition hover:bg-red-600"
                    >
                      ✕
                    </button>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white/90">
                      <p className="text-sm">Image {index + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <div className="rounded-3xl border border-red-600/40 bg-red-600/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}
          {embeddingStatus && (
            <div className="text-sm text-white/70">{embeddingStatus}</div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-white/70">
              {photos.length}/10 images selected
            </div>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="inline-flex items-center justify-center rounded-3xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </span>
              ) : (
                "Create listing"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
