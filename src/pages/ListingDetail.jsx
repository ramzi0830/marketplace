import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Heart } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext.jsx";
import ListingCard from "../components/ListingCard.jsx";

function ListingDetail() {
  const { id } = useParams();
  const listingId = id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [cartState, setCartState] = useState("default");
  const [actionError, setActionError] = useState("");

  const sellerId = listing?.seller_id;
  const isSeller = user?.id && sellerId === user.id;
  const images = listing?.listing_images || [];

  const getImageUrl = (image) =>
    image?.image_url || image?.url || image?.src || "/placeholder.jpg";

  const mainImageUrl =
    images.length > 0
      ? getImageUrl(images[selectedImageIndex])
      : getImageUrl({ image_url: listing?.image_url });

  useEffect(() => {
    let mounted = true;

    async function fetchListing() {
      setLoading(true);
      setNotFound(false);

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("*, listing_images(*)")
        .eq("id", id)
        .single();

      if (!mounted) {
        return;
      }

      if (listingError || !listingData) {
        setListing(null);
        setSellerProfile(null);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setListing(listingData);
      setSelectedImageIndex(0);

      if (listingData.seller_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", listingData.seller_id)
          .maybeSingle();

        if (mounted) {
          setSellerProfile(profileData || null);
        }
      } else {
        setSellerProfile(null);
      }

      if (listingData.category) {
        const { data: similarData } = await supabase
          .from("listings")
          .select("*, listing_images(*)")
          .eq("category", listingData.category)
          .eq("status", "active")
          .neq("id", id)
          .limit(8);

        if (mounted && similarData) {
          setSimilar(similarData);
        }
      }

      setLoading(false);
    }

    fetchListing();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    async function fetchLikeStatus() {
      if (!user?.id) {
        if (mounted) {
          setLiked(false);
        }
        return;
      }

      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("listing_id", listingId)
        .single();

      if (!mounted) return;
      setLiked(!!data);
    }

    fetchLikeStatus();

    return () => {
      mounted = false;
    };
  }, [user, listingId]);

  const handleToggleLike = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!listing || isSeller) {
      return;
    }

    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", id);
      setLiked(false);
      return;
    }

    const { error } = await supabase.from("likes").insert([
      {
        user_id: user.id,
        listing_id: id,
      },
    ]);

    if (!error) {
      setLiked(true);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!listing || isSeller) {
      return;
    }

    setActionError("");

    const { error } = await supabase.from("cart_items").upsert(
      [
        {
          user_id: user.id,
          listing_id: listing.id,
        },
      ],
      { onConflict: ["user_id", "listing_id"] }
    );

    if (error) {
      if (error.details?.includes("duplicate") || error.code === "23505") {
        setCartState("added");
      } else {
        setActionError("Could not add to cart. Please try again.");
        return;
      }
    } else {
      setCartState("added");
    }

    window.setTimeout(() => setCartState("default"), 1800);
  };

  const handleBuyNow = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    navigate("/cart");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4 py-8">
        <div className="text-lg">Loading listing…</div>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4 py-8">
        <div className="text-lg">Listing not found</div>
      </div>
    );
  }

  const title = listing.title || "Untitled listing";
  const brand = listing.brand;
  const size = listing.size;
  const condition = listing.condition;
  const price = (listing.price_cents / 100).toFixed(2);
  const description = listing.description;
  const category = listing.category || "";
  const seller = sellerProfile || {};
  const sellerName = seller.username || seller.email || "Anonymous seller";
  const avatarUrl = seller.avatar_url || seller.avatar;
  const measurements = listing.measurements;
  const releaseYear = listing.release_year;
  const genre = listing.genre;
  const editionNotes = listing.edition_notes;

  const detailPairs = [];
  if (brand) detailPairs.push({ label: "Brand", value: brand });
  if (size) detailPairs.push({ label: "Size", value: size });
  if (condition) detailPairs.push({ label: "Condition", value: condition });

  const clothingMeasurements = measurements && typeof measurements === "object" ? measurements : null;
  const isClothing = category.toLowerCase() === "clothing";
  const isMedia = ["vinyl", "cd", "jewelry"].includes(category.toLowerCase());

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <section className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-xl">
              <img
                src={mainImageUrl}
                alt={title}
                className="h-[420px] w-full object-cover sm:h-[520px]"
              />
            </div>

            {images.length > 1 ? (
              <div className="grid grid-cols-4 gap-3">
                {images.map((image, index) => {
                  const thumbUrl = getImageUrl(image);
                  const active = index === selectedImageIndex;
                  return (
                    <button
                      key={image.id || thumbUrl + index}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`overflow-hidden rounded-2xl border transition ${
                        active
                          ? "border-red-600 bg-red-600/10"
                          : "border-white/10 bg-white/5 hover:border-red-600/40"
                      }`}
                    >
                      <img
                        src={thumbUrl}
                        alt={`${title} thumbnail ${index + 1}`}
                        className="h-24 w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section className="space-y-6">
            <div className="space-y-5 rounded-3xl border border-white/10 bg-[#111111]/80 p-6 shadow-xl">
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold text-white">{title}</h1>
                <p className="text-red-500 text-3xl font-bold">${price}</p>
              </div>

              <div className="space-y-3">
                {detailPairs.map((detail) => (
                  <div key={detail.label} className="flex flex-wrap gap-2 text-sm text-slate-300">
                    <span className="font-semibold text-white">{detail.label}:</span>
                    <span>{detail.value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-slate-300">
                <h2 className="text-lg font-semibold text-white">Description</h2>
                <p className="whitespace-pre-line leading-relaxed">{description || "No description provided."}</p>
              </div>

              {isClothing && clothingMeasurements ? (
                <div className="rounded-3xl bg-white/5 p-4 text-slate-200">
                  <h3 className="text-lg font-semibold text-white">Measurements</h3>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                    {Object.entries(clothingMeasurements).map(([key, value]) => (
                      <div key={key} className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-3">
                        <span className="block text-slate-400">{key.replace(/_/g, " ")}</span>
                        <span className="font-semibold text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {isMedia ? (
                <div className="rounded-3xl bg-white/5 p-4 text-slate-200">
                  <h3 className="text-lg font-semibold text-white">Release details</h3>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    {releaseYear ? (
                      <div>
                        <span className="font-semibold text-white">Year:</span> {releaseYear}
                      </div>
                    ) : null}
                    {genre ? (
                      <div>
                        <span className="font-semibold text-white">Genre:</span> {genre}
                      </div>
                    ) : null}
                    {editionNotes ? (
                      <div>
                        <span className="font-semibold text-white">Edition notes:</span> {editionNotes}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="rounded-3xl border border-white/10 bg-[#111111]/90 p-6">
                <div className="flex items-center gap-4">
                  {sellerProfile ? (
                    <Link
                      to={`/profile/${sellerId}`}
                      className="flex items-center gap-3 text-white transition hover:text-red-500"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-xl font-semibold text-white">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={sellerName}
                            className="h-14 w-14 rounded-full object-cover"
                          />
                        ) : (
                          <span>{sellerName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Seller</p>
                        <p className="font-semibold">{sellerName}</p>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 text-white">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-xl font-semibold text-white">
                        <span>{sellerName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Seller</p>
                        <p className="font-semibold">{sellerName}</p>
                      </div>
                    </div>
                  )}
                </div>

                {!isSeller ? (
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={handleToggleLike}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-red-600 hover:text-red-500"
                    >
                      <Heart
                        size={18}
                        className=""
                        fill={liked ? "#e10600" : "none"}
                        stroke={liked ? "#e10600" : "currentColor"}
                      />
                      {liked ? "Liked" : "Like"}
                    </button>

                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      {cartState === "added" ? "Added!" : "Add to cart"}
                    </button>

                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-red-600 hover:text-red-500"
                    >
                      Buy now
                    </button>
                  </div>
                ) : null}

                {actionError ? (
                  <p className="mt-3 text-sm text-red-400">{actionError}</p>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        {similar.length > 0 ? (
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">Similar items</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {similar.map((item) => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default ListingDetail;
